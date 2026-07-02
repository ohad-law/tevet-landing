import { NextRequest, NextResponse } from 'next/server'
import { getFollowupStats } from '@/app/api/cron/followup-report/route'

export async function GET(req: NextRequest) {
  const key = req.headers.get('x-api-key')
  if (key !== process.env.NOTIFY_WEBHOOK_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const stats = await getFollowupStats()
  return NextResponse.json(stats)
}
