import { createClient } from '@/lib/supabase/server'
import AttendanceClock from '@/components/crm/AttendanceClock'

export const revalidate = 0

export default async function AttendancePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const userEmail = user?.email ?? ''
  const today = new Date().toISOString().split('T')[0]

  const [{ data: todayRecord }, { data: allRecords }] = await Promise.all([
    supabase.from('attendance').select('*').eq('user_email', userEmail).eq('date', today).maybeSingle(),
    supabase.from('attendance').select('*').eq('user_email', userEmail).order('date', { ascending: false }).limit(60),
  ])

  // Group by month
  const byMonth: Record<string, typeof allRecords> = {}
  for (const r of allRecords ?? []) {
    const month = r.date.slice(0, 7)
    if (!byMonth[month]) byMonth[month] = []
    byMonth[month]!.push(r)
  }

  const monthlyHours = Object.entries(byMonth).map(([month, records]) => ({
    month,
    total: records!.reduce((s, r) => s + (r.total_hours ?? 0), 0),
    days: records!.length,
  }))

  function formatMonth(ym: string) {
    const [y, m] = ym.split('-')
    const months = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר']
    return `${months[Number(m) - 1]} ${y}`
  }

  return (
    <div className="space-y-6" style={{ fontFamily: 'Assistant, sans-serif' }}>
      <div>
        <h1 className="text-2xl font-bold text-slate-800">נוכחות</h1>
        <p className="text-slate-500 text-sm mt-0.5">מעקב שעות עבודה</p>
      </div>

      {/* Today clock */}
      <AttendanceClock userEmail={userEmail} today={today} todayRecord={todayRecord ?? null} />

      {/* Monthly summary */}
      {monthlyHours.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {monthlyHours.slice(0, 4).map(({ month, total, days }) => (
            <div key={month} className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs text-slate-500 font-medium">{formatMonth(month)}</p>
              <p className="text-xl font-bold text-slate-800 mt-1">{total.toFixed(1)} ש'</p>
              <p className="text-xs text-slate-400 mt-0.5">{days} ימי עבודה</p>
            </div>
          ))}
        </div>
      )}

      {/* Records table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-800">היסטוריית נוכחות</h2>
        </div>
        {(allRecords?.length ?? 0) === 0 ? (
          <p className="text-slate-400 text-sm p-8 text-center">אין רשומות נוכחות עדיין</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500">תאריך</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500">כניסה</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500">יציאה</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500">סה"כ שעות</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500">הערות</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {allRecords!.map(r => (
                  <tr key={r.id} className={`${r.date === today ? 'bg-blue-50/30' : ''}`}>
                    <td className="px-5 py-3 font-mono text-slate-700">{r.date}</td>
                    <td className="px-5 py-3 font-mono text-emerald-600">{r.check_in ?? '—'}</td>
                    <td className="px-5 py-3 font-mono text-red-500">{r.check_out ?? '—'}</td>
                    <td className="px-5 py-3 font-bold text-slate-800">
                      {r.total_hours != null ? `${r.total_hours}ש'` : '—'}
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-400">{r.notes ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
