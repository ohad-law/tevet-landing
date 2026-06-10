/**
 * POST /api/leads/incoming
 * נקרא ע"י Make.com כשליד חדש ממטא נכנס.
 *
 * פעולות:
 *  0. סינון: פחות משנה → הודעת דחייה לליד בלבד, אין שמירה
 *  1. שמירה ב-Supabase
 *  2. יצירה ב-BASE44 (CRM של אוהד)
 *  3. הודעת WhatsApp לאוהד
 *  4. הודעת WhatsApp חמה לליד
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { createBase44Lead, normalizePhone } from '@/lib/base44'
import { sendWhatsApp } from '@/lib/whatsapp'

const OHAD_WA = process.env.OHAD_WHATSAPP_NUMBER!
const WEBHOOK_SECRET = process.env.LEADS_WEBHOOK_SECRET!

export async function POST(req: NextRequest) {
  // ── אימות ─────────────────────────────────────────────────────
  const secret = req.headers.get('x-webhook-secret')?.trim()
  if (WEBHOOK_SECRET && secret !== WEBHOOK_SECRET) {
    console.warn('[incoming] Unauthorized request')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: Record<string, string>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  console.log('[incoming] Received lead:', JSON.stringify(body))

  // תמיכה בשמות שדות שונים שMake.com עשוי לשלוח
  const full_name      = body.full_name      || body['Full Name']         || body.name         || '—'
  const phone          = body.phone          || body['Phone Number']      || body.phone_number  || ''
  const years_worked   = body.years_worked   || body['years_worked']      || body.years         || '—'
  const work_sector    = body.work_sector    || body['work_sector']       || body.sector        || '—'
  const work_sector_detail = body.work_sector_detail || body['work_sector_detail'] || ''
  const situation      = body.situation      || body['situation']         || '—'
  const ad_name        = body.ad_name        || body['Ad Name']           || body['ad_name']    || ''
  const campaign_name  = body.campaign_name  || body['Campaign Name']     || body['campaign_name'] || ''
  const lead_id        = body.lead_id        || body['Lead ID']           || ''

  const phoneNorm = normalizePhone(phone)
  const now = new Date().toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' })
  const today = new Date().toISOString().split('T')[0]

  // ── 0. סינון: פחות משנה ───────────────────────────────────────
  if (isUnderOneYear(years_worked)) {
    console.log(`[incoming] Filtered (under 1 year): ${full_name} / ${phoneNorm}`)
    if (phoneNorm && phoneNorm.length >= 10) {
      const firstName = full_name.split(' ')[0]
      await sendWhatsApp(phoneNorm, buildRejectionMessage(firstName))
    }
    return NextResponse.json({ ok: true, filtered: 'under_one_year' })
  }

  // ── 1. Supabase ───────────────────────────────────────────────
  try {
    const supabase = createServiceClient()
    const { error } = await supabase.from('leads').insert({
      full_name,
      phone: phoneNorm,
      source: 'facebook_lead_form',
      campaign_name: ad_name || campaign_name,
      notes: `שנות עבודה: ${years_worked} | תחום: ${work_sector}${work_sector_detail ? ` (${work_sector_detail})` : ''} | סיטואציה: ${situation}`,
      status: 'חדש',
      is_viewed: false,
    })
    if (error) {
      console.error('[incoming] Supabase error:', JSON.stringify(error))
      // DEBUG TEMP — remove after fix
      return NextResponse.json({ ok: false, supabase_error: error }, { status: 500 })
    }
    else console.log('[incoming] Saved to Supabase:', full_name)
  } catch (e) {
    console.error('[incoming] Supabase exception:', e)
  }

  // ── 2. BASE44 ─────────────────────────────────────────────────
  try {
    const notes = [
      `📋 ליד ממטא — ${now}`,
      `• שנות עבודה: ${years_worked}`,
      `• תחום: ${work_sector}${work_sector_detail ? ` — ${work_sector_detail}` : ''}`,
      `• סיטואציה: ${situation}`,
      `• מודעה: ${ad_name}`,
      `• קמפיין: ${campaign_name}`,
      lead_id ? `• Lead ID: ${lead_id}` : '',
    ].filter(Boolean).join('\n')

    await createBase44Lead({
      full_name,
      phone: phoneNorm,
      source: 'Facebook',
      source_other: ad_name,
      campaign_name,
      landing_page: ad_name,
      status: 'חדש',
      notes,
      utm_source: 'facebook',
      utm_medium: 'paid_social',
      utm_campaign: campaign_name,
      first_contact_date: today,
      is_viewed: false,
      lead_score: 70,
    })
    console.log('[incoming] Created in BASE44:', full_name)
  } catch (e) {
    console.error('[incoming] BASE44 exception:', e)
  }

  // ── 3. WhatsApp לאוהד ─────────────────────────────────────────
  try {
    const ohadMsg = [
      `🟢 *ליד חדש — דיני עבודה*`,
      ``,
      `👤 *שם:* ${full_name}`,
      `📞 *טלפון:* ${phone}`,
      ``,
      `📋 *פרטים:*`,
      `• שנות עבודה: ${years_worked}`,
      `• תחום: ${work_sector}${work_sector_detail ? ` — ${work_sector_detail}` : ''}`,
      `• סיטואציה: ${situation}`,
      ``,
      `📢 *מודעה:* ${ad_name || campaign_name}`,
      `🕐 ${now}`,
      ``,
      `▶️ לחץ להשיב: https://wa.me/${phoneNorm}`,
    ].join('\n')

    await sendWhatsApp(OHAD_WA, ohadMsg)
    console.log('[incoming] Notified Ohad via WhatsApp')
  } catch (e) {
    console.error('[incoming] WhatsApp to Ohad error:', e)
  }

  // ── 4. WhatsApp לליד ──────────────────────────────────────────
  if (phoneNorm && phoneNorm.length >= 10) {
    try {
      const firstName = full_name.split(' ')[0]
      const leadMsg = buildLeadMessage(firstName, years_worked, situation)
      await sendWhatsApp(phoneNorm, leadMsg)
      console.log('[incoming] Warm WhatsApp sent to lead:', phoneNorm)
    } catch (e) {
      console.error('[incoming] WhatsApp to lead error:', e)
    }
  }

  return NextResponse.json({ ok: true })
}

// ─────────────────────────────────────────────────────────────────
// עזר: בדיקת פחות משנה
// ─────────────────────────────────────────────────────────────────
function isUnderOneYear(years: string): boolean {
  if (!years || years === '—') return false
  const val = years.trim().toLowerCase()
  return (
    val.includes('פחות משנה') ||
    val.includes('פחות מ') ||
    val.startsWith('0') ||
    val === 'פחות' ||
    val.includes('less than 1') ||
    val.includes('under 1') ||
    val.includes('under one') ||
    val === '0'
  )
}

// ─────────────────────────────────────────────────────────────────
// הודעת דחייה מנומסת — פחות משנה
// ─────────────────────────────────────────────────────────────────
function buildRejectionMessage(name: string): string {
  return [
    `שלום ${name} 👋`,
    ``,
    `תודה שפנית למשרד עו"ד אוהד טבת.`,
    ``,
    `לאחר בדיקת הפרטים, עם ותק של פחות משנה לרוב לא נוכל לסייע במסגרת ייצוג בדיני עבודה.`,
    ``,
    `אם המצב ישתנה בעתיד — נשמח לעמוד לרשותך. בהצלחה! 🙏`,
  ].join('\n')
}

// ─────────────────────────────────────────────────────────────────
// הודעה חמה לליד — לפי סיטואציה
// ─────────────────────────────────────────────────────────────────
function buildLeadMessage(name: string, years: string, situation: string): string {
  let hook = ''

  if (situation.includes('פוטר') || situation.includes('פיטור')) {
    hook = `לפי ${years} שנות עבודה וסיטואציית הפיטורין — ברוב המקרים מגיע יותר ממה שחושבים 💡`
  } else if (situation.includes('התפטר') || situation.includes('התפטרות')) {
    hook = `גם מי שהתפטר עשוי להיות זכאי לזכויות — לפי ${years} שנות עבודה שלך 💡`
  } else if (situation.toLowerCase().includes('שכר') || situation.includes('מזומן') || situation.includes('תלוש')) {
    hook = `בעיות שכר ותלושים הן בדיוק התחום שלנו — ויש לנו תוצאות 💡`
  } else {
    hook = `לפי הפרטים שמסרת — ייתכן שמגיע לך יותר ממה שחושבים 💡`
  }

  return [
    `שלום ${name} 👋`,
    ``,
    `קיבלתי את פנייתך.`,
    hook,
    ``,
    `אני *אוהד טבת*, עו"ד לדיני עבודה ובודק שכר מוסמך.`,
    ``,
    `מתי נוח לך שיחה קצרה של 10 דקות?`,
    `אפשר לענות ישירות כאן 👇`,
  ].join('\n')
}
