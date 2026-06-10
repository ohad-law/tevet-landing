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

// פרסור field_data של פייסבוק — מחזיר מפה של name→value
function parseFieldData(
  fieldData: Array<{ name?: string; values?: string[]; value?: string }>
): Record<string, string> {
  const map: Record<string, string> = {}
  for (const f of fieldData) {
    const name = (f.name ?? '').toLowerCase().trim()
    const val = (f.values?.[0] ?? f.value ?? '').trim()
    if (name) map[name] = val
  }
  return map
}

// חיפוש במפה לפי מילת מפתח — מחזיר ערך ראשון שנמצא
function findByKeyword(map: Record<string, string>, ...keywords: string[]): string {
  for (const key of Object.keys(map)) {
    if (keywords.some(k => key.includes(k.toLowerCase()))) {
      return map[key]
    }
  }
  return ''
}

export async function POST(req: NextRequest) {
  // ── אימות ─────────────────────────────────────────────────────
  const secret = req.headers.get('x-webhook-secret')?.trim()
  if (WEBHOOK_SECRET && secret !== WEBHOOK_SECRET) {
    console.warn('[incoming] Unauthorized request')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let body: Record<string, any>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  console.log('[incoming] Received lead:', JSON.stringify(body))

  // ── פרסור שדות — שלב 1: שדות ישירים ──────────────────────────
  let full_name = body.full_name || body['Full Name'] || body.name || ''
  let phone = body.phone || body['Phone Number'] || body.phone_number || body['phone_number'] || ''
  let years_worked = body.years_worked || body['years_worked'] || body.years || ''
  let work_sector = body.work_sector || body['work_sector'] || body.sector || ''
  let work_sector_detail = body.work_sector_detail || body['work_sector_detail'] || ''
  let situation = body.situation || body['situation'] || ''
  let ad_name = body.ad_name || body['Ad Name'] || body['ad_name'] || ''
  let campaign_name = body.campaign_name || body['Campaign Name'] || body['campaign_name'] || ''
  let lead_id = body.lead_id || body['Lead ID'] || body.id || ''

  // ── פרסור שדות — שלב 2: field_data של פייסבוק ─────────────────
  // Make.com לפעמים מעביר את הנתונים כמערך {name, values[]} במקום שדות ישירים
  if (Array.isArray(body.field_data) && body.field_data.length > 0) {
    const fd = parseFieldData(body.field_data)
    console.log('[incoming] field_data parsed:', JSON.stringify(fd))

    if (!full_name) full_name = fd['full_name'] || fd['name'] || findByKeyword(fd, 'name', 'שם')
    if (!phone) phone = fd['phone_number'] || fd['phone'] || findByKeyword(fd, 'phone', 'טלפון', 'נייד')
    if (!years_worked) years_worked = fd['years_worked'] || fd['years'] || findByKeyword(fd, 'year', 'שנ', 'ותק', 'experience', 'עבוד')
    if (!work_sector) work_sector = fd['work_sector'] || fd['sector'] || findByKeyword(fd, 'sector', 'תחום', 'ענף')
    if (!work_sector_detail) work_sector_detail = fd['work_sector_detail'] || findByKeyword(fd, 'detail', 'פירוט')
    if (!situation) situation = fd['situation'] || findByKeyword(fd, 'situation', 'סיטואציה', 'מצב')
    if (!ad_name) ad_name = fd['ad_name'] || ''
    if (!campaign_name) campaign_name = fd['campaign_name'] || ''
    if (!lead_id) lead_id = fd['lead_id'] || ''
  }

  // ── ברירות מחדל אחרי כל הפרסורים ──────────────────────────────
  if (!full_name) full_name = '—'
  if (!years_worked) years_worked = '—'
  if (!work_sector) work_sector = '—'
  if (!situation) situation = '—'

  console.log(`[incoming] Parsed: name=${full_name}, phone=${phone}, years=${years_worked}, sector=${work_sector}, situation=${situation}, ad=${ad_name}`)

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
  // הליד עבר את הסינון → נכנס לרצף הפולואפ. הפולואפ הראשון מתוכנן ליום אחרי.
  const followupNextAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
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
      followup_stage: 0,
      followup_next_at: followupNextAt,
    })
    if (error) console.error('[incoming] Supabase error:', JSON.stringify(error))
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
    const displayPhone = phone || phoneNorm
    const ohadMsg = [
      `🟢 *ליד חדש — דיני עבודה*`,
      ``,
      `👤 *שם:* ${full_name}`,
      `📞 *טלפון:* ${displayPhone}`,
      ``,
      `📋 *פרטים:*`,
      `• שנות עבודה: ${years_worked}`,
      `• תחום: ${work_sector}${work_sector_detail ? ` — ${work_sector_detail}` : ''}`,
      `• סיטואציה: ${situation}`,
      ``,
      `📢 *מודעה:* ${ad_name || campaign_name || '—'}`,
      `🕐 ${now}`,
      phoneNorm ? `\n▶️ לחץ להשיב: https://wa.me/${phoneNorm}` : '',
    ].filter(l => l !== undefined).join('\n')

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
