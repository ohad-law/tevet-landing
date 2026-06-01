import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { stampPdf, SignatureField, SignatureData } from '@/lib/signatures/stamp-pdf'
import { notifyAttorneyWhatsApp, notifyAttorneyEmail } from '@/lib/signatures/notify'

export const maxDuration = 120

type Params = { params: Promise<{ token: string }> }

/* ── GET: שליפת מסמך לחתימה (ציבורי) ── */
export async function GET(_req: NextRequest, { params }: Params) {
  const { token } = await params
  const supabase  = createServiceClient()

  const { data: req, error } = await supabase
    .from('signature_requests')
    .select('id, document_name, original_url, signature_fields, status, expires_at, clients(full_name)')
    .eq('token', token)
    .single()

  if (error || !req) return NextResponse.json({ error: 'קישור לא תקף' }, { status: 404 })

  if (req.status === 'signed')  return NextResponse.json({ error: 'מסמך זה כבר נחתם' }, { status: 410 })
  if (req.status === 'expired') return NextResponse.json({ error: 'הקישור פג תוקף' }, { status: 410 })
  if (new Date(req.expires_at) < new Date()) {
    await supabase.from('signature_requests').update({ status: 'expired' }).eq('token', token)
    return NextResponse.json({ error: 'הקישור פג תוקף — פנה למשרד' }, { status: 410 })
  }

  // הורד PDF מ-Storage כ-base64
  const urlPath  = req.original_url.split('/signed-documents/')[1]
  const { data: fileData, error: dlErr } = await supabase.storage
    .from('signed-documents')
    .download(urlPath)

  if (dlErr || !fileData) return NextResponse.json({ error: 'לא ניתן לטעון את המסמך' }, { status: 500 })

  const pdfBase64 = Buffer.from(await fileData.arrayBuffer()).toString('base64')

  const client = req.clients as unknown as { full_name: string } | null

  return NextResponse.json({
    documentName:    req.document_name,
    clientName:      client?.full_name ?? '',
    signatureFields: req.signature_fields,
    pdfBase64,
  })
}

/* ── POST: קבלת חתימה → הטבעה → שמירה → התראה ── */
export async function POST(request: NextRequest, { params }: Params) {
  const { token } = await params
  const supabase  = createServiceClient()

  const body = await request.json() as {
    signerName:           string
    signatureImageBase64: string  // PNG base64
    idNumber?:            string
  }

  if (!body.signerName?.trim() || !body.signatureImageBase64) {
    return NextResponse.json({ error: 'חסרים פרטי חתימה' }, { status: 400 })
  }

  // שליפת הבקשה
  const { data: sigReq, error } = await supabase
    .from('signature_requests')
    .select('id, case_id, client_id, document_name, original_url, signature_fields, status, expires_at')
    .eq('token', token)
    .single()

  if (error || !sigReq) return NextResponse.json({ error: 'קישור לא תקף' }, { status: 404 })
  if (sigReq.status !== 'pending') return NextResponse.json({ error: 'מסמך זה כבר טופל' }, { status: 410 })
  if (new Date(sigReq.expires_at) < new Date()) return NextResponse.json({ error: 'הקישור פג תוקף' }, { status: 410 })

  // שליפת IP + device
  const ip     = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'לא ידוע'
  const device = request.headers.get('user-agent')?.slice(0, 120) ?? 'לא ידוע'

  // הורד PDF מקורי
  const urlPath = sigReq.original_url.split('/signed-documents/')[1]
  console.log('[sign POST] downloading:', urlPath)
  const { data: fileData, error: dlErr } = await supabase.storage.from('signed-documents').download(urlPath)
  if (!fileData) {
    console.error('[sign POST] download failed:', dlErr)
    return NextResponse.json({ error: `לא ניתן לטעון מסמך: ${dlErr?.message ?? 'לא ידוע'}` }, { status: 500 })
  }

  const pdfBytes     = new Uint8Array(await fileData.arrayBuffer())
  const signatureData: SignatureData = {
    signerName:           body.signerName,
    signerIp:             ip,
    signerDevice:         device,
    signedAt:             new Date(),
    fields:               sigReq.signature_fields as SignatureField[],
    signatureImageBase64: body.signatureImageBase64,
    idNumber:             body.idNumber,
  }

  // הטבע חתימה
  console.log('[sign POST] stamping PDF...')
  let stampedBytes: Uint8Array
  try {
    stampedBytes = await stampPdf(pdfBytes, signatureData)
  } catch (stampErr) {
    console.error('[sign POST] stamp failed:', stampErr)
    return NextResponse.json({ error: `שגיאה בהטבעת חתימה: ${stampErr instanceof Error ? stampErr.message : 'לא ידוע'}` }, { status: 500 })
  }

  // שמור PDF חתום
  const signedPath  = `signed/${sigReq.case_id}/${token}.pdf`
  console.log('[sign POST] uploading signed PDF...')
  const { error: upErr } = await supabase.storage
    .from('signed-documents')
    .upload(signedPath, stampedBytes, { contentType: 'application/pdf', upsert: true })

  if (upErr) {
    console.error('[sign POST] upload failed:', upErr)
    return NextResponse.json({ error: `שגיאה בשמירת מסמך: ${upErr.message}` }, { status: 500 })
  }

  const { data: { publicUrl: signedUrl } } = supabase.storage
    .from('signed-documents')
    .getPublicUrl(signedPath)

  // עדכון DB
  await supabase.from('signature_requests').update({
    status:      'signed',
    signed_url:  signedUrl,
    signer_name: body.signerName,
    signer_ip:   ip,
    signer_device: device,
    signed_at:   new Date().toISOString(),
  }).eq('token', token)

  // עדכון טיימליין התיק
  const { data: client } = await supabase
    .from('clients').select('full_name, phone, email').eq('id', sigReq.client_id).single()

  await supabase.from('case_timeline').insert({
    case_id:     sigReq.case_id,
    action_type: 'חתימה דיגיטלית',
    description: `✅ ${body.signerName} חתם על ${sigReq.document_name}`,
  }).then(() => null, () => null)

  // התראות לאוהד
  await Promise.all([
    notifyAttorneyWhatsApp(body.signerName, sigReq.document_name, sigReq.case_id),
    notifyAttorneyEmail(body.signerName, sigReq.document_name, sigReq.case_id, signedUrl),
  ]).catch(() => null)

  return NextResponse.json({ success: true, signedUrl })
}
