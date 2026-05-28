import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { table = 'leads' } = body

  if (!['leads', 'leads_talush'].includes(table)) {
    return NextResponse.json({ error: 'invalid table' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { error } = await supabase
    .from(table as 'leads' | 'leads_talush')
    .update({ is_viewed: true })
    .eq('is_viewed', false)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
