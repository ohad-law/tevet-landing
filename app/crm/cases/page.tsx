import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import CasesTable from '@/components/crm/CasesTable'

export const revalidate = 0

export default async function CasesPage() {
  const supabase = await createClient()

  const [{ data: cases }, { data: clients }] = await Promise.all([
    supabase.from('cases').select('id, case_number, case_name, client_id, case_type, status, assigned_to, value').order('created_at', { ascending: false }),
    supabase.from('clients').select('id, full_name'),
  ])

  const clientMap = Object.fromEntries((clients ?? []).map(c => [c.id, c.full_name]))
  const activeCases = (cases ?? []).filter(c => c.status !== 'ארכיון' && c.status !== 'פסק דין')

  return (
    <div className="space-y-6" style={{ fontFamily: 'Assistant, sans-serif' }}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">ניהול תיקים</h1>
          <p className="text-slate-500 text-sm mt-0.5">{activeCases.length} תיקים פעילים</p>
        </div>
        <Link
          href="/crm/cases/new"
          className="bg-slate-900 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-slate-800 transition"
        >
          + תיק חדש
        </Link>
      </div>

      <CasesTable cases={cases ?? []} clientMap={clientMap} />
    </div>
  )
}
