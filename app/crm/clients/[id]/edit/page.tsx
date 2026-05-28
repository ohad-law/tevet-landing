import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import ClientForm from '@/components/crm/ClientForm'

export const revalidate = 0

export default async function ClientEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: client } = await supabase
    .from('clients')
    .select('id, full_name, phone, email, address, id_number, status, notes')
    .eq('id', id)
    .single()

  if (!client) notFound()

  return <ClientForm initialData={client} />
}
