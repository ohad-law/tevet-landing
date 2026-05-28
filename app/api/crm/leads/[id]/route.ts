import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await req.json()
  const { table = 'leads', ...updates } = body

  if (!['leads', 'leads_talush'].includes(table)) {
    return NextResponse.json({ error: 'invalid table' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { error } = await supabase
    .from(table as 'leads' | 'leads_talush')
    .update(updates)
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
