/**
 * Webhook של WhatsApp Cloud API הרשמי של מטא.
 *
 * זהו המחליף העתידי של /api/webhooks/whatsapp-incoming שרץ על גרין אפיי.
 * שני הצינורות חיים במקביל בכוונה: גרין אפיי ממשיך לשרת את 051 עד
 * שהחיבור הרשמי מוכח, ואז מוחקים אותו ואת הקובץ הזה נשאיר.
 *
 * GET  = לחיצת היד של מטא לאימות הכתובת.
 * POST = הודעות נכנסות ועדכוני סטטוס.
 */
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createServiceClient } from '@/lib/supabase/service'
import { normalizePhone } from '@/lib/base44'
import { isOptOut } from '@/lib/followup-templates'

const OHAD_WA = '972542274497' // hard-coded, אסור דרך env var למניעת דליפה

type LeadTable = 'leads' | 'leads_talush'

/**
 * אימות הכתובת מול מטא.
 * מטא קוראת פעם אחת עם טוקן, ומצפה לקבל בחזרה את ה-challenge כטקסט נקי.
 * כל תשובה אחרת, כולל JSON, נחשבת כישלון.
 */
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams
  const mode = params.get('hub.mode')
  const token = params.get('hub.verify_token')
  const challenge = params.get('hub.challenge')

  const expected = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN
  if (!expected) {
    console.error('[wa-cloud] WHATSAPP_WEBHOOK_VERIFY_TOKEN is not set')
    return new NextResponse('misconfigured', { status: 500 })
  }

  if (mode === 'subscribe' && token === expected && challenge) {
    console.log('[wa-cloud] Webhook verified by Meta')
    return new NextResponse(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    })
  }

  console.warn('[wa-cloud] Verification failed. mode=%s', mode)
  return new NextResponse('forbidden', { status: 403 })
}

/**
 * מחפש ליד לפי טלפון בשתי הטבלאות (גם בפורמט 972 וגם 05).
 *
 * 🚨 אסור להשתמש כאן ב-maybeSingle. הוא נכשל כשיותר משורה אחת תואמת,
 * ובמערכת יש לידים כפולים עם אותו טלפון (30 מתוך 426, אומת 15/09/2026).
 * הכשל שקט: הליד נראה "לא מוכר", הבוט לא נעצר, וההתראה מטעה.
 * לוקחים את הליד החדש ביותר, כי הוא הרלוונטי לשיחה שמתנהלת עכשיו.
 */
async function findLead(
  supabase: ReturnType<typeof createServiceClient>,
  phone972: string
) {
  const local = '0' + phone972.slice(3)
  for (const table of ['leads', 'leads_talush'] as LeadTable[]) {
    const { data } = await supabase
      .from(table)
      .select('id, full_name, phone')
      .or(`phone.eq.${phone972},phone.eq.${local}`)
      .order('created_at', { ascending: false })
      .limit(1)
    if (data && data.length > 0) return { ...data[0], table }
  }
  return null
}

/** טקסט קריא מכל סוג הודעה שמטא שולחת */
function extractText(msg: Record<string, unknown>): string {
  const type = msg.type as string
  if (type === 'text') {
    return ((msg.text as Record<string, string>)?.body) || ''
  }
  // תמונה, מסמך, אודיו וכו'. הכיתוב אם יש, אחרת סימון גנרי כמו בצינור הישן.
  const withCaption = msg[type] as Record<string, string> | undefined
  return withCaption?.caption || '[הודעה שאינה טקסט]'
}

/**
 * אימות שההודעה באמת נשלחה ממטא.
 * מטא חותמת כל webhook ב-HMAC-SHA256 עם הסוד של האפליקציה, על הגוף
 * הגולמי בדיוק כפי שנשלח. בלי זה כל מי שמכיר את הכתובת יכול להזריק
 * "הודעות" לכרטיסי הלידים. לכן נכשלים סגור: בלי סוד מוגדר, דוחים הכל.
 */
function isValidMetaSignature(raw: string, header: string | null): boolean {
  const secret = process.env.WHATSAPP_APP_SECRET
  if (!secret || !header?.startsWith('sha256=')) return false
  const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(raw, 'utf8').digest('hex')
  const a = Buffer.from(expected)
  const b = Buffer.from(header)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

export async function POST(req: NextRequest) {
  // הגוף הגולמי נקרא לפני הפענוח, כי החתימה מחושבת עליו בדיוק
  const raw = await req.text()

  if (!process.env.WHATSAPP_APP_SECRET) {
    console.error('[wa-cloud] WHATSAPP_APP_SECRET is not set, refusing unsigned traffic')
    return new NextResponse('misconfigured', { status: 500 })
  }
  if (!isValidMetaSignature(raw, req.headers.get('x-hub-signature-256'))) {
    console.warn('[wa-cloud] Rejected request with invalid signature')
    return new NextResponse('forbidden', { status: 403 })
  }

  let body: Record<string, unknown>
  try {
    body = JSON.parse(raw)
  } catch {
    return NextResponse.json({ ok: true }) // מטא מצפה תמיד ל-200
  }

  try {
    const entries = (body.entry as Record<string, unknown>[]) || []
    for (const entry of entries) {
      const changes = (entry.changes as Record<string, unknown>[]) || []
      for (const change of changes) {
        const value = (change.value as Record<string, unknown>) || {}
        const messages = (value.messages as Record<string, unknown>[]) || []

        for (const msg of messages) {
          const senderPhone = normalizePhone(String(msg.from || ''))
          if (!senderPhone) continue

          // אל תגיב לעצמך
          if (senderPhone === normalizePhone(OHAD_WA)) continue

          const msgText = extractText(msg)
          const supabase = createServiceClient()

          // נשמר תמיד, גם ממספר שעוד אינו ליד. טריגר בבסיס הנתונים
          // משייך לפי טלפון כשהליד ייווצר מאוחר יותר.
          try {
            await supabase.from('whatsapp_messages').insert({
              phone: senderPhone,
              direction: 'נכנסת',
              body: msgText,
              provider_message_id: (msg.id as string) || null,
              is_read: false,
            })
          } catch (e) {
            console.error('[wa-cloud] Failed to store message:', e)
          }

          const lead = await findLead(supabase, senderPhone)
          if (!lead) continue

          if (isOptOut(msgText)) {
            await supabase.from(lead.table)
              .update({ followup_opted_out: true, followup_stopped: true })
              .eq('id', lead.id)
            continue
          }

          // הליד ענה, לעצור את הרובוט. אוהד ממשיך ידנית.
          await supabase.from(lead.table)
            .update({ followup_stopped: true })
            .eq('id', lead.id)
        }
      }
    }
  } catch (e) {
    console.error('[wa-cloud] Error:', e)
  }

  return NextResponse.json({ ok: true })
}
