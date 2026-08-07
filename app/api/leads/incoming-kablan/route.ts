/**
 * POST /api/leads/incoming-kablan
 * נקרא ע"י Make.com כשליד חדש מהקמפיין "קבלן רשום" נכנס.
 *
 * פעולות:
 *  1. שמירה ב-Supabase (leads, source מסומן kablan_rashum)
 *  2. הודעת WhatsApp לאוהד (למספר האישי)
 *  3. הודעת חימום חד-פעמית ללקוח (בלי רצף פולואפ אוטומטי, ראו הערה בקובץ)
 *
 * הערה: אין קריאה ל-BASE44 (מערכת נטושה, ראו rule_base44_cutover).
 * הערה: הליד לא מוכנס לרצף הפולואפ האוטומטי (followup_stage) של דיני עבודה,
 * כי (א) התבניות שם מדברות על תלושי שכר, לא רלוונטי לקבלן רשום,
 * ו-(ב) המספר העסקי חדש ובתהליך רמפה, לא רוצים להוסיף עליו נפח אוטומטי לא מבוקר.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { normalizePhone } from '@/lib/base44'
import { sendWhatsApp, sendWhatsAppVideo } from '@/lib/whatsapp'

const OHAD_WA = '972542274497'
const WEBHOOK_SECRET = process.env.LEADS_WEBHOOK_SECRET!
// כבוי כברירת מחדל — הבוט האינטראקטיבי (סרטון + שאלות עיסוק/ניסיון) ממתין לסרטון של אוהד.
// כשה-2 האלה מוגדרים ב-Vercel, שולחים סרטון + שאלה ראשונה במקום הודעת החימום הבודדת הישנה.
const KABLAN_BOT_ENABLED = process.env.KABLAN_BOT_ENABLED === 'true'
const KABLAN_VIDEO_URL = process.env.KABLAN_VIDEO_URL || ''

function extractLeadgenId(body: Record<string, any>): string {
  return (
    body.leadgen_id ||
    body.lead_id ||
    body['Lead ID'] ||
    body.id ||
    ''
  )
}

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

function findByKeyword(map: Record<string, string>, ...keywords: string[]): string {
  for (const key of Object.keys(map)) {
    if (keywords.some(k => key.includes(k.toLowerCase()))) {
      return map[key]
    }
  }
  return ''
}

async function fetchLeadFromGraph(leadgenId: string): Promise<Record<string, string> | null> {
  const META_TOKEN = process.env.META_ACCESS_TOKEN!
  if (!META_TOKEN || !leadgenId) return null
  try {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${leadgenId}` +
      `?fields=id,field_data,ad_name,campaign_name,created_time&access_token=${META_TOKEN}`
    )
    const data = await res.json()
    if (data.error) {
      console.error('[incoming-kablan] Graph API error:', JSON.stringify(data.error))
      return null
    }
    const map: Record<string, string> = {}
    for (const f of (data.field_data ?? []) as Array<{ name: string; values: string[] }>) {
      map[f.name] = f.values?.[0] ?? ''
    }
    if (data.ad_name) map['ad_name'] = data.ad_name
    if (data.campaign_name) map['campaign_name'] = data.campaign_name
    return map
  } catch (e) {
    console.error('[incoming-kablan] Graph API exception:', e)
    return null
  }
}

function buildKablanWarmMessage(fullName: string | null): string {
  const name = fullName && fullName !== '—' ? fullName.split(' ')[0] : ''
  const greeting = name ? `היי ${name},` : 'היי,'
  return [
    `${greeting}`,
    ``,
    `קיבלתי את הפרטים שלך לבדיקת זכאות לרישיון קבלן רשום.`,
    ``,
    `אני עו"ד אוהד טבת, אבדוק את הפרטים ואחזור אליך בהקדם עם התשובה.`,
    ``,
    `אם יש לך שאלה בינתיים, אפשר לכתוב לי כאן.`,
  ].join('\n')
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-webhook-secret')?.trim()
  if (WEBHOOK_SECRET && secret !== WEBHOOK_SECRET) {
    console.warn('[incoming-kablan] Unauthorized request')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const rawText = await req.text()
  let body: Record<string, any>
  try {
    body = JSON.parse(rawText)
  } catch (e) {
    console.error('[incoming-kablan] Invalid JSON. Raw body was:', rawText)
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  console.log('[incoming-kablan] Received lead:', JSON.stringify(body))

  let full_name = body.full_name || body['Full Name'] || ''
  let phone = body.phone || body.phone_number || ''
  let has_experience = body.has_experience || ''
  let is_resident = body.is_resident || ''
  let in_sector = body.in_sector || ''
  let ad_name = body.ad_name || ''
  let campaign_name = body.campaign_name || ''
  let lead_id = body.lead_id || ''

  // Make.com מעביר את שאלות הטופס תחת raw_data (אובייקט חופשי, מכיל מפתחות
  // בעברית עם תווים מיוחדים שקשה למפות אחד-אחד ב-Make עצמו) — לכן פרסור לפי
  // מילות מפתח, לא לפי שם שדה מדויק.
  if (body.raw_data && typeof body.raw_data === 'object' && !Array.isArray(body.raw_data)) {
    const raw: Record<string, string> = {}
    for (const [k, v] of Object.entries(body.raw_data as Record<string, unknown>)) {
      raw[k.toLowerCase()] = Array.isArray(v) ? String(v[0] ?? '') : String(v ?? '')
    }
    if (!full_name) full_name = raw['full_name'] || findByKeyword(raw, 'name', 'שם')
    if (!phone) phone = raw['phone_number'] || findByKeyword(raw, 'phone', 'טלפון')
    if (!has_experience) has_experience = findByKeyword(raw, 'ניסיון')
    if (!is_resident) is_resident = findByKeyword(raw, 'תושב')
    if (!in_sector) in_sector = findByKeyword(raw, 'בנייה', 'תשתיות')
  }

  if (Array.isArray(body.field_data) && body.field_data.length > 0) {
    const fd = parseFieldData(body.field_data)
    if (!full_name) full_name = fd['full_name'] || findByKeyword(fd, 'name', 'שם')
    if (!phone) phone = fd['phone_number'] || findByKeyword(fd, 'phone', 'טלפון')
    if (!has_experience) has_experience = findByKeyword(fd, 'ניסיון')
    if (!is_resident) is_resident = findByKeyword(fd, 'תושב')
    if (!in_sector) in_sector = findByKeyword(fd, 'בנייה', 'תשתיות')
  }

  if (!lead_id) lead_id = extractLeadgenId(body)
  const needsGraph = (!phone || !full_name) && lead_id
  if (needsGraph) {
    const fd = await fetchLeadFromGraph(lead_id)
    if (fd) {
      if (!full_name) full_name = fd['full_name'] || findByKeyword(fd, 'name', 'שם')
      if (!phone) phone = fd['phone_number'] || findByKeyword(fd, 'phone', 'טלפון')
      if (!has_experience) has_experience = findByKeyword(fd, 'ניסיון')
      if (!is_resident) is_resident = findByKeyword(fd, 'תושב')
      if (!in_sector) in_sector = findByKeyword(fd, 'בנייה', 'תשתיות')
      if (!ad_name) ad_name = fd['ad_name'] || ''
      if (!campaign_name) campaign_name = fd['campaign_name'] || ''
    }
  }

  if (!phone) {
    console.error('[incoming-kablan] Could not resolve lead data. Raw body:', JSON.stringify(body))
    await sendWhatsApp(
      OHAD_WA,
      `⚠️ נכנס ליד קבלן רשום אבל לא הצלחתי למשוך את הפרטים שלו אוטומטית (leadgen_id=${lead_id || 'חסר'}). כדאי לבדוק ידנית במנהל המודעות.`
    )
    return NextResponse.json({ ok: true, warning: 'no_phone_resolved' })
  }

  if (!full_name) full_name = '—'
  if (!has_experience) has_experience = '—'
  if (!is_resident) is_resident = '—'
  if (!in_sector) in_sector = '—'

  const phoneNorm = normalizePhone(phone)
  const now = new Date().toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' })

  // ── 1. Supabase ───────────────────────────────────────────────
  // מסומן source ייעודי, בלי followup_stage — אין רצף אוטומטי לזווית הזו (ראו הערת הקובץ).
  try {
    const supabase = createServiceClient()
    await supabase.from('leads').insert({
      full_name,
      phone: phoneNorm,
      source: 'facebook_lead_form_kablan_rashum',
      campaign_name: ad_name || campaign_name,
      notes: `ניסיון מוכח: ${has_experience} | תושב ישראל: ${is_resident} | עובד בענף הבנייה/תשתיות: ${in_sector}`,
      status: 'חדש',
      is_viewed: false,
      kablan_bot_step: (KABLAN_BOT_ENABLED && KABLAN_VIDEO_URL) ? 'awaiting_occupation' : null,
    }).select('id').maybeSingle()
    console.log('[incoming-kablan] Saved to Supabase:', full_name)
  } catch (e) {
    console.error('[incoming-kablan] Supabase exception:', e)
  }

  // ── 2. WhatsApp לאוהד (למספר האישי) ────────────────────────────
  try {
    const displayPhone = phone || phoneNorm
    const ohadMsg = [
      `🟢 *ליד חדש — קבלן רשום*`,
      ``,
      `👤 *שם:* ${full_name}`,
      `📞 *טלפון:* ${displayPhone}`,
      ``,
      `📋 *פרטים:*`,
      `• ניסיון מוכח: ${has_experience}`,
      `• תושב ישראל: ${is_resident}`,
      `• עובד בענף הבנייה/תשתיות: ${in_sector}`,
      ``,
      `📢 *מודעה:* ${ad_name || campaign_name || '—'}`,
      `🕐 ${now}`,
      phoneNorm ? `\n▶️ לחץ להשיב: https://wa.me/${phoneNorm}` : '',
    ].filter(l => l !== undefined).join('\n')

    const ohadNorm = OHAD_WA.replace(/\D/g, '')
    if (ohadNorm === phoneNorm) {
      console.error(`[incoming-kablan] SAFETY BLOCK: destination matches lead phone (${phoneNorm}).`)
    } else {
      await sendWhatsApp(OHAD_WA, ohadMsg)
      console.log('[incoming-kablan] Notified Ohad via WhatsApp')
    }
  } catch (e) {
    console.error('[incoming-kablan] WhatsApp to Ohad error:', e)
  }

  // ── 3. חימום ללקוח: בוט אינטראקטיבי (סרטון + שאלות) אם מופעל, אחרת הודעה חד-פעמית ──
  if (phoneNorm && phoneNorm.length >= 10) {
    try {
      if (KABLAN_BOT_ENABLED && KABLAN_VIDEO_URL) {
        await sendWhatsAppVideo(phoneNorm, KABLAN_VIDEO_URL, buildKablanWarmMessage(full_name))
        await sendWhatsApp(phoneNorm, 'אשמח להכיר אותך קצת לפני שנדבר — מה בדיוק העיסוק שלך?')
        console.log('[incoming-kablan] Bot conversation started for lead:', phoneNorm)
      } else {
        await sendWhatsApp(phoneNorm, buildKablanWarmMessage(full_name))
        console.log('[incoming-kablan] Warm WhatsApp sent to lead:', phoneNorm)
      }
    } catch (e) {
      console.error('[incoming-kablan] WhatsApp to lead error:', e)
    }
  }

  return NextResponse.json({ ok: true })
}
