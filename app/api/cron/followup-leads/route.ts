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
import { sendWhatsApp } from '@/lib/whatsapp'
import { buildFollowupMessage, buildWarmMessage, daysUntilNextFollowup } from '@/lib/followup-templates'

const DAILY_CAP = 30 // תקרת הודעות יומית, הגנה על המספר
const PACE_MS = 4000 // מרווח בין הודעות (קצב אנושי)
const OHAD_PHONE = (process.env.OHAD_WHATSAPP_NUMBER || process.env.OHAD_WHATSAPP || '972542274497').replace(/\D/g, '')

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

  for (const lead of due) {
    if (sent >= DAILY_CAP) {
      console.log('[followup] Daily cap reached, deferring rest to tomorrow')
      break
    }

    const phoneNorm = (lead.phone ?? '').replace(/\D/g, '')
    if (phoneNorm.length < 10) { skipped++; continue }
    // הגנה קריטית: אסור לשלוח הודעות פולואפ למספר של אוהד
    if (phoneNorm === OHAD_PHONE) {
      console.error(`[followup] SAFETY BLOCK: lead phone matches Ohad's number (${phoneNorm}). Skipping.`)
      skipped++; continue
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

  console.log(`[followup] Done. sent=${sent}, skipped=${skipped}`)
  return NextResponse.json({ due: due.length, sent, skipped })
}
