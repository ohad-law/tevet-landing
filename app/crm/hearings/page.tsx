import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { MapPin } from 'lucide-react'
import HearingAdder from '@/components/crm/HearingAdder'

export const revalidate = 0

export default async function HearingsPage() {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  const [{ data: hearings }, { data: cases }] = await Promise.all([
    supabase.from('hearings').select('*').order('date', { ascending: true }),
    supabase.from('cases').select('id, case_name, case_number').neq('status', 'ארכיון').order('case_name'),
  ])

  const caseMap = Object.fromEntries((cases ?? []).map(c => [c.id, c]))
  const upcoming = (hearings ?? []).filter(h => h.date >= today)
  const past = (hearings ?? []).filter(h => h.date < today)

  return (
    <div className="space-y-6" style={{ fontFamily: 'Assistant, sans-serif' }}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">יומן דיונים</h1>
          <p className="text-slate-500 text-sm mt-0.5">{upcoming.length} דיונים קרובים</p>
        </div>
      </div>

      <HearingAdder cases={cases ?? []} />

      <section>
        <h2 className="font-semibold text-slate-700 mb-3 text-sm">דיונים קרובים</h2>
        <div className="space-y-3">
          {upcoming.map(h => {
            const c = h.case_id ? caseMap[h.case_id] : null
            const isToday = h.date === today
            const daysUntil = Math.ceil((new Date(h.date).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24))
            return (
              <div key={h.id} className={`bg-white rounded-xl border px-5 py-4 flex items-center justify-between gap-4 ${isToday ? 'border-red-400 bg-red-50/30' : 'border-slate-200'}`}>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-800">{h.description || 'דיון'}</p>
                  {c && (
                    <Link href={`/crm/cases/${c.id}`} className="text-xs text-blue-600 hover:underline mt-0.5 block">
                      {c.case_name} #{c.case_number}
                    </Link>
                  )}
                  {h.location && (
                    <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                      <MapPin size={10} /> {h.location}
                    </p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className={`font-mono text-sm font-bold ${isToday ? 'text-red-600' : 'text-slate-700'}`}>
                    {isToday ? 'היום!' : h.date}
                  </p>
                  {h.time && <p className="text-xs text-slate-400 mt-0.5">{h.time}</p>}
                  {!isToday && daysUntil <= 7 && (
                    <p className="text-xs text-amber-600 font-medium mt-0.5">עוד {daysUntil} ימים</p>
                  )}
                </div>
              </div>
            )
          })}
          {upcoming.length === 0 && (
            <div className="text-center py-12 text-slate-400 bg-white rounded-2xl border border-slate-200">
              <p className="text-3xl mb-2">📅</p>
              <p>אין דיונים קרובים</p>
            </div>
          )}
        </div>
      </section>

      {past.length > 0 && (
        <details>
          <summary className="cursor-pointer text-sm font-medium text-slate-500 hover:text-slate-700 py-2">
            דיונים שעברו ({past.length})
          </summary>
          <div className="mt-3 space-y-2">
            {past.slice().reverse().slice(0, 20).map(h => {
              const c = h.case_id ? caseMap[h.case_id] : null
              return (
                <div key={h.id} className="bg-white rounded-xl border border-slate-100 px-5 py-3 flex items-center justify-between opacity-60">
                  <div>
                    <p className="text-sm font-medium text-slate-600">{h.description || 'דיון'}</p>
                    {c && (
                      <Link href={`/crm/cases/${c.id}`} className="text-xs text-blue-500 hover:underline">
                        {c.case_name}
                      </Link>
                    )}
                  </div>
                  <p className="font-mono text-xs text-slate-400">{h.date}</p>
                </div>
              )
            })}
          </div>
        </details>
      )}
    </div>
  )
}
