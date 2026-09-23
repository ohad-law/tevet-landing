/**
 * POST /api/webhooks/whatsapp-incoming
 *
 * קולט מ-Green API את כל תנועת הוואטסאפ של מספר המשרד:
 * הודעות נכנסות מלידים, והודעות יוצאות (מהנייד של אוהד או מהמערכת).
 *
 * כל הודעה נשמרת ב-whatsapp_messages, כדי שהשיחה המלאה תופיע
 * בכרטיס הליד ב-CRM ואיש המכירות לא יצטרך לעבור לנייד.
 *
 * קבצים (תלושי שכר) יורדים מ-Green API, נשמרים באחסון הפרטי
 * ומצטרפים ל-uploaded_files של הליד, בדיוק כמו תלוש מדף הנחיתה.
 *
 * סינון קפדני: קבוצות, הודעות ישנות והודעות עצמיות נזרקות.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { sendWhatsApp } from '@/lib/whatsapp'
import { normalizePhone } from '@/lib/base44'
import { isOptOut } from '@/lib/followup-templates'
import { attachToLead, storeLeadFile } from '@/lib/lead-files'

const OHAD_WA = '972542274497' // hard-coded, אסור לשנות דרך env var למניעת דליפה

type LeadTable = 'leads' | 'leads_talush'
type Supa = ReturnType<typeof createServiceClient>

/** סוגי ההודעות שנושאות קובץ מצורף */
const FILE_TYPES = ['imageMessage', 'documentMessage', 'videoMessage', 'audioMessage']

/**
 * מחפש ליד לפי טלפון בשתי הטבלאות (גם בפורמט 972 וגם 05).
 *
 * 🚨 אסור להשתמש כאן ב-maybeSingle. הוא זורק שגיאה כשיותר משורה אחת
 * תואמת, ובמערכת יש לידים כפולים עם אותו טלפון. אומת בפועל 31/08/2026.
 * לוקחים את הליד החדש ביותר, כי הוא הרלוונטי לשיחה שמתנהלת עכשיו.
 */
async function findLead(supabase: Supa, phone972: string) {
  const local = '0' + phone972.slice(3)
  for (const table of ['leads', 'leads_talush'] as LeadTable[]) {
    const { data } = await supabase
      .from(table)
      .select('id, full_name, phone, uploaded_files')
      .or(`phone.eq.${phone972},phone.eq.${local}`)
      .order('created_at', { ascending: false })
      .limit(1)
    if (data && data.length > 0) return { ...data[0], table }
  }
  return null
}

// לקוח (להבדיל מליד) שביקש הסרה, עוצר בקשות ביקורת עתידיות על כל תיקיו
async function optOutClientReviews(supabase: Supa, phone972: string) {
  const local = '0' + phone972.slice(3)
  const { data: client } = await supabase
    .from('clients')
    .select('id')
    .or(`phone.eq.${phone972},phone.eq.${local}`)
    .maybeSingle()
  if (!client) return

  await supabase.from('cases').update({ review_opted_out: true }).eq('client_id', client.id)
  await sendWhatsApp(phone972, 'הוסרת מרשימת ההודעות שלנו. תודה, ובהצלחה! 🙏')
}

/**
 * שולף את הטקסט ואת פרטי הקובץ מתוך המבנה של Green API.
 * כל סוג הודעה יושב בשדה אחר, ולכן צריך את הפיצול הזה.
 */
function extractMessage(messageData: Record<string, unknown>) {
  const type = String(messageData.typeMessage || '')

  if (type === 'textMessage') {
    const d = messageData.textMessageData as Record<string, string> | undefined
    return { text: d?.textMessage || '', file: null }
  }

  if (type === 'extendedTextMessage') {
    const d = messageData.extendedTextMessageData as Record<string, string> | undefined
    return { text: d?.text || '', file: null }
  }

  if (FILE_TYPES.includes(type)) {
    const d = messageData.fileMessageData as Record<string, string> | undefined
    if (d?.downloadUrl) {
      return {
        text: d.caption || '',
        file: {
          url: d.downloadUrl,
          name: d.fileName || 'קובץ',
          mime: d.mimeType || 'application/octet-stream',
        },
      }
    }
  }

  return { text: '[הודעה שאינה טקסט]', file: null }
}

/**
 * מוריד קובץ מ-Green API ושומר אותו באחסון הפרטי.
 * מחזיר את הנתיב ואת הקישור החתום, או null אם נכשל.
 *
 * קובץ של ליד מוכר נשמר תחת מזהה הליד, כדי שיישב יחד עם
 * התלושים שהגיעו מדף הנחיתה. קובץ ממספר לא מוכר נשמר בנפרד.
 */
async function storeFile(
  supabase: Supa,
  folder: string,
  file: { url: string; name: string; mime: string }
): Promise<{ path: string; url: string | null } | null> {
  try {
    const res = await fetch(file.url)
    if (!res.ok) {
      console.error('[whatsapp] הורדת הקובץ נכשלה:', res.status)
      return null
    }
    const buf = Buffer.from(await res.arrayBuffer())
    return storeLeadFile(supabase, folder, buf, file.name, file.mime, '[whatsapp]')
  } catch (e) {
    console.error('[whatsapp] שמירת הקובץ נכשלה:', e)
    return null
  }
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: true }) // Green API expects 200 always
  }

  const hook = String(body.typeWebhook || '')
  const isIncoming = hook === 'incomingMessageReceived'
  const isOutgoing = hook === 'outgoingMessageReceived' || hook === 'outgoingAPIMessageReceived'

  // רק הודעות אמיתיות, בשני הכיוונים
  if (!isIncoming && !isOutgoing) {
    return NextResponse.json({ ok: true })
  }

  const senderData = body.senderData as Record<string, string> | undefined
  const messageData = body.messageData as Record<string, unknown> | undefined
  const timestamp = typeof body.timestamp === 'number' ? body.timestamp : 0

  if (!senderData?.chatId || !messageData) {
    return NextResponse.json({ ok: true })
  }

  const chatId = senderData.chatId

  // סנן קבוצות
  if (chatId.includes('@g.us') || chatId.includes('@broadcast')) {
    return NextResponse.json({ ok: true })
  }

  // סנן הודעות ישנות (לפני 30 דקות)
  const thirtyMinutesAgo = Math.floor(Date.now() / 1000) - 30 * 60
  if (timestamp > 0 && timestamp < thirtyMinutesAgo) {
    return NextResponse.json({ ok: true })
  }

  // בשני הכיוונים chatId הוא תמיד הצד השני, כלומר הליד
  const leadPhone = normalizePhone(chatId.replace('@c.us', ''))
  const ohadPhone = normalizePhone(OHAD_WA)

  // שיחה של אוהד עם עצמו, לא רלוונטית
  if (leadPhone === ohadPhone) {
    return NextResponse.json({ ok: true })
  }

  try {
    const supabase = createServiceClient()
    const lead = await findLead(supabase, leadPhone)

    const { text, file } = extractMessage(messageData)

    // 🚨 מינימיזציה: שומרים אך ורק התכתבות עם ליד של המשרד.
    //
    // מספר המשרד משמש גם לעסקים אחרים של אוהד (שירכו), ובלי החסם
    // הזה התכתבות של לקוחות עסק אחר נכנסת לבסיס הנתונים של משרד
    // עורכי הדין. זו בדיוק ההפרדה שתיקון 13 דורש. נקבע 29/08/2026.
    //
    // המחיר המודע: מי שכותב למספר המשרד בלי להיות ליד רשום, השיחה
    // איתו לא תתועד עד שייפתח לו ליד. היא עדיין נמצאת בוואטסאפ עצמו.
    if (!lead) {
      // לקוח שסגר תיק ומבקש הסרה מבקשות ביקורת. מטופל בלי לשמור כלום.
      if (isIncoming && isOptOut(text)) {
        await optOutClientReviews(supabase, leadPhone)
      }
      return NextResponse.json({ ok: true, skipped: 'לא ליד של המשרד' })
    }

    // קובץ מצורף: להוריד, לשמור, ולצרף לליד
    let bodyText = text
    if (file) {
      // הקובץ נשמר תחת מזהה הליד, ולכן יושב יחד עם תלושים שהגיעו
      // מדף הנחיתה. שם התיקייה חייב להיות באנגלית, ראה safeStorageName.
      const stored = await storeFile(supabase, String(lead.id), file)
      if (stored) {
        // מבנה קבוע שה-CRM יודע לפרק: סמן, שם הקובץ, קישור, ואז הכיתוב.
        // כך אפשר להציג את הקובץ ככפתור לחיץ במקום כטקסט.
        bodyText = `📎 ${file.name}\n${stored.url ?? ''}${text ? '\n' + text : ''}`
        await attachToLead(supabase, lead.table, String(lead.id), lead.uploaded_files, stored)
      } else {
        bodyText = `📎 ${file.name} (השמירה נכשלה)${text ? '\n' + text : ''}`
      }
    }

    // שמירת ההודעה לשיחה. טריגר בבסיס הנתונים משייך אותה לליד לפי הטלפון.
    try {
      await supabase.from('whatsapp_messages').insert({
        phone: leadPhone,
        direction: isIncoming ? 'נכנסת' : 'יוצאת',
        body: bodyText || '[הודעה ריקה]',
        provider_message_id: (body.idMessage as string) || null,
        sent_by: isIncoming
          ? null
          : hook === 'outgoingAPIMessageReceived'
            ? 'מערכת אוטומטית'
            : 'נשלח מהנייד',
        is_read: isOutgoing, // הודעה שיצאה מאיתנו כבר נקראה מעצם השליחה
      })
    } catch (e) {
      console.error('[whatsapp] שמירת ההודעה נכשלה:', e)
    }

    // מכאן והלאה: תגובות שרלוונטיות רק להודעה שהליד שלח.
    // הודעה יוצאת לעולם לא מפעילה הסרה ולא עוצרת את הרובוט.
    if (!isIncoming) {
      return NextResponse.json({ ok: true, logged: true })
    }

    // בקשת הסרה, עצירה מלאה ואישור לליד.
    // אין התראה לאוהד (לבקשתו), הרעש מיותר; ההודעה ממילא נכנסת לצאט שלו.
    if (isOptOut(text)) {
      await supabase.from(lead.table)
        .update({ followup_opted_out: true, followup_stopped: true })
        .eq('id', lead.id)
      await sendWhatsApp(leadPhone, 'הוסרת מרשימת ההודעות שלנו. תודה, ובהצלחה! 🙏')
      return NextResponse.json({ ok: true, opted_out: true })
    }

    // הליד ענה, עוצרים את הרובוט (אוהד ממשיך ידנית).
    // ללא התראת "ליד ענה" לאוהד (לבקשתו): הרובוט רץ על המספר שלו,
    // כך שתשובת הליד נכנסת ממילא ישירות לצאט שלו בוואטסאפ.
    await supabase.from(lead.table)
      .update({ followup_stopped: true })
      .eq('id', lead.id)
  } catch (e) {
    console.error('[whatsapp] שגיאה:', e)
  }

  return NextResponse.json({ ok: true })
}
