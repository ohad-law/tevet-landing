import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import CaseForm from '@/components/crm/CaseForm'

export const revalidate = 0

export default async function CaseEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: c }, { data: clients }] = await Promise.all([
    supabase.from('cases').select('id, case_name, case_number, case_type, status, client_id, court_name, open_date, fee, notes, value, assigned_to').eq('id', id).single(),
    supabase.from('clients').select('id, full_name').order('full_name'),
  ])

  if (!c) notFound()

  return <CaseForm clients={clients ?? []} initialData={c} />
}
