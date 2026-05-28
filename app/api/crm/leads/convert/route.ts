import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { lead_id, table, full_name, phone, email } = body

  if (!lead_id || !table || !full_name) {
    return NextResponse.json({ error: 'lead_id, table and full_name required' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Create new client
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .insert({ full_name, phone: phone || null, email: email || null, status: 'פעיל' })
    .select('id')
    .single()

  if (clientError) {
    return NextResponse.json({ error: clientError.message }, { status: 500 })
  }

  // Mark lead as converted
  const { error: leadError } = await supabase
    .from(table)
    .update({ status: 'הפך ללקוח' })
    .eq('id', lead_id)

  if (leadError) {
    return NextResponse.json({ error: leadError.message }, { status: 500 })
  }

  return NextResponse.json({ client_id: client.id })
}
