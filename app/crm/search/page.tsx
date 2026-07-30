import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Search, FolderOpen, Users, CheckSquare, Calendar } from 'lucide-react'
import { STATUS_BADGE } from '@/lib/case-statuses'

export const revalidate = 0

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q = '' } = await searchParams
  const query = q.trim()

  const supabase = await createClient()

  if (!query) {
    return (
      <div className="space-y-4" style={{ fontFamily: 'Assistant, sans-serif' }}>
        <h1 className="text-2xl font-bold text-slate-800">חיפוש</h1>
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
          <Search size={40} className="mx-auto mb-3 opacity-30" />
          <p>הקלד שם לקוח, מספר תיק, תיאור משימה, או תיאור דיון</p>
        </div>
      </div>
    )
  }

  const pat = `%${query}%`

  const [
    { data: cases },
    { data: clients },
    { data: tasks },
    { data: hearings },
  ] = await Promise.all([
    supabase.from('cases').select('id, case_name, case_number, case_type, status').or(`case_name.ilike.${pat},case_number.ilike.${pat},defendant_name.ilike.${pat}`).limit(20),
    supabase.from('clients').select('id, full_name, phone, email, status').or(`full_name.ilike.${pat},phone.ilike.${pat},email.ilike.${pat}`).limit(20),
    supabase.from('tasks').select('id, description, status, priority, due_date, case_id').ilike('description', pat).limit(20),
    supabase.from('hearings').select('id, date, time, description, location, case_id').or(`description.ilike.${pat},location.ilike.${pat}`).order('date', { ascending: false }).limit(15),
  ])

  const caseMap = Object.fromEntries((cases ?? []).map(c => [c.id, { name: c.case_name, number: c.case_number, id: c.id }]))

  // Enrich hearings with case names if not already in results
  let hearingCaseMap: Record<string, { name: string; id: string }> = {}
  const unmappedCaseIds = (hearings ?? [])
    .map(h => h.case_id)
    .filter(id => id && !caseMap[id]) as string[]

  if (unmappedCaseIds.length > 0) {
    const { data: extraCases } = await supabase
      .from('cases')
      .select('id, case_name')
      .in('id', [...new Set(unmappedCaseIds)])
    hearingCaseMap = Object.fromEntries((extraCases ?? []).map(c => [c.id, { name: c.case_name, id: c.id }]))
  }

  // Enrich tasks with case names
  const taskCaseIds = (tasks ?? []).map(t => (t as any).case_id).filter((id: string | null) => id && !caseMap[id]) as string[]
  let taskCaseMap: Record<string, { name: string; id: string }> = {}
  if (taskCaseIds.length > 0) {
    const { data: taskCases } = await supabase.from('cases').select('id, case_name').in('id', [...new Set(taskCaseIds)])
    taskCaseMap = Object.fromEntries((taskCases ?? []).map(c => [c.id, { name: c.case_name, id: c.id }]))
  }

  const totalResults = (cases?.length ?? 0) + (clients?.length ?? 0) + (tasks?.length ?? 0) + (hearings?.length ?? 0)

  return (
    <div className="space-y-6" style={{ fontFamily: 'Assistant, sans-serif' }}>
      <div>
        <h1 className="text-2xl font-bold text-slate-800">חיפוש: <span className="text-blue-600">{query}</span></h1>
        <p className="text-slate-500 text-sm mt-0.5">{totalResults} תוצאות</p>
      </div>

      {totalResults === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
          <Search size={36} className="mx-auto mb-3 opacity-30" />
          <p>לא נמצאו תוצאות עבור &quot;{query}&quot;</p>
        </div>
      )}

      {(clients?.length ?? 0) > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Users size={15} className="text-slate-400" />
            <h2 className="font-semibold text-slate-700 text-sm">לקוחות ({clients!.length})</h2>
          </div>
          <div className="space-y-2">
            {clients!.map(c => (
              <Link key={c.id} href={`/crm/clients/${c.id}`}>
                <div className="bg-white rounded-xl border border-slate-200 px-5 py-3.5 hover:border-blue-300 hover:shadow-md transition-all flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 font-bold text-sm shrink-0">
                      {c.full_name?.charAt(0) ?? '?'}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800 group-hover:text-blue-600 transition">{c.full_name}</p>
                      {c.phone && <p className="text-xs text-slate-400">{c.phone}</p>}
                    </div>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                    c.status === 'פעיל' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {c.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {(cases?.length ?? 0) > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <FolderOpen size={15} className="text-slate-400" />
            <h2 className="font-semibold text-slate-700 text-sm">תיקים ({cases!.length})</h2>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            {cases!.map((c, i) => (
              <Link
                key={c.id}
                href={`/crm/cases/${c.id}`}
                className={`flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition group ${i > 0 ? 'border-t border-slate-50' : ''}`}
              >
                <div>
                  <p className="font-semibold text-slate-800 group-hover:text-blue-600 transition">{c.case_name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {c.case_type && `${c.case_type} · `}
                    <span className="font-mono">#{c.case_number}</span>
                  </p>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium shrink-0 ${STATUS_BADGE[c.status] ?? 'bg-slate-100 text-slate-500'}`}>
                  {c.status}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {(hearings?.length ?? 0) > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Calendar size={15} className="text-slate-400" />
            <h2 className="font-semibold text-slate-700 text-sm">דיונים ({hearings!.length})</h2>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            {hearings!.map((h, i) => {
              const relatedCase = h.case_id
                ? (caseMap[h.case_id] ? { name: caseMap[h.case_id].name, id: h.case_id } : hearingCaseMap[h.case_id])
                : null
              return (
                <div
                  key={h.id}
                  className={`flex items-center justify-between px-5 py-3.5 ${i > 0 ? 'border-t border-slate-50' : ''}`}
                >
                  <div>
                    <p className="font-semibold text-slate-800">{h.description || 'דיון'}</p>
                    {relatedCase && (
                      <Link href={`/crm/cases/${h.case_id}`} className="text-xs text-blue-600 hover:underline mt-0.5 block">
                        {relatedCase.name}
                      </Link>
                    )}
                    {h.location && <p className="text-xs text-slate-400 mt-0.5">{h.location}</p>}
                  </div>
                  <p className="font-mono text-sm text-slate-600 shrink-0">{h.date}</p>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {(tasks?.length ?? 0) > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <CheckSquare size={15} className="text-slate-400" />
            <h2 className="font-semibold text-slate-700 text-sm">משימות ({tasks!.length})</h2>
          </div>
          <div className="space-y-2">
            {tasks!.map(t => {
              const tAny = t as any
              const relatedCase = tAny.case_id
                ? (caseMap[tAny.case_id] ?? taskCaseMap[tAny.case_id])
                : null
              return (
                <div key={t.id} className="bg-white rounded-xl border border-slate-200 px-5 py-3.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${
                        t.priority === 'דחוף' ? 'bg-red-500' :
                        t.priority === 'גבוה' ? 'bg-amber-500' : 'bg-slate-300'
                      }`} />
                      <p className={`text-sm font-medium truncate ${t.status === 'הושלמה' ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                        {t.description}
                      </p>
                    </div>
                    {relatedCase && (
                      <Link href={`/crm/cases/${relatedCase.id}`} className="text-xs text-blue-600 hover:underline mt-0.5 block pr-4">
                        {relatedCase.name}
                      </Link>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {t.due_date && <span className="text-xs font-mono text-slate-400">{t.due_date}</span>}
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      t.status === 'הושלמה' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {t.status}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
