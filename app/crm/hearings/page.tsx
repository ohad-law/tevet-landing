import { createClient } from '@/lib/supabase/server'
import HearingAdder from '@/components/crm/HearingAdder'
import HearingsManager from '@/components/crm/HearingsManager'

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

  return (
    <div className="space-y-6" style={{ fontFamily: 'Assistant, sans-serif' }}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">יומן דיונים</h1>
          <p className="text-slate-500 text-sm mt-0.5">{upcoming.length} דיונים קרובים</p>
        </div>
        <HearingAdder cases={cases ?? []} />
      </div>

      <HearingsManager initialHearings={hearings ?? []} caseMap={caseMap} today={today} />
    </div>
  )
}
