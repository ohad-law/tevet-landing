import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { user_email, date, check_in, check_out, total_hours, notes } = body

  if (!user_email || !date) {
    return NextResponse.json({ error: 'user_email and date required' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Upsert by user_email + date (one record per day per user)
  const existing = await supabase
    .from('attendance')
    .select('id')
    .eq('user_email', user_email)
    .eq('date', date)
    .maybeSingle()

  if (existing.data?.id) {
    const updates: Record<string, unknown> = {}
    if (check_in !== undefined) updates.check_in = check_in
    if (check_out !== undefined) updates.check_out = check_out
    if (total_hours !== undefined) updates.total_hours = total_hours
    if (notes !== undefined) updates.notes = notes

    const { error } = await supabase
      .from('attendance')
      .update(updates)
      .eq('id', existing.data.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ id: existing.data.id })
  }

  const { data, error } = await supabase
    .from('attendance')
    .insert({ user_email, date, check_in, check_out, total_hours, notes })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ id: data.id })
}
