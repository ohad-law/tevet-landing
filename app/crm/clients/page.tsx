import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export const revalidate = 0

export default async function ClientsPage() {
  const supabase = await createClient()

  const [{ data: clients }, { data: cases }] = await Promise.all([
    supabase.from('clients').select('*').order('full_name'),
    supabase.from('clients').select('id').neq('status', 'ארכיון'),
  ])

  const { data: caseCounts } = await supabase
    .from('cases')
    .select('client_id')
    .neq('status', 'ארכיון')

  const caseCountMap: Record<string, number> = {}
  for (const c of caseCounts ?? []) {
    if (c.client_id) caseCountMap[c.client_id] = (caseCountMap[c.client_id] ?? 0) + 1
  }

  return (
    <div className="space-y-6" style={{ fontFamily: 'Assistant, sans-serif' }}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">לקוחות</h1>
          <p className="text-slate-500 text-sm mt-0.5">{clients?.length ?? 0} לקוחות במערכת</p>
        </div>
        <Link href="/crm/clients/new" className="bg-slate-900 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-slate-800 transition">
          + לקוח חדש
        </Link>
      </div>

      <div className="grid gap-3">
        {(clients ?? []).map(client => (
          <Link key={client.id} href={`/crm/clients/${client.id}`}>
            <div className="bg-white rounded-xl border border-slate-200 px-5 py-4 hover:border-blue-300 hover:shadow-md transition-all flex items-center justify-between group">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 font-bold text-sm">
                  {client.full_name?.charAt(0) ?? '?'}
                </div>
                <div>
                  <p className="font-semibold text-slate-800 group-hover:text-blue-600 transition">{client.full_name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{client.phone} {client.email ? `· ${client.email}` : ''}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-right">
                <div>
                  <p className="text-lg font-bold text-slate-800">{caseCountMap[client.id] ?? 0}</p>
                  <p className="text-xs text-slate-400">תיקים פעילים</p>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                  client.status === 'פעיל' ? 'bg-green-100 text-green-700' :
                  client.status === 'ממתין' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-slate-100 text-slate-500'
                }`}>
                  {client.status}
                </span>
              </div>
            </div>
          </Link>
        ))}
        {(clients?.length ?? 0) === 0 && (
          <div className="text-center py-16 text-slate-400 bg-white rounded-2xl border border-slate-200">
            <p className="text-3xl mb-2">👥</p>
            <p>אין לקוחות עדיין</p>
            <Link href="/crm/clients/new" className="text-blue-600 text-sm hover:underline mt-2 inline-block">הוסף לקוח ראשון</Link>
          </div>
        )}
      </div>
    </div>
  )
}
