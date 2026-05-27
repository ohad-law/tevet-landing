import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function POST(req: NextRequest) {
  const body = await req.json()

  const {
    full_name, phone, email, address, id_number,
    status = 'פעיל', notes,
  } = body

  if (!full_name?.trim()) {
    return NextResponse.json({ error: 'שם מלא חובה' }, { status: 400 })
  }

  const supabase = createServiceClient()

  const record: Record<string, unknown> = {
    full_name: full_name.trim(),
    status,
  }
  if (phone?.trim()) record.phone = phone.trim()
  if (email?.trim()) record.email = email.trim()
  if (address?.trim()) record.address = address.trim()
  if (id_number?.trim()) record.id_number = id_number.trim()
  if (notes?.trim()) record.notes = notes.trim()

  const { data, error } = await supabase
    .from('clients')
    .insert(record)
    .select('id')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ id: data.id })
}
