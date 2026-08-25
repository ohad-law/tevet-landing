/**
 * Vercel Cron, דוח פולואפ כל 4 ימים
 * שולח לאוהד WhatsApp עם נתוני תגובות לידים
 * schedule מוגדר ב-vercel.json
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { sendWhatsApp } from '@/lib/whatsapp'

const OHAD_WA = '972542274497'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const stats = await getFollowupStats()
  const msg = buildReport(stats)
  await sendWhatsApp(OHAD_WA, msg)

  return NextResponse.json({ ok: true, stats })
}

export async function getFollowupStats() {
  const supabase = createServiceClient()
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const tables = ['leads', 'leads_talush'] as const
  let total = 0, replied = 0, optedOut = 0
  let repliedAt0 = 0, repliedAt1 = 0, repliedAt2 = 0
  let stillActive = 0, completed = 0

  for (const table of tables) {
    const { data } = await supabase
      .from(table)
      .select('followup_stage, followup_stopped, followup_opted_out')
      .gte('created_at', since)
      .gte('followup_stage', 0)

    for (const l of data ?? []) {
      total++
      if (l.followup_opted_out) { optedOut++; continue }
      if (l.followup_stopped) {
        replied++
        if (l.followup_stage === 0) repliedAt0++
        else if (l.followup_stage === 1) repliedAt1++
        else repliedAt2++
      } else if (l.followup_stage >= 2) {
        completed++ // סיים רצף בלי לענות
      } else {
        stillActive++
      }
    }
  }

  const replyRate = total > 0 ? Math.round((replied / total) * 100) : 0

  return {
    total, replied, replyRate,
    repliedAt0, repliedAt1, repliedAt2,
    optedOut, stillActive, completed,
    since,
  }
}

function buildReport(s: Awaited<ReturnType<typeof getFollowupStats>>) {
  const now = new Date().toLocaleDateString('he-IL', { timeZone: 'Asia/Jerusalem' })
  const lines = [
    `📊 *דוח פולואפ | ${now}*`,
    `_30 ימים אחרונים_`,
    ``,
    `📥 סה"כ לידים ברצף: ${s.total}`,
    `💬 ענו: ${s.replied} (${s.replyRate}%)`,
  ]
  if (s.replied > 0) {
    lines.push(`  ↳ אחרי הודעה ראשונה: ${s.repliedAt0}`)
    lines.push(`  ↳ אחרי יום 3: ${s.repliedAt1}`)
    lines.push(`  ↳ אחרי יום 7: ${s.repliedAt2}`)
  }
  lines.push(
    `🚫 ביקשו הסרה: ${s.optedOut}`,
    `⏳ עדיין ברצף: ${s.stillActive}`,
    ``,
    `💡 אם אחוז התגובה מתחת ל-20%, כדאי לשנות נוסח.`,
  )
  return lines.join('\n')
}
