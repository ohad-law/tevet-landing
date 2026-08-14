/**
 * POST /api/leads/kablan-landing-page
 * נקרא ישירות מהטופס בדף הנחיתה של קבלן רשום (public/kablan-rashum.html).
 * ציבורי בכוונה (בלי סוד וובהוק) — נקרא מדפדפן הלקוח.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { normalizePhone } from '@/lib/base44'
import { sendWhatsApp } from '@/lib/whatsapp'

const OHAD_WA = '972542274497'

export async function POST(req: NextRequest) {
  let body: Record<string, any>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const full_name = (body.full_name || '').toString().trim()
  const phone = (body.phone || '').toString().trim()
  const email = (body.email || '').toString().trim()
  const notes = (body.notes || '').toString().trim()

  if (!full_name || !phone) {
    return NextResponse.json({ error: 'missing_required_fields' }, { status: 400 })
  }

  const phoneNorm = normalizePhone(phone)
  const now = new Date().toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' })

  try {
    const supabase = createServiceClient()
    await supabase.from('leads').insert({
      full_name,
      phone: phoneNorm,
      source: 'kablan_rashum_landing_page',
      campaign_name: 'דף נחיתה - קבלן רשום',
      notes: [email ? `אימייל: ${email}` : null, notes || null].filter(Boolean).join(' | ') || null,
      product_line: 'קבלן רשום',
      status: 'חדש',
      is_viewed: false,
    })
    console.log('[kablan-landing-page] Saved to Supabase:', full_name)
  } catch (e) {
    console.error('[kablan-landing-page] Supabase exception:', e)
  }

  void notifyOhad()
  return NextResponse.json({ ok: true })

  async function notifyOhad() {
    try {
      const ohadMsg = [
        `🟢 *ליד חדש — דף נחיתה קבלן רשום*`,
        ``,
        `👤 *שם:* ${full_name}`,
        `📞 *טלפון:* ${phone}`,
        email ? `✉️ *אימייל:* ${email}` : undefined,
        notes ? `📝 *הערות:* ${notes}` : undefined,
        ``,
        `🕐 ${now}`,
        phoneNorm ? `\n▶️ לחץ להשיב: https://wa.me/${phoneNorm}` : '',
      ].filter((l) => l !== undefined).join('\n')

      const ohadNorm = OHAD_WA.replace(/\D/g, '')
      if (ohadNorm === phoneNorm) {
        console.error(`[kablan-landing-page] SAFETY BLOCK: destination matches lead phone (${phoneNorm}).`)
      } else {
        await sendWhatsApp(OHAD_WA, ohadMsg)
        console.log('[kablan-landing-page] Notified Ohad via WhatsApp')
      }
    } catch (e) {
      console.error('[kablan-landing-page] WhatsApp to Ohad error:', e)
    }
  }
}
