/**
 * GET /api/cron/reactivation
 * מנוע ההחייאה: שולח תבנית מאושרת ללידים ישנים של דיני עבודה
 * מהמספר הרשמי 053-964-9422, במנות יומיות עולות.
 *
 * 🚨 כבוי כברירת מחדל. בלי REACTIVATION_ENABLED=1 הוא לא שולח כלום,
 * רק מדווח מה היה שולח. זה מיושם לפי הכלל שאין העלאה לאוויר בלי
 * אישור מפורש, וכדי ששום פריסה לא תתחיל קמפיין בטעות.
 *
 * מקור האמת ל"למי כבר שלחנו" הוא רשימת ההודעות בטוויליו ולא סימון
 * בבסיס הנתונים, כי סימון יכול לצאת מסנכרון עם מה שבאמת יצא.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { sendWhatsApp } from '@/lib/whatsapp'
import {
  sendTemplate,
  fetchSentRecipients,
  recentDeliveryStats,
  twilioConfigured,
} from '@/lib/twilio-whatsapp'

const OHAD_WA = '972542274497' // hard-coded, אסור דרך env var למניעת דליפה

/** התבנית שאוהד אישר 23/09/2026. בלי כפתורים, אחרת ההודעה מקופלת בנייד */
const CONTENT_SID = 'HX39b9532f0443bbb182ed636ad05f1940'

/** מנות עולות. מתחילים קטן כדי לראות איך הקהל מגיב לפני שמרחיבים */
const RAMP = [20, 40, 60, 80, 85]

const PACE_MS = 3000 // רווח בין הודעות, כדי לא להיראות כמו מכונה
const MIN_AGE_DAYS = 14 // לידים טריים מטופלים על ידי רובוט הפולואפ
const OPT_OUT_LIMIT = 0.08 // מעל 8 אחוז הסרות עוצרים ובודקים
const DELIVERY_FLOOR = 0.7 // מתחת ל-70 אחוז מסירה עוצרים

/** נושא הפנייה לשדה {{2}}, נגזר מהערות הליד כי main_concern ריק בכולם */
const TOPICS: Record<string, string> = {
  'עדיין עובד, חושד שמשהו לא בסדר בשכר': 'בדיקת תלושי השכר',
  'עדיין עובד, רוצה לבדוק': 'בדיקת תלושי השכר',
  בדיקה: 'בדיקת תלושי השכר',
  'פוטרתי לאחרונה': 'הפיטורים',
  התפטרתי: 'ההתפטרות',
  'עבדתי בשכר מזומן ללא תיעוד': 'שכר ששולם במזומן',
  'שכר במזומן / ללא תיעוד': 'שכר ששולם במזומן',
}

const EXCLUDED_STATUS = new Set(['לא רלוונטי', 'הפך ללקוח', 'ליד חם 🔥', 'פגישה נקבעה'])

type Lead = {
  id: string
  full_name: string | null
  phone: string | null
  notes: string | null
  status: string | null
  created_at: string
  followup_next_at: string | null
  followup_stopped: boolean | null
  followup_opted_out: boolean | null
  converted_to_client: boolean | null
}

function normalizePhone(raw: string | null): string | null {
  const p = String(raw || '').replace(/\D/g, '')
  const full = p.startsWith('0') ? '972' + p.slice(1) : p
  return /^9725\d{8}$/.test(full) ? full : null
}

function firstName(name: string | null): string {
  const n = (name || '').trim()
  return n ? n.split(/\s+/)[0] : ''
}

function topicOf(notes: string | null): string {
  const m = /סיטואציה:\s*([^|\n]+)/.exec(notes || '')
  return TOPICS[(m?.[1] || '').trim()] || 'זכויות בעבודה'
}

/** ימים א' עד ה', בין 10:00 ל-16:00 שעון ישראל */
function insideSendWindow(now: Date): { ok: boolean; reason?: string } {
  const il = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jerusalem' }))
  const day = il.getDay() // 0 ראשון, 5 שישי, 6 שבת
  if (day === 5 || day === 6) return { ok: false, reason: 'סוף שבוע' }
  const hour = il.getHours()
  if (hour < 10 || hour >= 16) return { ok: false, reason: `מחוץ לשעות, ${hour}:00` }
  return { ok: true }
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

export async function GET(req: NextRequest) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('unauthorized', { status: 401 })
  }
  // הרצה יבשה עובדת גם בלי טוויליו, כדי שאפשר יהיה לבדוק את בחירת
  // הקהל ואת גודל המנה לפני שמחברים את השליחה בפועל
  const live = process.env.REACTIVATION_ENABLED === '1' && twilioConfigured()
  const twilioMissing = !twilioConfigured()
  const now = new Date()
  const win = insideSendWindow(now)
  if (!win.ok) return NextResponse.json({ skipped: true, reason: win.reason })

  const supabase = createServiceClient()

  // ── מי כבר קיבל, לפי טוויליו ────────────────────────────────
  const alreadySent = await fetchSentRecipients()
  alreadySent.add(OHAD_WA) // הבדיקות שלנו אליו לא נחשבות

  // ── בלם חירום ──────────────────────────────────────────────
  if (alreadySent.size > 1) {
    const health = await recentDeliveryStats()
    const answered = health.total > 0
    const deliveredRate = answered ? health.delivered / health.total : 1
    if (answered && deliveredRate < DELIVERY_FLOOR) {
      const msg = `🛑 החייאה נעצרה. רק ${health.delivered} מתוך ${health.total} הודעות נמסרו. חשד לחסימה.`
      console.error('[reactivation] HALTED, delivery rate', deliveredRate)
      await sendWhatsApp(OHAD_WA, msg)
      return NextResponse.json({ halted: true, reason: 'delivery', health })
    }
  }

  // ── שליפת הקהל ─────────────────────────────────────────────
  const { data, error } = await supabase
    .from('leads')
    .select(
      'id, full_name, phone, notes, status, created_at, followup_next_at, followup_stopped, followup_opted_out, converted_to_client'
    )
    .eq('product_line', 'דיני עבודה')
    .order('created_at', { ascending: true })
    .limit(1000)

  if (error) {
    console.error('[reactivation] query failed', error)
    return NextResponse.json({ error: 'query_failed' }, { status: 500 })
  }

  const cutoff = new Date(now.getTime() - MIN_AGE_DAYS * 86400000)
  const seen = new Set<string>()
  const queue: { phone: string; name: string; topic: string; id: string }[] = []
  let optedOut = 0

  for (const lead of (data || []) as Lead[]) {
    if (lead.followup_opted_out) optedOut++
    const phone = normalizePhone(lead.phone)
    if (!phone) continue
    if (EXCLUDED_STATUS.has(String(lead.status))) continue
    if (lead.converted_to_client || lead.followup_opted_out) continue
    if (new Date(lead.created_at) > cutoff) continue
    // ליד שנמצא ברצף פעיל של רובוט הפולואפ לא מקבל גם החייאה
    if (lead.followup_next_at && !lead.followup_stopped) continue
    const name = firstName(lead.full_name)
    if (!name) continue
    if (seen.has(phone) || alreadySent.has(phone)) continue
    seen.add(phone)
    queue.push({ phone, name, topic: topicOf(lead.notes), id: lead.id })
  }

  // ── שיעור הסרות, בלם שני ───────────────────────────────────
  const contacted = alreadySent.size - 1
  if (contacted >= 20 && optedOut / contacted > OPT_OUT_LIMIT) {
    const pct = Math.round((optedOut / contacted) * 100)
    console.error('[reactivation] HALTED, opt-out rate', pct)
    await sendWhatsApp(OHAD_WA, `🛑 החייאה נעצרה. ${pct} אחוז מהנמענים ביקשו הסרה. הנוסח צריך בדיקה.`)
    return NextResponse.json({ halted: true, reason: 'opt_out', optedOut, contacted })
  }

  // ── כמה שולחים היום ────────────────────────────────────────
  const dayIndex = Math.min(
    RAMP.findIndex((_, i) => contacted < RAMP.slice(0, i + 1).reduce((a, b) => a + b, 0)),
    RAMP.length - 1
  )
  const cap = RAMP[dayIndex < 0 ? RAMP.length - 1 : dayIndex]
  const batch = queue.slice(0, cap)

  if (!live) {
    return NextResponse.json({
      dryRun: true,
      note: twilioMissing
        ? 'חסר TWILIO_ACCOUNT_SID בוורסל, אי אפשר לשלוח'
        : 'REACTIVATION_ENABLED אינו 1, לא נשלח דבר',
      twilioMissing,
      contacted,
      remaining: queue.length,
      wouldSend: batch.length,
      sample: batch.slice(0, 3).map(b => ({ name: b.name, topic: b.topic })),
    })
  }

  // ── שליחה ──────────────────────────────────────────────────
  let sent = 0
  const failures: string[] = []
  for (const item of batch) {
    const res = await sendTemplate(item.phone, CONTENT_SID, { '1': item.name, '2': item.topic })
    if (res.ok) {
      sent++
      await supabase.from('whatsapp_messages').insert({
        phone: item.phone,
        direction: 'יוצאת',
        body: `החייאה: פנייה בעניין ${item.topic}`,
        provider_message_id: res.sid || null,
        is_read: true,
      })
    } else {
      failures.push(`${item.name}: ${res.error}`)
    }
    if (sent < batch.length) await sleep(PACE_MS)
  }

  const report = [
    '📤 דוח החייאה יומי',
    '',
    `נשלחו היום: ${sent}`,
    `נותרו ברשימה: ${queue.length - sent}`,
    `סך הכל קיבלו עד היום: ${contacted + sent}`,
    `ביקשו הסרה: ${optedOut}`,
    failures.length ? `\nכשלונות (${failures.length}):\n${failures.slice(0, 5).join('\n')}` : '',
  ]
    .filter(Boolean)
    .join('\n')

  await sendWhatsApp(OHAD_WA, report)

  return NextResponse.json({ sent, remaining: queue.length - sent, contacted: contacted + sent, failures })
}
