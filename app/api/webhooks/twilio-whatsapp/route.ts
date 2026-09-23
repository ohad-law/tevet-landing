/**
 * POST /api/webhooks/twilio-whatsapp
 * קולט את הוואטסאפ הנכנס של המספר הרשמי 053-964-9422, שרץ דרך טוויליו.
 *
 * למה צינור נפרד ולא whatsapp-cloud: טוויליו שולחת בפורמט משלה
 * (form-encoded, כמו ה-SMS) ולא בפורמט של מטא. אותו נתיב לא יכול
 * לשרת את שניהם.
 *
 * כל הודעה נשמרת בשיחה של הליד ב-CRM, אוהד מקבל התראה מיידית,
 * ורובוט הפולואפ נעצר, בדיוק כמו בצינור הקיים של גרין אפיי.
 * תלושים שנשלחים כתמונה יורדים ונשמרים באחסון הפרטי ומצטרפים לכרטיס.
 */
import { NextRequest, NextResponse, after } from 'next/server'
import crypto from 'crypto'
import { createServiceClient } from '@/lib/supabase/service'
import { sendWhatsApp } from '@/lib/whatsapp'
import { normalizePhone } from '@/lib/base44'
import { isOptOut } from '@/lib/followup-templates'
import { attachToLead, storeLeadFile, MAX_FILE_BYTES, type LeadTable } from '@/lib/lead-files'

const OHAD_WA = '972542274497' // hard-coded, אסור דרך env var למניעת דליפה
const PUBLIC_URL =
  (process.env.NEXT_PUBLIC_PROD_URL || 'https://tevet-landing.vercel.app') +
  '/api/webhooks/twilio-whatsapp'

type Supa = ReturnType<typeof createServiceClient>

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

/**
 * מחפש ליד לפי טלפון בשתי הטבלאות (גם בפורמט 972 וגם 05).
 *
 * 🚨 אסור להשתמש כאן ב-maybeSingle. הוא נכשל כשיותר משורה אחת תואמת,
 * ובמערכת יש לידים כפולים עם אותו טלפון (30 מתוך 426, אומת 15/09/2026).
 * הכשל שקט: הליד נראה "לא מוכר", הבוט לא נעצר, וההתראה מטעה.
 * לוקחים את הליד החדש ביותר, כי הוא הרלוונטי לשיחה שמתנהלת עכשיו.
 */
async function findLead(supabase: Supa, phone972: string) {
  const local = '0' + phone972.slice(3)
  for (const table of ['leads', 'leads_talush'] as LeadTable[]) {
    const { data } = await supabase
      .from(table)
      .select('id, full_name, phone, uploaded_files')
      .or(`phone.eq.${phone972},phone.eq.${local}`)
      .order('created_at', { ascending: false })
      .limit(1)
    if (data && data.length > 0) return { ...data[0], table }
  }
  return null
}

/** טוויליו לא שולחת שם קובץ, ולכן גוזרים סיומת מסוג התוכן */
function fileNameFor(mime: string, index: number): string {
  const ext = (mime.split('/')[1] || 'bin').split(';')[0].replace(/[^a-z0-9]/gi, '').slice(0, 8)
  return `media${index}.${ext || 'bin'}`
}

/**
 * מוריד קובץ מטוויליו. בניגוד לגרין אפיי, הקישורים של טוויליו
 * מוגנים ודורשים את פרטי החשבון, אחרת חוזר 401.
 *
 * מזהה החשבון נגזר מתוך הכתובת עצמה, שנראית כך:
 * https://api.twilio.com/2010-04-01/Accounts/ACxxxx/Messages/MMxxxx/Media/MExxxx
 * כך לא נדרש משתנה סביבה נוסף שאם יישכח יפיל שמירת תלושים בשקט.
 */
async function downloadTwilioMedia(url: string): Promise<Buffer | null> {
  const sid = (url.match(/\/Accounts\/(AC[0-9a-f]{32})\//i) || [])[1] || process.env.TWILIO_ACCOUNT_SID
  const token = process.env.TWILIO_AUTH_TOKEN
  if (!sid || !token) {
    console.error('[twilio-wa] לא נמצאו פרטי חשבון להורדת הקובץ')
    return null
  }
  try {
    const auth = Buffer.from(`${sid}:${token}`).toString('base64')
    const res = await fetch(url, {
      headers: { Authorization: `Basic ${auth}` },
      signal: AbortSignal.timeout(20000),
    })
    if (!res.ok) {
      console.error('[twilio-wa] הורדת הקובץ נכשלה:', res.status)
      return null
    }
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.byteLength > MAX_FILE_BYTES) {
      console.warn('[twilio-wa] קובץ גדול מדי, לא נשמר:', buf.byteLength)
      return null
    }
    return buf
  } catch (e) {
    console.error('[twilio-wa] הורדת הקובץ נכשלה:', e)
    return null
  }
}

export async function POST(req: NextRequest) {
  const form = await req.formData()
  const params: Record<string, string> = {}
  form.forEach((v, k) => {
    params[k] = String(v)
  })

  if (!process.env.TWILIO_AUTH_TOKEN) {
    console.error('[twilio-wa] TWILIO_AUTH_TOKEN is not set, refusing unsigned traffic')
    return new NextResponse('misconfigured', { status: 500 })
  }
  if (!isValidTwilioSignature(req.headers.get('x-twilio-signature'), params)) {
    console.warn('[twilio-wa] Rejected request with invalid signature')
    return new NextResponse('forbidden', { status: 403 })
  }

  // From מגיע כ-"whatsapp:+972..." ולכן מנקים את הקידומת
  const senderPhone = normalizePhone((params.From || '').replace(/\D/g, ''))
  if (!senderPhone) return EMPTY_TWIML()

  // לחיצה על כפתור מהירה מגיעה ב-ButtonText, והגוף עצמו ריק
  const body = (params.Body || params.ButtonText || '').trim()
  const mediaCount = Number(params.NumMedia || 0)
  if (!body && mediaCount === 0) return EMPTY_TWIML()

  const supabase = createServiceClient()
  const lead = await findLead(supabase, senderPhone)

  // הקבצים נשמרים תחת מזהה הליד, כדי שיישבו עם התלושים מדף הנחיתה
  const folder = lead ? String(lead.id) : `unknown/${senderPhone}`
  const savedFiles: string[] = []
  let uploadedFiles = lead?.uploaded_files

  for (let i = 0; i < mediaCount; i++) {
    const url = params[`MediaUrl${i}`]
    const mime = params[`MediaContentType${i}`] || 'application/octet-stream'
    if (!url) continue

    const buf = await downloadTwilioMedia(url)
    if (!buf) continue

    const stored = await storeLeadFile(supabase, folder, buf, fileNameFor(mime, i), mime, '[twilio-wa]')
    if (!stored) continue

    savedFiles.push(stored.path)
    if (lead) {
      await attachToLead(supabase, lead.table, String(lead.id), uploadedFiles, stored)
      // מעדכנים מקומית, אחרת קובץ שני באותה הודעה ידרוס את הראשון
      uploadedFiles = [
        ...(Array.isArray(uploadedFiles) ? uploadedFiles : []),
        { path: stored.path, url: stored.url, source: 'וואטסאפ' },
      ]
    }
  }

  const stored = savedFiles.length > 0 ? ` [${savedFiles.length} קבצים]` : ''
  try {
    await supabase.from('whatsapp_messages').insert({
      phone: senderPhone,
      direction: 'נכנסת',
      body: (body || '[קובץ]') + stored,
      provider_message_id: params.MessageSid || null,
      is_read: false,
    })
  } catch (e) {
    console.error('[twilio-wa] Failed to store message:', e)
  }

  if (lead) {
    const update: Record<string, boolean> = { followup_stopped: true }
    if (isOptOut(body)) update.followup_opted_out = true
    await supabase.from(lead.table).update(update).eq('id', lead.id)
  }

  // ההתראה אחרי התשובה לטוויליו, כדי שעיכוב בוואטסאפ לא יגרום לו לנסות שוב
  after(async () => {
    const who = lead?.full_name ? `${lead.full_name} (${senderPhone})` : senderPhone
    await sendWhatsApp(
      OHAD_WA,
      [
        '💬 וואטסאפ חדש למספר הרשמי',
        '',
        `מאת: ${who}`,
        body || '[קובץ]',
        savedFiles.length > 0 ? `נשמרו ${savedFiles.length} קבצים.` : '',
        '',
        lead ? 'נשמר בכרטיס הליד.' : 'המספר לא נמצא כליד במערכת.',
      ]
        .filter(Boolean)
        .join('\n')
    )
  })

  return EMPTY_TWIML()
}
