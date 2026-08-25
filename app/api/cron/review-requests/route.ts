/**
 * Vercel Cron, בקשות ביקורת בגוגל (רץ פעם ביום)
 *
 * שולף תיקים שהגיעו לסיומם ושהלקוח שלהם עוד לא התבקש לכתוב ביקורת,
 * שולח הודעת וואטסאפ אחת עם הקישור לפרופיל, ומסמן שנשלח.
 *
 * שלוש הגנות מכוונות:
 *   1. מתג ראשי כבוי כברירת מחדל, בלי REVIEW_REQUESTS_ENABLED=true זו הרצה יבשה בלבד.
 *   2. תקרה יומית נמוכה, טפטוף ולא מבול. מגן על מספר הוואטסאפ,
 *      וגם נראה טבעי לגוגל (זרם ביקורות פתאומי נחשד כמניפולציה).
 *   3. כל לקוח מקבל בקשה אחת בחיים, review_requested_at חוסם חזרה.
 *
 * schedule מוגדר ב-vercel.json
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { sendWhatsApp } from '@/lib/whatsapp'
import { buildReviewRequest } from '@/lib/review-templates'
import { CLOSED_STATUSES } from '@/lib/case-statuses'

const DAILY_CAP = 5 // טפטוף מכוון, ראה הערה למעלה
const PACE_MS = 8000 // מרווח בין הודעות (קצב אנושי)
const OHAD_PHONE = (process.env.OHAD_WHATSAPP_NUMBER || process.env.OHAD_WHATSAPP || '972542274497').replace(/\D/g, '')
const ENABLED = process.env.REVIEW_REQUESTS_ENABLED === 'true'

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

export async function GET(req: NextRequest) {
  // אימות שהקריאה מגיעה מ-Vercel Cron
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()

  // ── שלוף תיקים סגורים שטרם ביקשנו עליהם ביקורת ────────────────
  // הכי טריים קודם: לקוח שהתיק שלו נסגר השבוע זוכר אותנו טוב יותר.
  const { data: cases, error } = await supabase
    .from('cases')
    .select('id, case_name, client_id, status, updated_at')
    .in('status', [...CLOSED_STATUSES])
    .is('review_requested_at', null)
    .eq('review_opted_out', false)
    .order('updated_at', { ascending: false })
    .limit(DAILY_CAP * 4) // מרווח לדילוגים (בלי טלפון / כפילויות)

  if (error) {
    console.error('[review-requests] Query failed:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  console.log(`[review-requests] Candidates: ${cases?.length ?? 0} | enabled=${ENABLED}`)

  let sent = 0
  let skipped = 0
  const preview: string[] = []
  const seenPhones = new Set<string>() // לקוח עם כמה תיקים סגורים יקבל הודעה אחת

  for (const c of cases ?? []) {
    if (sent >= DAILY_CAP) {
      console.log('[review-requests] Daily cap reached, deferring rest to tomorrow')
      break
    }
    if (!c.client_id) { skipped++; continue }

    const { data: client } = await supabase
      .from('clients')
      .select('full_name, phone')
      .eq('id', c.client_id)
      .maybeSingle()

    const phoneNorm = (client?.phone ?? '').replace(/\D/g, '')
    if (phoneNorm.length < 10) { skipped++; continue }
    if (seenPhones.has(phoneNorm)) { skipped++; continue }

    // הגנה קריטית: לעולם לא לשלוח בקשת ביקורת למספר של אוהד
    if (phoneNorm === OHAD_PHONE) {
      console.error(`[review-requests] SAFETY BLOCK: client phone matches Ohad's number. Skipping case ${c.id}.`)
      skipped++; continue
    }

    // ── הרצה יבשה, מציגה למי היה נשלח, בלי לשלוח ────────────────
    if (!ENABLED) {
      preview.push(`${client?.full_name ?? '(ללא שם)'}, ${c.case_name}`)
      seenPhones.add(phoneNorm)
      sent++
      continue
    }

    const ok = await sendWhatsApp(phoneNorm, buildReviewRequest(client?.full_name ?? null))
    if (!ok) {
      console.error(`[review-requests] Send failed for case ${c.id}`)
      skipped++
      continue
    }

    await supabase
      .from('cases')
      .update({ review_requested_at: new Date().toISOString() })
      .eq('id', c.id)

    seenPhones.add(phoneNorm)
    sent++
    preview.push(`${client?.full_name ?? '(ללא שם)'}, ${c.case_name}`)
    await sleep(PACE_MS)
  }

  // ── דיווח לאוהד ──────────────────────────────────────────────
  if (preview.length > 0) {
    const header = ENABLED
      ? `בקשות ביקורת שנשלחו היום (${sent}):`
      : `⚠️ הרצה יבשה. אלה היו מקבלים בקשת ביקורת (${sent}):`
    await sendWhatsApp(OHAD_PHONE, [header, ``, ...preview.map(p => `• ${p}`)].join('\n'))
  }

  return NextResponse.json({ ok: true, enabled: ENABLED, sent, skipped })
}
