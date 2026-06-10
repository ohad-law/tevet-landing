/**
 * POST /api/webhooks/whatsapp-incoming
 * Receives incoming WhatsApp messages from Green API.
 *
 * ⚠️ סינון קפדני — מעביר לאוהד רק הודעות ממספרים שהם לידים בסופאבייס.
 * מסנן: קבוצות, מספרים לא מוכרים, הודעות ישנות, הודעות עצמיות.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { sendWhatsApp } from '@/lib/whatsapp'
import { normalizePhone } from '@/lib/base44'
import { isOptOut } from '@/lib/followup-templates'

const OHAD_WA = process.env.OHAD_WHATSAPP_NUMBER!

type LeadTable = 'leads' | 'leads_talush'

// מחפש ליד לפי טלפון בשתי הטבלאות (גם בפורמט 972 וגם 05)
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

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: true }) // Green API expects 200 always
  }

  // ── רק הודעות נכנסות ──────────────────────────────────────────
  if (body.typeWebhook !== 'incomingMessageReceived') {
    return NextResponse.json({ ok: true })
  }

  const senderData = body.senderData as Record<string, string> | undefined
  const messageData = body.messageData as Record<string, unknown> | undefined
  const timestamp = typeof body.timestamp === 'number' ? body.timestamp : 0

  if (!senderData?.chatId || !messageData) {
    return NextResponse.json({ ok: true })
  }

  const chatId = senderData.chatId

  // ── סנן קבוצות ────────────────────────────────────────────────
  if (chatId.includes('@g.us') || chatId.includes('@broadcast')) {
    return NextResponse.json({ ok: true })
  }

  // ── סנן הודעות ישנות (לפני 30 דקות) ──────────────────────────
  const thirtyMinutesAgo = Math.floor(Date.now() / 1000) - 30 * 60
  if (timestamp > 0 && timestamp < thirtyMinutesAgo) {
    return NextResponse.json({ ok: true })
  }

  const senderPhone = normalizePhone(chatId.replace('@c.us', ''))
  const ohadPhone = normalizePhone(OHAD_WA)

  // ── אל תשלח לעצמך ─────────────────────────────────────────────
  if (senderPhone === ohadPhone) {
    return NextResponse.json({ ok: true })
  }

  // ── בדוק שהשולח הוא ליד מוכר ב-Supabase ──────────────────────
  try {
    const supabase = createServiceClient()
    const lead = await findLead(supabase, senderPhone)

    if (!lead) {
      // לא ליד מוכר — לא שולחים לאוהד
      return NextResponse.json({ ok: true })
    }

    // ── טקסט ההודעה ───────────────────────────────────────────────
    const textData = messageData.textMessageData as Record<string, string> | undefined
    const msgText = textData?.textMessage || '[הודעה שאינה טקסט]'
    const leadName = lead.full_name || senderPhone
    const now = new Date().toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' })

    // ── בקשת הסרה → עצירה מלאה + אישור ─────────────────────────
    if (isOptOut(msgText)) {
      await supabase.from(lead.table)
        .update({ followup_opted_out: true, followup_stopped: true })
        .eq('id', lead.id)
      await sendWhatsApp(senderPhone, 'הוסרת מרשימת ההודעות שלנו. תודה, ובהצלחה! 🙏')
      await sendWhatsApp(OHAD_WA, `🚫 *הליד ${leadName} (${senderPhone}) ביקש הסרה* — הרובוט הופסק עבורו.`)
      return NextResponse.json({ ok: true, opted_out: true })
    }

    // ── הליד ענה → עצור את הרובוט (אוהד ממשיך ידנית) ───────────
    await supabase.from(lead.table)
      .update({ followup_stopped: true })
      .eq('id', lead.id)

    const notifyMsg = [
      `💬 *ליד ענה*`,
      ``,
      `👤 *שם:* ${leadName}`,
      `📞 *טלפון:* ${senderPhone}`,
      ``,
      `*ההודעה:*`,
      `"${msgText}"`,
      ``,
      `🕐 ${now}`,
      ``,
      `↩️ להשיב: https://wa.me/${senderPhone}`,
    ].join('\n')

    await sendWhatsApp(OHAD_WA, notifyMsg)
  } catch (e) {
    console.error('[whatsapp-incoming] Error:', e)
  }

  return NextResponse.json({ ok: true })
}
