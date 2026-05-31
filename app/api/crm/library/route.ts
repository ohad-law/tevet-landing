import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function GET() {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('document_library')
    .select('id, filename, file_type, file_size, tags, status, chunk_count, created_at, error_msg')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function DELETE(req: NextRequest) {
  const body = await req.json() as { id?: string; ids?: string[]; deleteAll?: boolean }
  const supabase = createServiceClient()

  // מחיקת הכל
  if (body.deleteAll) {
    const { error } = await supabase.from('document_library').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  // מחיקת כמה בבת-אחת
  if (body.ids?.length) {
    const { error } = await supabase.from('document_library').delete().in('id', body.ids)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  // מחיקת אחד
  if (!body.id) return NextResponse.json({ error: 'id חסר' }, { status: 400 })
  const { error } = await supabase.from('document_library').delete().eq('id', body.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
