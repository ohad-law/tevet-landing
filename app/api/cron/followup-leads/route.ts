/**
 * Vercel Cron, שעון הפולואפ האוטומטי (רץ פעם ביום)
 *
 * שולף לידים שלא ענו ומגיע להם פולואפ, שולח את ההודעה המתאימה לשלב,
 * ומקדם אותם ברצף. עוצר אוטומטית בשלב 3 (מיצוי), או קודם אם הליד ענה
 * / סומן "בטיפול" / ביקש הסרה (השדות מתעדכנים במקומות אחרים).
 *
 * schedule מוגדר ב-vercel.json
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { sendWhatsApp, hasWhatsApp, outgoingHealth } from '@/lib/whatsapp'
import { buildFollowupMessage, buildWarmMessage, daysUntilNextFollowup } from '@/lib/followup-templates'

const DAILY_CAP = 30 // תקרת הודעות יומית, הגנה על המספר
const PACE_MS = 4000 // מרווח בין הודעות (קצב אנושי)
const OHAD_PHONE = (process.env.OHAD_WHATSAPP_NUMBER || process.env.OHAD_WHATSAPP || '972542274497').replace(/\D/g, '')
const OFFICE_PHONE = '972515937329' // המספר ששולח, לעולם לא לשלוח לעצמנו

type Table = 'leads' | 'leads_talush'

interface DueLead {
  id: string
  full_name: string | null
  phone: string | null
  followup_stage: number
  situationText: string
  table: Table
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

export async function GET(req: NextRequest) {
  // אימות שהקריאה מגיעה מ-Vercel Cron
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const nowIso = new Date().toISOString()

  // ── בלם חירום: האם המספר עדיין מוסר הודעות? ──────────────────
  // כשמטא מסמנת את המספר, ה-API ממשיך להחזיר "נשלח" בזמן שההודעות נבלעות.
  // להמשיך לשלוח במצב הזה רק מעמיק את הבור. לכן אם אף הודעה מהיממה
  // האחרונה לא הגיעה בפועל, עוצרים את הריצה ומתריעים לאוהד.
  const health = await outgoingHealth(1440)
  if (!health.healthy) {
    console.error(`[followup] HALTED: ${health.checked} outgoing messages, none delivered. Suspected block.`)
    await sendWhatsApp(OHAD_PHONE, [
      '🚨 הרובוט עצר את עצמו',
      '',
      `${health.checked} הודעות נשלחו ביממה האחרונה ואף אחת לא נמסרה.`,
      'זה הסימן של חסימה שקטה מצד מטא. הפולואפים מושהים עד לבדיקה.',
      '',
      'אל תשלח הודעות בכמות מהמספר הזה עד שנבדוק.',
    ].join('\n'))
    return NextResponse.json({ halted: true, reason: 'delivery_failure', health })
  }

  // ── שלוף לידים שמגיע להם פולואפ ─────────────────────────────
  const due: DueLead[] = []

  const { data: leads } = await supabase
    .from('leads')
    .select('id, full_name, phone, followup_stage, notes')
    .eq('status', 'חדש')
    .eq('followup_stopped', false)
    .eq('followup_opted_out', false)
    .lt('followup_stage', 3)
    .lte('followup_next_at', nowIso)
  for (const l of leads ?? []) {
    due.push({
      id: l.id, full_name: l.full_name, phone: l.phone,
      followup_stage: l.followup_stage ?? 0,
      situationText: l.notes ?? '', table: 'leads',
    })
  }

  const { data: talush } = await supabase
    .from('leads_talush')
    .select('id, full_name, phone, followup_stage, issue_description')
    .eq('status', 'חדש')
    .eq('followup_stopped', false)
    .eq('followup_opted_out', false)
    .lt('followup_stage', 3)
    .lte('followup_next_at', nowIso)
  for (const l of talush ?? []) {
    due.push({
      id: l.id, full_name: l.full_name, phone: l.phone,
      followup_stage: l.followup_stage ?? 0,
      situationText: l.issue_description || 'שכר', table: 'leads_talush',
    })
  }

  console.log(`[followup] Due leads: ${due.length}`)

  // ── שלח ועדכן ───────────────────────────────────────────────
  let sent = 0
  let skipped = 0
  const noWhatsApp: string[] = []

  for (const lead of due) {
    if (sent >= DAILY_CAP) {
      console.log('[followup] Daily cap reached, deferring rest to tomorrow')
      break
    }

    const phoneNorm = (lead.phone ?? '').replace(/\D/g, '')
    if (phoneNorm.length < 10) { skipped++; continue }
    // הגנה קריטית: אסור לשלוח הודעות פולואפ למספר של אוהד
    if (phoneNorm === OHAD_PHONE || phoneNorm === OFFICE_PHONE) {
      console.error(`[followup] SAFETY BLOCK: lead phone matches Ohad's number (${phoneNorm}). Skipping.`)
      skipped++; continue
    }

    // אין וואטסאפ למספר? לא לשלוח, ובעיקר לא לנסות שוב מחר.
    // שליחה חוזרת למספרים שלא קיימים היא סימן ספאם מובהק אצל מטא.
    // הליד לא הולך לאיבוד: הוא יוצא מהרצף האוטומטי ונכנס לרשימת חיוג לאוהד.
    if (!(await hasWhatsApp(phoneNorm))) {
      console.log(`[followup] No WhatsApp account for ${phoneNorm}. Removing from sequence.`)
      noWhatsApp.push(`${lead.full_name || 'ללא שם'}: ${phoneNorm}`)
      await supabase.from(lead.table)
        .update({ followup_stopped: true, followup_next_at: null })
        .eq('id', lead.id)
      skipped++
      continue
    }

    // שלב -1 = ליד משוחזר שלא קיבל חימום → שלח חימום והכנס לרצף הרגיל.
    // שלב 0-2 = פולואפ רגיל (שלב הבא ברצף).
    let message: string | null
    let newStage: number
    let nextDays: number | null
    if (lead.followup_stage === -1) {
      message = buildWarmMessage(lead.full_name, lead.situationText)
      newStage = 0
      nextDays = 3 // יום 3 אחרי החימום
    } else {
      const stageToSend = lead.followup_stage + 1
      message = buildFollowupMessage(stageToSend, lead.full_name)
      newStage = stageToSend
      nextDays = daysUntilNextFollowup(stageToSend)
    }
    if (!message) { skipped++; continue }

    const ok = await sendWhatsApp(phoneNorm, message)
    if (!ok) {
      console.error(`[followup] Send failed for ${lead.table}/${lead.id}`)
      skipped++
      continue
    }

    // עדכן מצב: קדם שלב, קבע את הפולואפ הבא (או עצור אם מיצינו)
    const update: Record<string, unknown> = {
      followup_stage: newStage,
      last_followup_at: new Date().toISOString(),
    }
    if (nextDays === null) {
      update.followup_stopped = true // הגענו לשלב 3, סיימנו את הרצף
      update.followup_next_at = null
    } else {
      update.followup_next_at = new Date(Date.now() + nextDays * 24 * 60 * 60 * 1000).toISOString()
    }

    await supabase.from(lead.table).update(update).eq('id', lead.id)
    sent++

    if (sent < due.length && sent < DAILY_CAP) await sleep(PACE_MS)
  }

  // מי שאין לו וואטסאפ צריך טלפון, לא הודעה
  if (noWhatsApp.length > 0) {
    await sendWhatsApp(OHAD_PHONE, [
      '📞 לידים בלי וואטסאפ, צריך לחייג',
      '',
      ...noWhatsApp,
      '',
      'הם הוצאו מרצף הפולואפ האוטומטי.',
    ].join('\n'))
  }

  console.log(`[followup] Done. sent=${sent}, skipped=${skipped}, noWhatsApp=${noWhatsApp.length}`)
  return NextResponse.json({ due: due.length, sent, skipped, noWhatsApp: noWhatsApp.length })
}
