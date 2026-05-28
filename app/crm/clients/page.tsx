import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import ClientsGrid from '@/components/crm/ClientsGrid'
import ExportCsvButton from '@/components/crm/ExportCsvButton'

export const revalidate = 0

export default async function ClientsPage() {
  const supabase = await createClient()

  const [{ data: clients }, { data: caseCounts }] = await Promise.all([
    supabase.from('clients').select('id, full_name, phone, email, status').order('full_name'),
    supabase.from('cases').select('client_id').neq('status', 'ארכיון'),
  ])

  const caseCountMap: Record<string, number> = {}
  for (const c of caseCounts ?? []) {
    if (c.client_id) caseCountMap[c.client_id] = (caseCountMap[c.client_id] ?? 0) + 1
  }

  const exportData = (clients ?? []).map(c => ({
    'שם מלא': c.full_name,
    טלפון: c.phone ?? '',
    'אימייל': c.email ?? '',
    סטטוס: c.status ?? '',
    'מספר תיקים': caseCountMap[c.id] ?? 0,
  }))

  return (
    <div className="space-y-6" style={{ fontFamily: 'Assistant, sans-serif' }}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">לקוחות</h1>
          <p className="text-slate-500 text-sm mt-0.5">{clients?.length ?? 0} לקוחות במערכת</p>
        </div>
        <div className="flex items-center gap-2">
          <ExportCsvButton data={exportData} filename="לקוחות" />
          <Link
            href="/crm/clients/new"
            className="bg-slate-900 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-slate-800 transition"
          >
            + לקוח חדש
          </Link>
        </div>
      </div>

      <ClientsGrid clients={clients ?? []} caseCountMap={caseCountMap} />
    </div>
  )
}
