import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { date, time, description, location, case_id } = body

  if (!date || !case_id) {
    return NextResponse.json({ error: 'תאריך ותיק חובה' }, { status: 400 })
  }

  const supabase = createServiceClient()

  const record: Record<string, unknown> = { date, case_id }
  if (time) record.time = time
  if (description?.trim()) record.description = description.trim()
  if (location?.trim()) record.location = location.trim()

  const { data, error } = await supabase
    .from('hearings')
    .insert(record)
    .select('id')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ id: data.id })
}
