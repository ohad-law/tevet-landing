import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { notifyClientWhatsApp, notifyClientEmail } from '@/lib/signatures/notify'
import crypto from 'crypto'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

/* ── GET: רשימת בקשות חתימה ── */
export async function GET(req: NextRequest) {
  const supabase = createServiceClient()
  const status   = req.nextUrl.searchParams.get('status') // pending | signed | all

  let query = supabase
    .from('signature_requests')
    .select(`
      id, document_name, status, created_at, signed_at, expires_at, token,
      case_id, client_id,
      cases(case_name, case_number),
      clients(full_name, phone, email)
    `)
    .order('created_at', { ascending: false })

  if (status && status !== 'all') query = query.eq('status', status)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

/* ── POST: יצירת בקשת חתימה ── */
export async function POST(req: NextRequest) {
  try {
    const fd             = await req.formData()
    const file           = fd.get('file')           as File   | null
    const caseId         = fd.get('caseId')         as string | null
    const clientId       = fd.get('clientId')       as string | null
    const documentName   = fd.get('documentName')   as string | null
    const sendWhatsApp   = fd.get('sendWhatsApp') === 'true'
    const sendEmail      = fd.get('sendEmail')    === 'true'
    // phone/email from form override whatever is in the DB
    const overridePhone  = (fd.get('phone')  as string | null)?.trim() || null
    const overrideEmail  = (fd.get('email')  as string | null)?.trim() || null
    const signatureFields: object[] = JSON.parse((fd.get('signatureFields') as string) || '[]')

    if (!caseId || !clientId || !documentName || !file) {
      return NextResponse.json({ error: 'חסרים פרטים חובה' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // שליפת פרטי לקוח (רק לשם, phone/email מגיעים מהטופס)
    const { data: client } = await supabase
      .from('clients')
      .select('full_name, phone, email')
      .eq('id', clientId)
      .single()

    if (!client) return NextResponse.json({ error: 'לקוח לא נמצא' }, { status: 404 })

    // אם הוזנו פרטים חדשים, עדכן בDB
    if (overridePhone && overridePhone !== client.phone) {
      await supabase.from('clients').update({ phone: overridePhone }).eq('id', clientId)
      client.phone = overridePhone
    }
    if (overrideEmail && overrideEmail !== client.email) {
      await supabase.from('clients').update({ email: overrideEmail }).eq('id', clientId)
      client.email = overrideEmail
    }

    // יצירת טוקן + העלאת PDF מקורי
    const token     = crypto.randomUUID()
    const pdfBuffer = Buffer.from(await file.arrayBuffer())
    const storagePath = `originals/${caseId}/${token}.pdf`

    const { error: uploadErr } = await supabase.storage
      .from('signed-documents')
      .upload(storagePath, pdfBuffer, { contentType: 'application/pdf', upsert: false })

    if (uploadErr) return NextResponse.json({ error: `שגיאת העלאה: ${uploadErr.message}` }, { status: 500 })

    const { data: { publicUrl } } = supabase.storage
      .from('signed-documents')
      .getPublicUrl(storagePath)

    // הוספה לDB
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    const { data: sigReq, error: dbErr } = await supabase
      .from('signature_requests')
      .insert({
        case_id:          caseId,
        client_id:        clientId,
        document_name:    documentName,
        original_url:     publicUrl,
        token,
        status:           'pending',
        signature_fields: signatureFields,
        expires_at:       expiresAt,
      })
      .select('id')
      .single()

    if (dbErr || !sigReq) return NextResponse.json({ error: 'שגיאת DB' }, { status: 500 })

    // הוספת אירוע לטיימליין התיק
    await supabase.from('case_timeline').insert({
      case_id:     caseId,
      action_type: 'חתימה דיגיטלית',
      description: `📨 נשלח לחתימה: ${documentName}`,
    }).then(() => null, () => null)

    // שליחת הודעות ללקוח
    const errors: string[] = []
    if (sendWhatsApp && client.phone) {
      await notifyClientWhatsApp(client.phone, client.full_name, documentName, token).catch(e => errors.push(`WhatsApp: ${e.message}`))
    }
    if (sendEmail && client.email) {
      await notifyClientEmail(client.email, client.full_name, documentName, token).catch(e => errors.push(`Email: ${e.message}`))
    }

    return NextResponse.json({ success: true, id: sigReq.id, token, warnings: errors })
  } catch (err) {
    console.error('[signatures] POST error:', err)
    return NextResponse.json({ error: 'שגיאה בשרת' }, { status: 500 })
  }
}
