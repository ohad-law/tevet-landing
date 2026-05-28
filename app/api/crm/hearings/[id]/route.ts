import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await req.json()
  const { date, time, description, location } = body

  const supabase = createServiceClient()
  const updates: Record<string, unknown> = {}
  if (date !== undefined) updates.date = date
  if (time !== undefined) updates.time = time || null
  if (description !== undefined) updates.description = description?.trim() || null
  if (location !== undefined) updates.location = location?.trim() || null

  const { error } = await supabase.from('hearings').update(updates).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createServiceClient()
  const { error } = await supabase.from('hearings').delete().eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
