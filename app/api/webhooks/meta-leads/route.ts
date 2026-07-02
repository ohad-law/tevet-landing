/**
 * Meta Lead Ads Webhook
 * מקבל ליד חדש מטפסי נייטיב → שולח WhatsApp לאוהד
 *
 * GET  — אימות הـwebhook ע"י Meta (נקרא פעם אחת בהגדרה)
 * POST — ליד חדש נכנס
 */
import { NextRequest, NextResponse } from 'next/server'

const META_TOKEN = process.env.META_ACCESS_TOKEN!
const VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN ?? 'tevet-leads-2026'
const GREEN_INSTANCE = process.env.GREEN_API_INSTANCE!   // מספר instance — למשל 7105435035
const GREEN_TOKEN = process.env.GREEN_API_TOKEN!         // API token מ-greenapi.com
const OHAD_WA = '972542274497' // hard-coded — אסור לשנות דרך env var למניעת דליפה

// ─── GET — Meta webhook verification ──────────────────────────────────────────
export async function GET(req: NextRequest) {
  const mode      = req.nextUrl.searchParams.get('hub.mode')
  const token     = req.nextUrl.searchParams.get('hub.verify_token')
  const challenge = req.nextUrl.searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('[meta-leads] Webhook verified ✓')
    return new NextResponse(challenge, { status: 200 })
  }
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

// ─── POST — ליד חדש נכנס ──────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'bad json' }, { status: 400 })
  }

  const entries = (body.entry as Array<Record<string, unknown>>) ?? []

  for (const entry of entries) {
    const changes = (entry.changes as Array<Record<string, unknown>>) ?? []
    for (const change of changes) {
      if (change.field !== 'leadgen') continue
      const val = change.value as Record<string, unknown>
      const leadgenId = val.leadgen_id as string
      if (!leadgenId) continue

      // בצע async — אל תחסום את ה-response
      processLead(leadgenId).catch(err =>
        console.error('[meta-leads] processLead error:', err)
      )
    }
  }

  // Meta מצפה ל-200 מיידי
  return NextResponse.json({ ok: true })
}

// ─── עיבוד הליד ───────────────────────────────────────────────────────────────
async function processLead(leadgenId: string) {
  // שלב 1: משוך פרטי ליד מ-Meta
  const metaRes = await fetch(
    `https://graph.facebook.com/v21.0/${leadgenId}?fields=id,field_data,created_time,ad_id,adset_id,campaign_id&access_token=${META_TOKEN}`
  )
  const lead = await metaRes.json()

  if (lead.error) {
    console.error('[meta-leads] Meta API error:', lead.error)
    return
  }

  // שלב 2: בנה מפה של שדות
  const fields: Record<string, string> = {}
  for (const f of (lead.field_data ?? []) as Array<{ name: string; values: string[] }>) {
    fields[f.name] = f.values?.[0] ?? ''
  }

  const name     = fields['full_name']     || fields['שם מלא']     || '—'
  const phone    = fields['phone_number']  || fields['טלפון']       || '—'
  const years    = fields['years_worked']  || '—'
  const sector   = fields['work_sector']   || '—'
  const detail   = fields['work_sector_detail'] || ''
  const situation= fields['situation']     || '—'

  // שלב 3: בנה הודעת WhatsApp
  const now = new Date().toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' })
  const msg = [
    `🟢 *ליד חדש — דיני עבודה*`,
    ``,
    `👤 *שם:* ${name}`,
    `📞 *טלפון:* ${phone}`,
    ``,
    `📋 *פרטים:*`,
    `• שנות עבודה: ${years}`,
    `• תחום: ${sector}${detail ? ` — ${detail}` : ''}`,
    `• סיטואציה: ${situation}`,
    ``,
    `🕐 ${now}`,
    ``,
    `לחץ להתקשר: https://wa.me/${phone.replace(/\D/g, '')}`,
  ].join('\n')

  // שלב 4: שלח WhatsApp דרך Green API
  await sendWhatsApp(msg)
}

async function sendWhatsApp(message: string) {
  if (!GREEN_INSTANCE || !GREEN_TOKEN) {
    console.warn('[meta-leads] Green API not configured — skipping WhatsApp')
    return
  }

  const url = `https://api.greenapi.com/waInstance${GREEN_INSTANCE}/sendMessage/${GREEN_TOKEN}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chatId: `${OHAD_WA}@c.us`,
      message,
    }),
  })

  const data = await res.json()
  if (!res.ok) {
    console.error('[meta-leads] Green API error:', data)
  } else {
    console.log('[meta-leads] WhatsApp sent ✓', data.idMessage)
  }
}
