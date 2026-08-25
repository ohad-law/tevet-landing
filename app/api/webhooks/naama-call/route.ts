/**
 * POST /api/webhooks/naama-call
 * נקרא ע"י ElevenLabs בסיום שיחה של נעמה, הסוכנת הטלפונית של המשרד.
 *
 * היעד הוא ה-CRM החי בלבד (tevet-crm על Supabase). BASE44 נטוש מ-25/07/2026.
 *
 * זרימה:
 *  0. אימות סוד + ודא שזו נעמה בלבד (PayrollAI-Adi יושבת באותו חשבון, לא לערבב!)
 *  1. סינון שיחות ריקות/קצרות, לא יוצרים ליד זבל
 *  2. חילוץ מה שנעמה אספה (data_collection) + הטלפון מתוך ה-metadata של השיחה
 *  3. קביעת חם/קר
 *  4. עדכון/יצירת ליד לפי טלפון (הליד לרוב כבר קיים מהפייסבוק)
 *  5. פתיחת משימת "שיחה חוזרת" דחופה, מקושרת לליד
 *  6. הודעת WhatsApp לאוהד עם סיכום השיחה ושעת החזרה
 *
 * ⚠️ גרסה 1: לא נשלחת שום הודעה אוטומטית ללקוח (החלטת אוהד, קודם מאמתים שהצינור עובד).
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { normalizePhone } from '@/lib/base44'
import { sendWhatsApp } from '@/lib/whatsapp'

// מספר קשיח בכוונה, משתנה הסביבה היה שגוי בעבר וגרם לדליפת פרטי לידים
// למספר לא נכון. אותה גישה כמו בשאר נתיבי ההתראות.
const OHAD_WA = '972542274497'
const WEBHOOK_SECRET = process.env.NAAMA_WEBHOOK_SECRET!

// מזהה הסוכן של המשרד (נעמה). כל שיחה מ-agent אחר (למשל PayrollAI-Adi) נדחית.
const NAAMA_AGENT_ID = 'agent_8301kwkt7tmaffpsyb6c4sqsfv8m'

// שיחה אמיתית מינימלית, מתחת לזה זו טעות חיוג / ניתוק, לא יוצרים ליד.
const MIN_TURNS = 4
const MIN_DURATION_SECS = 25

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DC = Record<string, { value?: any; rationale?: string }>

// מחזיר ערך טקסט משדה data_collection של ElevenLabs
function dcStr(dc: DC, key: string): string {
  const v = dc?.[key]?.value
  if (v === undefined || v === null) return ''
  return String(v).trim()
}

// מחזיר ערך בוליאני (ElevenLabs עשוי להחזיר boolean אמיתי או מחרוזת "true"/"כן")
function dcBool(dc: DC, key: string): boolean | null {
  const v = dc?.[key]?.value
  if (v === undefined || v === null || v === '') return null
  if (typeof v === 'boolean') return v
  const s = String(v).toLowerCase().trim()
  if (['true', 'yes', 'כן', '1'].includes(s)) return true
  if (['false', 'no', 'לא', '0'].includes(s)) return false
  return null
}

export async function POST(req: NextRequest) {
  // ── 0. אימות ──────────────────────────────────────────────────
  // ElevenLabs מאפשר להוסיף את הסוד כפרמטר בכתובת ה-webhook או ככותרת.
  const secret =
    req.nextUrl.searchParams.get('secret')?.trim() ||
    req.headers.get('x-webhook-secret')?.trim()
  if (WEBHOOK_SECRET && secret !== WEBHOOK_SECRET) {
    console.warn('[naama] Unauthorized request')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let payload: Record<string, any>
  try {
    payload = JSON.parse(await req.text())
  } catch (e) {
    console.error('[naama] Invalid JSON:', e instanceof Error ? e.message : String(e))
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // מבנה ElevenLabs: { type, event_timestamp, data: {...} }
  const data = payload.data ?? payload
  const agentId: string = data.agent_id ?? ''
  const conversationId: string = data.conversation_id ?? ''

  // ── ודא שזו נעמה ולא סוכן אחר באותו חשבון ─────────────────────
  if (agentId && agentId !== NAAMA_AGENT_ID) {
    console.log(`[naama] Ignoring call from other agent: ${agentId}`)
    return NextResponse.json({ ok: true, ignored: 'other_agent' })
  }

  // ── 1. סינון שיחות ריקות/קצרות ────────────────────────────────
  const transcript: Array<{ role?: string; message?: string }> = data.transcript ?? []
  const realTurns = transcript.filter(t => (t.message ?? '').trim().length > 0).length
  const durationSecs: number =
    data.metadata?.call_duration_secs ?? data.metadata?.call_duration ?? 0

  if (realTurns < MIN_TURNS || durationSecs < MIN_DURATION_SECS) {
    console.log(`[naama] Skipping short/empty call (turns=${realTurns}, dur=${durationSecs}s)`)
    return NextResponse.json({ ok: true, skipped: 'too_short' })
  }

  // ── 2. חילוץ נתונים ───────────────────────────────────────────
  const analysis = data.analysis ?? {}
  const dc: DC = analysis.data_collection_results ?? {}
  const dynVars = data.conversation_initiation_client_data?.dynamic_variables ?? {}

  // טלפון: קודם המספר האמיתי שנעמה חייגה אליו, גיבוי מה-data_collection
  const rawPhone =
    data.metadata?.phone_call?.external_number ||
    data.metadata?.phone_call?.to_number ||
    dcStr(dc, 'phone') ||
    dynVars.phone ||
    ''
  if (!rawPhone) {
    console.error('[naama] No phone found. conv=', conversationId)
    await sendWhatsApp(
      OHAD_WA,
      `⚠️ נעמה סיימה שיחה אבל לא הצלחתי לזהות את מספר הלקוח (conv=${conversationId}). כדאי לבדוק ידנית ב-ElevenLabs.`
    )
    return NextResponse.json({ ok: true, warning: 'no_phone' })
  }
  const phoneNorm = normalizePhone(rawPhone)

  const leadName = dcStr(dc, 'lead_name') || dynVars.lead_name || 'לא צוין'
  const yearsWorked = dcStr(dc, 'years_worked')
  const stillEmployed = dcBool(dc, 'still_employed')
  const daysPerWeek = dcStr(dc, 'days_per_week')
  const hoursPerDay = dcStr(dc, 'hours_per_day')
  const grossSalary = dcStr(dc, 'gross_salary')
  const cashPortion = dcStr(dc, 'cash_portion')
  const hasPayslips = dcBool(dc, 'has_payslips')
  const leftWhen = dcStr(dc, 'left_when')
  const hasLawyer = dcBool(dc, 'has_lawyer')
  const callbackTime = dcStr(dc, 'callback_time')
  const summary = dcStr(dc, 'summary') || analysis.transcript_summary || ''

  // ── 3. חם/קר ──────────────────────────────────────────────────
  // ברירת מחדל: אם נעמה סימנה qualified נשתמש בזה. בנוסף פוסלים במקרים חד-משמעיים.
  const qualifiedByAgent = dcBool(dc, 'qualified')
  let isHot = qualifiedByAgent === null ? true : qualifiedByAgent
  const coldReasons: string[] = []
  if (hasLawyer === true) { isHot = false; coldReasons.push('כבר יש עורך דין') }
  if (leftWhen && /7|שבע/.test(leftWhen) && /שנ/.test(leftWhen)) {
    isHot = false; coldReasons.push('מעל 7 שנים מהעזיבה (התיישנות)')
  }
  const coldReason = coldReasons.join(', ')

  // ── בניית תיאור מרוכז ─────────────────────────────────────────
  const now = new Date().toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' })
  const today = new Date().toISOString().split('T')[0]
  const detailLines = [
    yearsWorked ? `• ותק: ${yearsWorked}` : '',
    stillEmployed !== null ? `• עדיין עובד: ${stillEmployed ? 'כן' : 'לא'}` : '',
    (daysPerWeek || hoursPerDay) ? `• היקף: ${daysPerWeek || '?'} ימים / ${hoursPerDay || '?'} שעות ביום` : '',
    grossSalary ? `• ברוטו: ${grossSalary}` : '',
    cashPortion ? `• חלק במזומן: ${cashPortion}` : '',
    hasPayslips !== null ? `• תלושי שכר: ${hasPayslips ? 'יש' : 'אין'}` : '',
    leftWhen ? `• מתי עזב: ${leftWhen}` : '',
    hasLawyer !== null ? `• עו"ד קיים: ${hasLawyer ? 'כן' : 'לא'}` : '',
  ].filter(Boolean)

  const notes = [
    `📞 שיחת נעמה (AI), ${now}`,
    isHot ? '🔥 חם, מבקש שיחה חוזרת' : `❄️ לא רלוונטי${coldReason ? ` (${coldReason})` : ''}`,
    callbackTime ? `• שעת חזרה מבוקשת: ${callbackTime}` : '',
    ...detailLines,
    summary ? `\nסיכום: ${summary}` : '',
    conversationId ? `\nElevenLabs conv: ${conversationId}` : '',
  ].filter(Boolean).join('\n')

  // סטטוסים חייבים להיות מהערכים שה-CRM (tevet-crm) מכיר: חדש / יצר קשר / לא רלוונטי / הומרו.
  // ערך חופשי לא ייתפס בפילטרים ובלוחות של המערכת.
  const statusHot = 'יצר קשר'
  const statusCold = 'לא רלוונטי'

  // ── 4. הליד ב-CRM (tevet-crm / Supabase), עדכון אם קיים, אחרת יצירה ──
  let leadId: string | null = null
  try {
    const supabase = createServiceClient()
    const { data: existing } = await supabase
      .from('leads')
      .select('id')
      .eq('phone', phoneNorm)
      .limit(1)
      .maybeSingle()

    const leadRow = {
      full_name: leadName !== 'לא צוין' ? leadName : undefined,
      phone: phoneNorm,
      source: 'naama_ai_call',
      status: isHot ? statusHot : statusCold,
      notes,
      is_viewed: false,
      // v1: לא מכניסים לרצף פולואפ אוטומטי, אוהד מחזיר ידנית לפי המשימה.
    }

    if (existing?.id) {
      leadId = existing.id
      await supabase.from('leads').update(leadRow).eq('id', existing.id)
      console.log('[naama] Updated existing lead:', existing.id)
    } else {
      const { data: created } = await supabase
        .from('leads')
        .insert({ ...leadRow, full_name: leadName, followup_stage: 0 })
        .select('id')
        .single()
      leadId = created?.id ?? null
      console.log('[naama] Inserted new lead:', leadName)
    }
  } catch (e) {
    console.error('[naama] Supabase exception:', e)
  }

  // ── 5. משימת "שיחה חוזרת" לאוהד (רק לליד חם) ──────────────────
  // עדיפות "דחוף", כך המשימה נכנסת לווידג'ט המשימות הדחופות בדשבורד.
  if (isHot) {
    const desc =
      `שיחה חוזרת: ${leadName} (${rawPhone})` +
      (callbackTime ? `, מבקש חזרה ${callbackTime}` : '') +
      ' | סונן ע"י נעמה'

    try {
      const supabase = createServiceClient()
      await supabase.from('tasks').insert({
        description: `${desc}\n\n${notes}`,
        priority: 'דחוף',
        status: 'לביצוע',
        due_date: today,
        ...(leadId ? { lead_id: leadId } : {}),
      })
      console.log('[naama] Callback task created')
    } catch (e) {
      console.error('[naama] Task exception:', e)
    }
  }

  // ── 6. הודעת WhatsApp לאוהד ───────────────────────────────────
  try {
    const header = isHot ? '🔥 *ליד חם משיחת נעמה*' : '❄️ *נעמה סיננה ליד (לא רלוונטי)*'
    const ohadMsg = [
      header,
      ``,
      `👤 *שם:* ${leadName}`,
      `📞 *טלפון:* ${rawPhone}`,
      callbackTime ? `⏰ *מבקש חזרה:* ${callbackTime}` : '',
      !isHot && coldReason ? `🚫 *סיבה:* ${coldReason}` : '',
      ``,
      detailLines.length ? `📋 *פרטים:*\n${detailLines.join('\n')}` : '',
      summary ? `\n📝 *סיכום נעמה:*\n${summary}` : '',
      ``,
      `🕐 ${now}`,
      phoneNorm ? `▶️ להשיב בוואטסאפ: https://wa.me/${phoneNorm}` : '',
      phoneNorm ? `📱 להתקשר: tel:+${phoneNorm}` : '',
      // קישור ישיר להקלטה ולתמלול המלא בקונסולה של ElevenLabs
      conversationId
        ? `🎧 להאזין לשיחה: https://elevenlabs.io/app/conversational-ai/history/${conversationId}`
        : '',
    ].filter(Boolean).join('\n')

    await sendWhatsApp(OHAD_WA, ohadMsg)
    console.log('[naama] Notified Ohad')
  } catch (e) {
    console.error('[naama] WhatsApp to Ohad error:', e)
  }

  return NextResponse.json({ ok: true, hot: isHot, conversation_id: conversationId })
}
