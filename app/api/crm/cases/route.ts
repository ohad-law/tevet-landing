import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function POST(req: NextRequest) {
  const body = await req.json()

  const {
    case_name, case_number, case_type, status = 'תיק נכנס',
    client_id, court_name, open_date, fee, notes, value, assigned_to,
  } = body

  if (!case_name?.trim()) {
    return NextResponse.json({ error: 'שם תיק חובה' }, { status: 400 })
  }

  const supabase = createServiceClient()

  const record: Record<string, unknown> = {
    case_name: case_name.trim(),
    status,
  }
  if (case_number?.trim()) record.case_number = case_number.trim()
  if (case_type?.trim()) record.case_type = case_type.trim()
  if (client_id?.trim()) record.client_id = client_id.trim()
  if (court_name?.trim()) record.court_name = court_name.trim()
  if (open_date?.trim()) record.open_date = open_date.trim()
  if (fee?.trim()) record.fee = fee.trim()
  if (notes?.trim()) record.notes = notes.trim()
  if (value && !isNaN(Number(value))) record.value = Number(value)
  if (assigned_to?.trim()) record.assigned_to = assigned_to.trim()

  const { data, error } = await supabase
    .from('cases')
    .insert(record)
    .select('id')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ id: data.id })
}
