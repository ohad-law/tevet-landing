import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CrmShell from '@/components/crm/CrmShell'

export default async function CrmLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const [{ count: openTasksCount }, { count: newLeadsCount }, { count: newLeadsTalushCount }] = await Promise.all([
    supabase.from('tasks').select('*', { count: 'exact', head: true }).neq('status', 'הושלמה'),
    supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'חדש'),
    supabase.from('leads_talush').select('*', { count: 'exact', head: true }).eq('status', 'חדש'),
  ])

  const badges = {
    '/crm/tasks': openTasksCount ?? 0,
    '/crm/leads': (newLeadsCount ?? 0) + (newLeadsTalushCount ?? 0),
  }

  return (
    <CrmShell userEmail={user.email ?? ''} badges={badges}>
      {children}
    </CrmShell>
  )
}
