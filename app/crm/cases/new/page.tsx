import { createClient } from '@/lib/supabase/server'
import CaseForm from '@/components/crm/CaseForm'

export const revalidate = 0

export default async function NewCasePage({ searchParams }: { searchParams: Promise<{ client_id?: string }> }) {
  const { client_id } = await searchParams
  const supabase = await createClient()
  const { data: clients } = await supabase
    .from('clients')
    .select('id, full_name')
    .order('full_name')

  return <CaseForm clients={clients ?? []} defaultClientId={client_id} />
}
