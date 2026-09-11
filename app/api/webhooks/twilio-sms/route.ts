/**
 * POST /api/webhooks/twilio-sms
 * קולט SMS שנכנסים למספר הטוויליו 053-719-5247.
 *
 * למה זה קיים: אוהד מחייג ללידים מה-CRM מהמספר הזה. מי שפספס את השיחה
 * כותב חזרה ב-SMS, ועד היום ההודעות האלה נבלעו בטוויליו בלי שאף אחד
 * ראה אותן. נמצאו כך שלושה לידים שחיכו שבועות, אחד מהם ניסה שלוש פעמים.
 *
 * כל הודעה: נשמרת בשיחה של הליד ב-CRM (מסומנת SMS), אוהד מקבל התראה
 * מיידית, ואם השולח ליד, רובוט הפולואפ נעצר, בדיוק כמו תשובה בוואטסאפ.
 */
import { NextRequest, NextResponse, after } from 'next/server'
import crypto from 'crypto'
import { createServiceClient } from '@/lib/supabase/service'
import { sendWhatsApp } from '@/lib/whatsapp'
import { normalizePhone } from '@/lib/base44'
import { isOptOut } from '@/lib/followup-templates'

const OHAD_WA = '972542274497' // hard-coded, אסור דרך env var למניעת דליפה
const PUBLIC_URL =
  (process.env.NEXT_PUBLIC_PROD_URL || 'https://tevet-landing.vercel.app') + '/api/webhooks/twilio-sms'

type LeadTable = 'leads' | 'leads_talush'

/** תשובה ריקה, כדי שטוויליו לא ישלח מענה אוטומטי לשולח */
const EMPTY_TWIML = () =>
  new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
    status: 200,
    headers: { 'Content-Type': 'text/xml' },
  })

/**
 * אימות שהבקשה באמת הגיעה מטוויליו.
 * בלי זה כל אחד שמכיר את הכתובת יכול להזריק "הודעות" לכרטיסי הלידים.
 * טוויליו חותמת HMAC-SHA1 על הכתובת המלאה ועל כל הפרמטרים ממוינים.
 */
function isValidTwilioSignature(signature: string | null, params: Record<string, string>): boolean {
  const token = process.env.TWILIO_AUTH_TOKEN
  if (!token || !signature) return false
  const data = Object.keys(params).sort().reduce((acc, k) => acc + k + params[k], PUBLIC_URL)
  const expected = crypto.createHmac('sha1', token).update(Buffer.from(data, 'utf-8')).digest('base64')
  const a = Buffer.from(expected)
  const b = Buffer.from(signature)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

async function findLead(supabase: ReturnType<typeof createServiceClient>, phone972: string) {
  const local = '0' + phone972.slice(3)
  for (const table of ['leads', 'leads_talush'] as LeadTable[]) {
    const { data } = await supabase
      .from(table)
      .select('id, full_name, phone')
      .or(`phone.eq.${phone972},phone.eq.${local}`)
      .maybeSingle()
    if (data) return { ...data, table }
  }
  return null
}

export async function POST(req: NextRequest) {
  const form = await req.formData()
  const params: Record<string, string> = {}
  form.forEach((v, k) => { params[k] = String(v) })

  if (!process.env.TWILIO_AUTH_TOKEN) {
    console.error('[twilio-sms] TWILIO_AUTH_TOKEN is not set, refusing unsigned traffic')
    return new NextResponse('misconfigured', { status: 500 })
  }
  if (!isValidTwilioSignature(req.headers.get('x-twilio-signature'), params)) {
    console.warn('[twilio-sms] Rejected request with invalid signature')
    return new NextResponse('forbidden', { status: 403 })
  }

  const senderPhone = normalizePhone((params.From || '').replace(/\D/g, ''))
  const body = (params.Body || '').trim()
  if (!senderPhone || !body) return EMPTY_TWIML()

  const supabase = createServiceClient()

  try {
    await supabase.from('whatsapp_messages').insert({
      phone: senderPhone,
      direction: 'נכנסת',
      body: `📱 SMS: ${body}`,
      provider_message_id: params.MessageSid || null,
      is_read: false,
    })
  } catch (e) {
    console.error('[twilio-sms] Failed to store message:', e)
  }

  const lead = await findLead(supabase, senderPhone)

  if (lead) {
    const update: Record<string, boolean> = { followup_stopped: true }
    if (isOptOut(body)) update.followup_opted_out = true
    await supabase.from(lead.table).update(update).eq('id', lead.id)
  }

  // ההתראה אחרי התשובה לטוויליו, כדי שעיכוב בוואטסאפ לא יגרום לו לנסות שוב
  after(async () => {
    const who = lead?.full_name ? `${lead.full_name} (${senderPhone})` : senderPhone
    await sendWhatsApp(OHAD_WA, [
      '📱 SMS חדש ל-053',
      '',
      `מאת: ${who}`,
      body,
      '',
      lead ? 'נשמר בכרטיס הליד.' : 'המספר לא נמצא כליד במערכת.',
    ].join('\n'))
  })

  return EMPTY_TWIML()
}
