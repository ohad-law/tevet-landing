import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await req.json()
  const { status } = body

  if (!status) {
    return NextResponse.json({ error: 'status required' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { error } = await supabase
    .from('income')
    .update({ status })
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
