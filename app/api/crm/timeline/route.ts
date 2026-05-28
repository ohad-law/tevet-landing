import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { case_id, description, event_type = 'הערה', created_by } = body

  if (!case_id || !description?.trim()) {
    return NextResponse.json({ error: 'case_id ותיאור חובה' }, { status: 400 })
  }

  const supabase = createServiceClient()

  const record: Record<string, unknown> = {
    case_id,
    description: description.trim(),
    event_type,
  }
  if (created_by?.trim()) record.created_by = created_by.trim()

  const { data, error } = await supabase
    .from('case_timeline')
    .insert(record)
    .select('id')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ id: data.id })
}
