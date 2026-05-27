import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export const revalidate = 0

export default async function DashboardPage() {
  const supabase = await createClient()

  const now = new Date()
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const today = now.toISOString().split('T')[0]
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const [
    { data: cases },
    { data: clients },
    { data: tasks },
    { data: hearings },
    { data: newLeads },
    { data: monthIncome },
  ] = await Promise.all([
    supabase.from('cases').select('id, case_number, case_name, status, assigned_to, client_id').neq('status', 'ארכיון').neq('status', 'פסק דין'),
    supabase.from('clients').select('id, full_name, status'),
    supabase.from('tasks').select('id, description, status, priority, due_date, case_id').in('status', ['לביצוע', 'בטיפול']),
    supabase.from('hearings').select('id, case_id, date, time, location, description').gte('date', today).lte('date', in7Days).order('date'),
    supabase.from('leads').select('id').eq('is_viewed', false),
    supabase.from('income').select('amount').eq('status', 'שולם').gte('date', firstOfMonth),
  ])

  const activeClients = clients?.filter(c => c.status === 'פעיל').length ?? 0
  const activeCases = cases?.length ?? 0
  const urgentTasks = tasks?.filter(t => t.priority === 'דחוף') ?? []
  const overdueTasks = tasks?.filter(t => t.due_date && t.due_date < today) ?? []
  const totalMonthIncome = monthIncome?.reduce((sum, i) => sum + (i.amount ?? 0), 0) ?? 0
  const upcomingHearings = hearings ?? []
  const unviewedLeads = newLeads?.length ?? 0

  const statusColor: Record<string, string> = {
    'תיק נכנס': 'bg-slate-100 text-slate-600',
    'עריכת כתב תביעה': 'bg-yellow-100 text-yellow-700',
    'מעקב מספר הליך בנט': 'bg-blue-100 text-blue-700',
    'הוכחות': 'bg-purple-100 text-purple-700',
    'סיכומים': 'bg-indigo-100 text-indigo-700',
    'פסק דין': 'bg-green-100 text-green-700',
  }

  return (
    <div className="space-y-6" style={{ fontFamily: 'Assistant, sans-serif' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">לוח בקרה</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {now.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <Link href="/crm/cases/new" className="bg-slate-900 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-slate-800 transition">
          + תיק חדש
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="תיקים פעילים" value={activeCases} icon="⚖️" color="bg-blue-600" sub={`${clients?.length ?? 0} לקוחות`} />
        <StatCard label="לקוחות פעילים" value={activeClients} icon="👥" color="bg-indigo-600" />
        <StatCard label="משימות פתוחות" value={tasks?.length ?? 0} icon="✅" color="bg-sky-600" sub={urgentTasks.length > 0 ? `${urgentTasks.length} דחופות` : 'הכל תקין'} alert={urgentTasks.length > 0} />
        <StatCard label="הכנסות החודש" value={`₪${totalMonthIncome.toLocaleString()}`} icon="💰" color="bg-emerald-600" />
      </div>

      {/* Alerts Row */}
      {(overdueTasks.length > 0 || unviewedLeads > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {overdueTasks.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
              <p className="font-bold text-red-700 flex items-center gap-2">
                <span>🚨</span> {overdueTasks.length} משימות באיחור
              </p>
              <div className="mt-3 space-y-2">
                {overdueTasks.slice(0, 3).map(t => (
                  <div key={t.id} className="text-sm text-red-600 bg-white/60 rounded-lg px-3 py-2">
                    {t.description} — <span className="font-mono text-xs">{t.due_date}</span>
                  </div>
                ))}
              </div>
              <Link href="/crm/tasks" className="text-xs text-red-500 hover:underline mt-2 block">לכל המשימות ←</Link>
            </div>
          )}
          {unviewedLeads > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
              <p className="font-bold text-amber-700 flex items-center gap-2">
                <span>🎯</span> {unviewedLeads} לידים חדשים שלא נצפו
              </p>
              <Link href="/crm/leads" className="text-xs text-amber-600 hover:underline mt-2 block">לניהול לידים ←</Link>
            </div>
          )}
        </div>
      )}

      {/* Main Content */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Upcoming Hearings */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-bold text-slate-800 flex items-center gap-2">📅 דיונים קרובים (7 ימים)</h2>
            <Link href="/crm/hearings" className="text-xs text-blue-600 hover:underline">הכל</Link>
          </div>
          <div className="divide-y divide-slate-50">
            {upcomingHearings.length === 0 ? (
              <p className="text-slate-400 text-sm p-5 text-center">אין דיונים קרובים</p>
            ) : (
              upcomingHearings.map(h => (
                <div key={h.id} className="px-5 py-3 flex items-start justify-between gap-4 hover:bg-slate-50/50">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{h.description || 'דיון'}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{h.location}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-mono text-blue-600">{h.date}</p>
                    {h.time && <p className="text-xs text-slate-400">{h.time}</p>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Urgent Tasks */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-bold text-slate-800 flex items-center gap-2">✅ משימות דחופות</h2>
            <Link href="/crm/tasks" className="text-xs text-blue-600 hover:underline">הכל</Link>
          </div>
          <div className="divide-y divide-slate-50">
            {urgentTasks.length === 0 ? (
              <p className="text-slate-400 text-sm p-5 text-center">אין משימות דחופות 🎉</p>
            ) : (
              urgentTasks.slice(0, 5).map(t => (
                <div key={t.id} className="px-5 py-3 flex items-center justify-between gap-4 hover:bg-slate-50/50">
                  <p className="text-sm text-slate-800">{t.description}</p>
                  <span className="text-xs bg-red-100 text-red-600 font-medium px-2 py-0.5 rounded-full shrink-0">
                    {t.due_date ?? 'ללא תאריך'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Active Cases Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-bold text-slate-800 flex items-center gap-2">⚖️ תיקים פעילים</h2>
          <Link href="/crm/cases" className="text-xs text-blue-600 hover:underline">לכל התיקים</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50/70 text-slate-500 text-xs">
                <th className="text-right font-medium px-5 py-3">מספר תיק</th>
                <th className="text-right font-medium px-5 py-3">שם התיק</th>
                <th className="text-right font-medium px-5 py-3">סטטוס</th>
                <th className="text-right font-medium px-5 py-3">אחראי</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {(cases ?? []).slice(0, 8).map(c => (
                <tr key={c.id} className="hover:bg-slate-50/50 transition">
                  <td className="px-5 py-3 font-mono text-slate-500 text-xs">{c.case_number}</td>
                  <td className="px-5 py-3">
                    <Link href={`/crm/cases/${c.id}`} className="font-medium text-slate-800 hover:text-blue-600 transition">
                      {c.case_name}
                    </Link>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColor[c.status] ?? 'bg-slate-100 text-slate-600'}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-slate-500 text-xs">{c.assigned_to ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {(cases?.length ?? 0) === 0 && (
            <p className="text-slate-400 text-sm p-6 text-center">אין תיקים פעילים עדיין</p>
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({
  label, value, icon, color, sub, alert
}: {
  label: string
  value: string | number
  icon: string
  color: string
  sub?: string
  alert?: boolean
}) {
  return (
    <div className={`bg-white rounded-2xl border shadow-sm p-5 ${alert ? 'border-red-200' : 'border-slate-200'}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-slate-500 text-xs font-medium">{label}</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{value}</p>
          {sub && <p className={`text-xs mt-1 ${alert ? 'text-red-500 font-semibold' : 'text-slate-400'}`}>{sub}</p>}
        </div>
        <div className={`${color} w-10 h-10 rounded-xl flex items-center justify-center text-lg shadow-sm`}>
          {icon}
        </div>
      </div>
    </div>
  )
}
