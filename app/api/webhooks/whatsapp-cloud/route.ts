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
      .maybeSingle()
    if (data) return { ...data, table }
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

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await req.json()
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
