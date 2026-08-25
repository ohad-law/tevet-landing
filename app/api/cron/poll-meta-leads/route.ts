/**
 * Vercel Cron, מריץ כל 5 דקות
 * בודק לידים חדשים מטופס נייטיב Meta → שולח WhatsApp לאוהד
 *
 * schedule מוגדר ב-vercel.json
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

const META_TOKEN   = process.env.META_ACCESS_TOKEN!
const GREEN_INSTANCE = process.env.GREEN_API_INSTANCE!
const GREEN_TOKEN  = process.env.GREEN_API_TOKEN!
const OHAD_WA      = '972542274497' // hard-coded, אסור לשנות דרך env var למניעת דליפה

// טופסים שיש לסרוק
const LEAD_FORM_ID = '2003647560270603' // v3, הפעיל

export async function GET(req: NextRequest) {
  // אימות שהקריאה מגיעה מ-Vercel Cron
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()

  // מצא את הזמן האחרון שסרקנו
  const { data: cursor } = await supabase
    .from('meta_leads_cursor')
    .select('last_leadgen_id, last_checked')
    .eq('form_id', LEAD_FORM_ID)
    .maybeSingle()

  // שלוף לידים חדשים מה-5 דקות האחרונות (או מהבדיקה הקודמת)
  const since = cursor?.last_checked
    ? Math.floor(new Date(cursor.last_checked).getTime() / 1000) - 60 // margin של דקה
    : Math.floor(Date.now() / 1000) - 300 // 5 דקות ראשונות

  const metaRes = await fetch(
    `https://graph.facebook.com/v21.0/${LEAD_FORM_ID}/leads?` +
    `fields=id,field_data,created_time,ad_id&` +
    `filtering=[{"field":"time_created","operator":"GREATER_THAN","value":"${since}"}]&` +
    `access_token=${META_TOKEN}`
  )
  const metaData = await metaRes.json()

  if (metaData.error) {
    console.error('[poll-meta-leads] Meta error:', metaData.error)
    return NextResponse.json({ error: metaData.error.message }, { status: 500 })
  }

  const newLeads: Array<Record<string, unknown>> = metaData.data ?? []
  let sent = 0

  for (const lead of newLeads) {
    const leadId = lead.id as string

    // בדוק אם כבר עיבדנו את הליד הזה
    const { data: exists } = await supabase
      .from('meta_leads_log')
      .select('id')
      .eq('leadgen_id', leadId)
      .maybeSingle()

    if (exists) continue // כבר שלחנו

    // שלוף שדות
    const fields: Record<string, string> = {}
    for (const f of (lead.field_data as Array<{ name: string; values: string[] }>) ?? []) {
      fields[f.name] = f.values?.[0] ?? ''
    }

    const name      = fields['full_name']          || 'לא צוין'
    const phone     = fields['phone_number']        || 'לא צוין'
    const years     = fields['years_worked']        || 'לא צוין'
    const sector    = fields['work_sector']         || 'לא צוין'
    const detail    = fields['work_sector_detail']  || ''
    const situation = fields['situation']           || 'לא צוין'

    const now = new Date().toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' })
    const msg = [
      `🟢 *ליד חדש, דיני עבודה*`,
      ``,
      `👤 *שם:* ${name}`,
      `📞 *טלפון:* ${phone}`,
      ``,
      `📋 *פרטים:*`,
      `• שנות עבודה: ${years}`,
      `• תחום: ${sector}${detail ? `, ${detail}` : ''}`,
      `• סיטואציה: ${situation}`,
      ``,
      `🕐 ${now}`,
      ``,
      `לחץ להתקשר: https://wa.me/${phone.replace(/\D/g, '')}`,
    ].join('\n')

    // שלח WhatsApp
    await sendWhatsApp(msg)

    // שמור ב-log כדי לא לשלוח פעמיים
    await supabase.from('meta_leads_log').insert({
      leadgen_id: leadId,
      form_id: LEAD_FORM_ID,
      name,
      phone,
      years_worked: years,
      sector,
      sector_detail: detail,
      situation,
      sent_at: new Date().toISOString(),
    })

    sent++
  }

  // עדכן cursor
  await supabase
    .from('meta_leads_cursor')
    .upsert({ form_id: LEAD_FORM_ID, last_checked: new Date().toISOString() })

  return NextResponse.json({ checked: newLeads.length, sent })
}

async function sendWhatsApp(message: string) {
  if (!GREEN_INSTANCE || !GREEN_TOKEN) {
    console.warn('[poll-meta-leads] Green API not configured')
    return
  }
  const url = `https://api.greenapi.com/waInstance${GREEN_INSTANCE}/sendMessage/${GREEN_TOKEN}`
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chatId: `${OHAD_WA}@c.us`, message }),
  })
}
