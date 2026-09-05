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
import { sendWhatsApp, hasWhatsApp } from '@/lib/whatsapp'
import { buildWarmMessage, buildNurtureMessage } from '@/lib/followup-templates'

// מספר אוהד, hard-coded כדי למנוע דליפת מידע לליד שגוי דרך env var שגוי
const OHAD_WA = '972542274497'
const WEBHOOK_SECRET = process.env.LEADS_WEBHOOK_SECRET!
const META_TOKEN = process.env.META_ACCESS_TOKEN!

// מחלץ את מזהה הליד של פייסבוק מכל מבנה אפשרי ש-Make.com / מטא עשויים לשלוח
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractLeadgenId(body: Record<string, any>): string {
  return (
    body.leadgen_id ||
    body.lead_id ||
    body['Lead ID'] ||
    body.id ||
    body.entry?.[0]?.changes?.[0]?.value?.leadgen_id ||
    body.value?.leadgen_id ||
    ''
  )
}

// מושך את פרטי הליד המלאים ישירות מ-Meta Graph API לפי מזהה הליד
async function fetchLeadFromGraph(leadgenId: string): Promise<Record<string, string> | null> {
  if (!META_TOKEN || !leadgenId) return null
  try {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${leadgenId}` +
      `?fields=id,field_data,ad_name,campaign_name,created_time&access_token=${META_TOKEN}`
    )
    const data = await res.json()
    if (data.error) {
      console.error('[incoming] Graph API error:', JSON.stringify(data.error))
      return null
    }
    const map: Record<string, string> = {}
    for (const f of (data.field_data ?? []) as Array<{ name: string; values: string[] }>) {
      map[f.name] = f.values?.[0] ?? ''
    }
    if (data.ad_name) map['ad_name'] = data.ad_name
    if (data.campaign_name) map['campaign_name'] = data.campaign_name
    console.log('[incoming] Graph API fetched:', JSON.stringify(map))
    return map
  } catch (e) {
    console.error('[incoming] Graph API exception:', e)
    return null
  }
}

// פרסור field_data של פייסבוק, מחזיר מפה של name→value
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

// חיפוש במפה לפי מילת מפתח, מחזיר ערך ראשון שנמצא
function findByKeyword(map: Record<string, string>, ...keywords: string[]): string {
  for (const key of Object.keys(map)) {
    if (keywords.some(k => key.includes(k.toLowerCase()))) {
      return map[key]
    }
  }
  return ''
}

// תרגום קודי הטופס של פייסבוק לעברית קריאה (הטופס שומר ערכים באנגלית)
const FORM_MAP: Record<string, Record<string, string>> = {
  years_worked: {
    under_1: 'פחות משנה',
    '1_to_3': 'שנה עד 3 שנים',
    '3_to_7': '3 עד 7 שנים',
    over_7: 'מעל 7 שנים',
  },
  work_sector: {
    security: 'שמירה / אבטחה',
    cleaning: 'ניקיון / תחזוקה',
    construction: 'בניין / עבודות שטח',
    retail_food: 'מסחר / מסעדנות / שירות',
    other: 'אחר',
  },
  situation: {
    fired: 'פוטרתי לאחרונה',
    resigned: 'התפטרתי',
    current_issue: 'עדיין עובד, חושד שמשהו לא בסדר בשכר',
    cash_salary: 'עבדתי בשכר מזומן ללא תיעוד',
  },
}

// מתרגם קוד אנגלי לעברית; אם הערך לא מוכר מחזיר אותו כמו שהוא
function toHebrew(field: string, raw: string): string {
  const m = FORM_MAP[field]
  if (!m || !raw) return raw
  return m[raw.trim()] ?? raw
}

// ציון דחיפות לפי ותק, ככל שהוותק גבוה יותר, איכות הליד גבוהה יותר.
// מקבל גם קוד אנגלי וגם תווית עברית.
function leadScoreFromYears(years: string): number {
  const y = years || ''
  if (y.includes('מעל 7') || y.includes('over_7')) return 100
  if (y.includes('3 עד 7') || y.includes('3_to_7')) return 85
  if (y.includes('שנה עד 3') || y.includes('1_to_3')) return 70
  if (y.includes('פחות משנה') || y.includes('under_1')) return 40
  return 60
}


/**
 * ניתוב הליד לפי ותק וסיטואציה, נקבע 05/09/2026.
 *
 * הרעיון: הזמן של אוהד הוא המשאב היחיד שאין ממנו עוד, ולכן שיחה
 * נשמרת למי שיש לו תיק בגודל שמצדיק אותה. מי שעדיין עובד עם ותק
 * נמוך אין לו תיק סיום העסקה (פיצויים, הודעה מוקדמת, פדיון חופשה),
 * ונשאר רק הפרש התלוש, שהוא קטן וגם קשה לתבוע ממעסיק פעיל.
 *
 * הוא לא נזרק. הוא מקבל את הצ'קליסט, נשאר ברשימה, וחוזר אלינו
 * ביום שההעסקה מסתיימת, ואז גם הוותק גדול יותר וגם יש תיק.
 *
 * ⚠️ הטופס לא יודע להבחין בין ארבע שנים לשש, כי המדרגה היא
 * "3 עד 7". לכן הסף כאן הוא שלוש שנים, והסף האמיתי של חמש
 * מאומת בשיחה. כשמדרגות הטופס יפוצלו, אפשר לדייק כאן.
 */
function routeLead(years: string, situation: string): 'call' | 'nurture' {
  const y = years || ''
  const s = situation || ''
  const stillWorking = s.includes('עדיין עובד') || s.includes('current_issue')
  const under1 = y.includes('פחות משנה') || y.includes('under_1')
  const oneToThree = y.includes('שנה עד 3') || y.includes('1_to_3')

  if (under1) return 'nurture'
  if (stillWorking && oneToThree) return 'nurture'
  return 'call'
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

  // ── פרסור שדות, שלב 1: שדות ישירים ──────────────────────────
  let full_name = body.full_name || body['Full Name'] || body.name || ''
  let phone = body.phone || body['Phone Number'] || body.phone_number || body['phone_number'] || ''
  let years_worked = body.years_worked || body['years_worked'] || body.years || ''
  let work_sector = body.work_sector || body['work_sector'] || body.sector || ''
  let work_sector_detail = body.work_sector_detail || body['work_sector_detail'] || ''
  let situation = body.situation || body['situation'] || ''
  let ad_name = body.ad_name || body['Ad Name'] || body['ad_name'] || ''
  let campaign_name = body.campaign_name || body['Campaign Name'] || body['campaign_name'] || ''
  let lead_id = body.lead_id || body['Lead ID'] || body.id || ''

  // ── פרסור שדות, שלב 2: field_data של פייסבוק ─────────────────
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

  // ── פרסור שדות, שלב 3: משיכה ישירה מ-Meta Graph API ─────────
  // אם Make.com שלח חבילה ריקה (רק מזהה / כלום), נמשוך את הפרטים מ-Meta בעצמנו.
  if (!lead_id) lead_id = extractLeadgenId(body)
  const needsGraph = (!phone || !full_name) && lead_id
  if (needsGraph) {
    console.log(`[incoming] Fields missing, fetching from Graph by leadgen_id=${lead_id}`)
    const fd = await fetchLeadFromGraph(lead_id)
    if (fd) {
      if (!full_name) full_name = fd['full_name'] || fd['name'] || findByKeyword(fd, 'name', 'שם')
      if (!phone) phone = fd['phone_number'] || fd['phone'] || findByKeyword(fd, 'phone', 'טלפון', 'נייד')
      if (!years_worked) years_worked = fd['years_worked'] || fd['years'] || findByKeyword(fd, 'year', 'שנ', 'ותק', 'experience', 'עבוד')
      if (!work_sector) work_sector = fd['work_sector'] || fd['sector'] || findByKeyword(fd, 'sector', 'תחום', 'ענף')
      if (!work_sector_detail) work_sector_detail = fd['work_sector_detail'] || findByKeyword(fd, 'detail', 'פירוט')
      if (!situation) situation = fd['situation'] || findByKeyword(fd, 'situation', 'סיטואציה', 'מצב')
      if (!ad_name) ad_name = fd['ad_name'] || ''
      if (!campaign_name) campaign_name = fd['campaign_name'] || ''
    }
  }

  // ── אם עדיין אין טלפון, אל תיצור ליד ריק ולא תטריד את אוהד ──
  if (!phone) {
    console.error('[incoming] Could not resolve lead data. Raw body:', JSON.stringify(body))
    await sendWhatsApp(
      OHAD_WA,
      `⚠️ נכנס ליד אבל לא הצלחתי למשוך את הפרטים שלו אוטומטית (leadgen_id=${lead_id || 'חסר'}). כדאי לבדוק אותו ידנית במנהל המודעות.`
    )
    return NextResponse.json({ ok: true, warning: 'no_phone_resolved' })
  }

  // ── תרגום קודי הטופס לעברית קריאה ─────────────────────────────
  years_worked = toHebrew('years_worked', years_worked)
  work_sector = toHebrew('work_sector', work_sector)
  situation = toHebrew('situation', situation)

  // ── ברירות מחדל אחרי כל הפרסורים ──────────────────────────────
  if (!full_name) full_name = 'לא צוין'
  if (!years_worked) years_worked = 'לא צוין'
  if (!work_sector) work_sector = 'לא צוין'
  if (!situation) situation = 'לא צוין'

  console.log(`[incoming] Parsed: name=${full_name}, phone=${phone}, years=${years_worked}, sector=${work_sector}, situation=${situation}, ad=${ad_name}`)

  const phoneNorm = normalizePhone(phone)
  const now = new Date().toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' })
  const today = new Date().toISOString().split('T')[0]

  // ── סינון אוטומטי בוטל (החלטת אוהד) ───────────────────────────
  // כל הלידים נכנסים ומקבלים חימום. סינון "פחות מחצי שנה" נעשה ידנית בשיחה,
  // כי הטופס לא מבחין בחצי שנה (האפשרות הקטנה ביותר היא "פחות משנה").

  // ── 1. Supabase ───────────────────────────────────────────────
  // הליד נכנס לרצף הפולואפ. קיבל הודעת פתיחה עכשיו, והבאה היא הפרידה ביום 7.
  // היה כאן 3 ימים, לפני שהודעת יום 3 הוסרה. ראה lib/followup-templates.ts
  const followupNextAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  const track = routeLead(years_worked, situation)
  try {
    const supabase = createServiceClient()
    const { error } = await supabase.from('leads').insert({
      full_name,
      phone: phoneNorm,
      source: 'facebook_lead_form',
      campaign_name: ad_name || campaign_name,
      notes: `שנות עבודה: ${years_worked} | תחום: ${work_sector}${work_sector_detail ? ` (${work_sector_detail})` : ''} | סיטואציה: ${situation}` + (track === 'nurture' ? ' | 🌱 טיפוח, לא לחייג. ותק נמוך ועדיין עובד' : ''),
      // בלי product_line הליד לא מופיע באף לשונית במסך המכירות, והניקוד נשלח
      // עד היום רק ל-BASE44 שנטוש. שניהם חסרו כאן מאז יום המעבר (25/07/2026).
      product_line: 'דיני עבודה',
      lead_score: leadScoreFromYears(years_worked),
      status: track === 'nurture' ? 'טיפוח' : 'חדש',
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
      `📋 ליד ממטא, ${now}`,
      `• שנות עבודה: ${years_worked}`,
      `• תחום: ${work_sector}${work_sector_detail ? `, ${work_sector_detail}` : ''}`,
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
      lead_score: leadScoreFromYears(years_worked),
      product_line: 'דיני עבודה',
    })
    console.log('[incoming] Created in BASE44:', full_name)
  } catch (e) {
    console.error('[incoming] BASE44 exception:', e)
  }

  // ── 3. WhatsApp לאוהד ─────────────────────────────────────────
  try {
    const displayPhone = phone || phoneNorm
    const ohadMsg = [
      `🟢 *ליד חדש, דיני עבודה*`,
      ``,
      `👤 *שם:* ${full_name}`,
      `📞 *טלפון:* ${displayPhone}`,
      ``,
      `📋 *פרטים:*`,
      `• שנות עבודה: ${years_worked}`,
      `• תחום: ${work_sector}${work_sector_detail ? `, ${work_sector_detail}` : ''}`,
      `• סיטואציה: ${situation}`,
      ``,
      `📢 *מודעה:* ${ad_name || campaign_name || 'לא צוין'}`,
      `🕐 ${now}`,
      phoneNorm ? `\n▶️ לחץ להשיב: https://wa.me/${phoneNorm}` : '',
    ].filter(l => l !== undefined).join('\n')

    // הגנה קריטית: לעולם לא לשלוח פרטי ליד למספר שהוא הליד עצמו
    const ohadNorm = OHAD_WA.replace(/\D/g, '')
    if (ohadNorm === phoneNorm) {
      console.error(`[incoming] SAFETY BLOCK: ohadMsg destination matches lead phone (${phoneNorm}). Not sending to avoid data leak.`)
    } else {
      await sendWhatsApp(OHAD_WA, ohadMsg)
      console.log('[incoming] Notified Ohad via WhatsApp')
    }
  } catch (e) {
    console.error('[incoming] WhatsApp to Ohad error:', e)
  }

  // ── 4. WhatsApp לליד (אותה הודעת חימום כמו הרובוט) ───────────
  if (phoneNorm && phoneNorm.length >= 10) {
    try {
      // חלק מהלידים משאירים מספר שאין עליו וואטסאפ בכלל. שליחה לשם נכשלת
      // בשקט, נספרת אצל מטא כניסיון ספאם, ומשאירה את הצ'אט בכרטיס ריק
      // כאילו יש תקלה במערכת. עדיף לזהות מראש ולהעביר את הליד לחיוג.
      if (await hasWhatsApp(phoneNorm)) {
        const leadMsg = track === 'nurture'
          ? buildNurtureMessage(full_name)
          : buildWarmMessage(full_name, situation)
        await sendWhatsApp(phoneNorm, leadMsg)
        console.log(`[incoming] WhatsApp sent to lead (${track}):`, phoneNorm)
      } else if (track === 'nurture') {
        // אין וואטסאפ ואין תיק. אין למי לחייג ואין מה לשלוח, רק לתעד.
        console.log('[incoming] Nurture lead without WhatsApp, no action:', phoneNorm)
      } else {
        console.log('[incoming] Lead has no WhatsApp account:', phoneNorm)
        await sendWhatsApp(OHAD_WA, [
          '📞 הליד החדש בלי וואטסאפ, צריך לחייג',
          '',
          `${full_name || 'ללא שם'}: ${phoneNorm}`,
        ].join('\n'))
      }
    } catch (e) {
      console.error('[incoming] WhatsApp to lead error:', e)
    }
  }

  return NextResponse.json({ ok: true })
}
