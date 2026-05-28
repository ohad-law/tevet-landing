import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CrmShell from '@/components/crm/CrmShell'

export default async function CrmLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <CrmShell userEmail={user.email ?? ''}>
      {children}
    </CrmShell>
  )
}
