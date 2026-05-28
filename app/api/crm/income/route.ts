import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { amount, date, description, status, case_id, client_id, invoice_number, payment_method } = body

  if (!amount || !date) {
    return NextResponse.json({ error: 'amount and date are required' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('income')
    .insert({
      amount: Number(amount),
      date,
      description: description || null,
      status: status || 'ממתין',
      case_id: case_id || null,
      client_id: client_id || null,
      invoice_number: invoice_number || null,
      payment_method: payment_method || null,
    })
    .select('id')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ id: data.id })
}
