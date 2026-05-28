import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { description, priority = 'רגיל', status = 'פתוחה', due_date, case_id, client_id } = body

  if (!description?.trim()) {
    return NextResponse.json({ error: 'תיאור משימה חובה' }, { status: 400 })
  }

  const supabase = createServiceClient()

  const record: Record<string, unknown> = {
    description: description.trim(),
    priority,
    status,
  }
  if (due_date) record.due_date = due_date
  if (case_id) record.case_id = case_id
  if (client_id) record.client_id = client_id

  const { data, error } = await supabase
    .from('tasks')
    .insert(record)
    .select('id')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ id: data.id })
}
