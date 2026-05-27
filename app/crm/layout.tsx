import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CrmSidebar from '@/components/crm/CrmSidebar'

export default async function CrmLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <div className="min-h-screen bg-[#f8fafc] flex" dir="rtl">
      <CrmSidebar userEmail={user.email ?? ''} />
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="flex-1 p-7 overflow-auto">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}
