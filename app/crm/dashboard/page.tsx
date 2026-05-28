import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import {
  Scale,
  Users,
  CheckSquare,
  TrendingUp,
  AlertTriangle,
  UserPlus,
  CalendarDays,
  ArrowLeft,
  Clock,
  Zap,
} from 'lucide-react'

export const revalidate = 0

export default async function DashboardPage() {
  const supabase = await createClient()

  const now = new Date()
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const today = now.toISOString().split('T')[0]
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const [
    { data: cases },
    { data: clients },
    { data: tasks },
    { data: hearings },
    { data: newLeads },
    { data: monthIncome },
    { data: soonHearings },
  ] = await Promise.all([
    supabase.from('cases').select('id, case_number, case_name, status, assigned_to, client_id').neq('status', 'ארכיון').neq('status', 'פסק דין'),
    supabase.from('clients').select('id, full_name, status'),
    supabase.from('tasks').select('id, description, status, priority, due_date, case_id').neq('status', 'הושלמה').order('due_date', { ascending: true, nullsFirst: false }),
    supabase.from('hearings').select('id, case_id, date, time, location, description').gte('date', today).lte('date', in7Days).order('date'),
    Promise.all([
      supabase.from('leads').select('id, status'),
      supabase.from('leads_talush').select('id, status'),
    ]).then(([a, b]) => ({ data: [...(a.data ?? []), ...(b.data ?? [])] })),
    supabase.from('income').select('amount, status').eq('status', 'שולם').gte('date', firstOfMonth),
    supabase.from('hearings').select('case_id, date, description').gte('date', today).lte('date', in3Days),
  ])

  const activeClients = clients?.filter(c => c.status === 'פעיל').length ?? 0
  const activeCases = cases?.length ?? 0
  const openTasks = tasks?.length ?? 0
  const urgentTasks = tasks?.filter(t => t.priority === 'דחוף') ?? []
  const overdueTasks = tasks?.filter(t => t.due_date && t.due_date < today) ?? []
  const totalMonthIncome = (monthIncome ?? []).reduce((sum, i) => sum + (Number(i.amount) || 0), 0)
  const upcomingHearings = hearings ?? []
  const totalLeads = newLeads?.length ?? 0
  const newLeadsCount = newLeads?.filter(l => l.status === 'חדש').length ?? 0

  // Smart risk analysis
  const overdueByCase: Record<string, number> = {}
  for (const t of overdueTasks) {
    if (t.case_id) overdueByCase[t.case_id] = (overdueByCase[t.case_id] ?? 0) + 1
  }
  const soonHearingCaseIds = new Set((soonHearings ?? []).map(h => h.case_id).filter(Boolean))

  const atRiskCases = (cases ?? []).filter(c =>
    (overdueByCase[c.id] ?? 0) > 0 || soonHearingCaseIds.has(c.id)
  ).sort((a, b) => {
    const scoreA = (soonHearingCaseIds.has(a.id) ? 10 : 0) + (overdueByCase[a.id] ?? 0) * 3
    const scoreB = (soonHearingCaseIds.has(b.id) ? 10 : 0) + (overdueByCase[b.id] ?? 0) * 3
    return scoreB - scoreA
  }).slice(0, 5)

  const todayHearings = (soonHearings ?? []).filter(h => h.date === today)

  const statusColor: Record<string, { bg: string; text: string }> = {
    'תיק נכנס':              { bg: 'bg-slate-100',  text: 'text-slate-600' },
    'עריכת כתב תביעה':       { bg: 'bg-amber-100',  text: 'text-amber-700' },
    'מעקב מספר הליך בנט':    { bg: 'bg-blue-100',   text: 'text-blue-700' },
    'הוכחות':                 { bg: 'bg-purple-100', text: 'text-purple-700' },
    'סיכומים':                { bg: 'bg-indigo-100', text: 'text-indigo-700' },
    'פסק דין':                { bg: 'bg-green-100',  text: 'text-green-700' },
  }

  const dateLabel = now.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="space-y-6" style={{ fontFamily: 'Assistant, sans-serif' }}>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">לוח בקרה</h1>
          <p className="text-slate-400 text-sm mt-0.5">{dateLabel}</p>
        </div>
        <Link
          href="/crm/cases/new"
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          + תיק חדש
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="תיקים פעילים"
          value={activeCases}
          sub={`${clients?.length ?? 0} לקוחות בסה"כ`}
          icon={<Scale size={18} className="text-blue-600" />}
          iconBg="bg-blue-50"
        />
        <StatCard
          label="לקוחות פעילים"
          value={activeClients}
          icon={<Users size={18} className="text-indigo-600" />}
          iconBg="bg-indigo-50"
        />
        <StatCard
          label="משימות פתוחות"
          value={openTasks}
          sub={urgentTasks.length > 0 ? `${urgentTasks.length} דחופות` : ''}
          subAlert={urgentTasks.length > 0}
          icon={<CheckSquare size={18} className="text-emerald-600" />}
          iconBg="bg-emerald-50"
        />
        <StatCard
          label="הכנסות החודש"
          value={`₪${totalMonthIncome.toLocaleString()}`}
          icon={<TrendingUp size={18} className="text-violet-600" />}
          iconBg="bg-violet-50"
        />
      </div>

      {/* Alert banners */}
      <div className="space-y-3">
        {overdueTasks.length > 0 && (
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <AlertTriangle size={17} className="text-red-500 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-red-700">
                {overdueTasks.length} משימות באיחור
              </p>
              <p className="text-xs text-red-500 mt-0.5">
                {overdueTasks.slice(0, 2).map(t => t.description).join(' · ')}
                {overdueTasks.length > 2 ? ` ועוד ${overdueTasks.length - 2}` : ''}
              </p>
            </div>
            <Link href="/crm/tasks" className="text-xs text-red-600 font-medium hover:underline whitespace-nowrap flex items-center gap-1">
              לצפייה <ArrowLeft size={12} />
            </Link>
          </div>
        )}
        {newLeadsCount > 0 && (
          <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <UserPlus size={17} className="text-amber-500 shrink-0" />
            <p className="text-sm font-semibold text-amber-700 flex-1">
              {newLeadsCount} לידים חדשים ממתינים לטיפול
              {totalLeads > newLeadsCount && <span className="text-amber-500 font-normal"> · {totalLeads} סה"כ</span>}
            </p>
            <Link href="/crm/leads" className="text-xs text-amber-600 font-medium hover:underline whitespace-nowrap flex items-center gap-1">
              לניהול לידים <ArrowLeft size={12} />
            </Link>
          </div>
        )}
      </div>

      {/* Today's hearings alert */}
      {todayHearings.length > 0 && (
        <div className="flex items-start gap-3 bg-blue-50 border border-blue-300 rounded-xl px-4 py-3">
          <CalendarDays size={17} className="text-blue-600 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-blue-800">
              {todayHearings.length === 1 ? 'יש לך דיון היום' : `יש לך ${todayHearings.length} דיונים היום`}
            </p>
            <p className="text-xs text-blue-600 mt-0.5">
              {todayHearings.map(h => h.description || 'דיון').join(' · ')}
            </p>
          </div>
          <Link href="/crm/hearings" className="text-xs text-blue-700 font-medium hover:underline whitespace-nowrap flex items-center gap-1">
            לפרטים <ArrowLeft size={12} />
          </Link>
        </div>
      )}

      {/* Smart risk analysis */}
      {atRiskCases.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap size={15} className="text-amber-500" />
              <h2 className="font-semibold text-slate-800 text-sm">תיקים שדורשים תשומת לב</h2>
              <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">{atRiskCases.length}</span>
            </div>
          </div>
          <div className="divide-y divide-slate-50">
            {atRiskCases.map(c => {
              const overdue = overdueByCase[c.id] ?? 0
              const hasSoonHearing = soonHearingCaseIds.has(c.id)
              const hearing = (soonHearings ?? []).find(h => h.case_id === c.id)
              return (
                <div key={c.id} className="px-5 py-3 flex items-center justify-between gap-3 hover:bg-slate-50/60 transition">
                  <div className="min-w-0">
                    <Link href={`/crm/cases/${c.id}`} className="font-medium text-slate-800 hover:text-blue-600 transition text-sm">
                      {c.case_name}
                    </Link>
                    <div className="flex gap-2 mt-1 flex-wrap">
                      {hasSoonHearing && hearing && (
                        <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full font-medium">
                          דיון {hearing.date === today ? 'היום' : hearing.date}
                        </span>
                      )}
                      {overdue > 0 && (
                        <span className="text-xs bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded-full font-medium">
                          {overdue} משימות באיחור
                        </span>
                      )}
                    </div>
                  </div>
                  <Link
                    href={`/crm/cases/${c.id}`}
                    className="text-xs text-blue-600 hover:underline shrink-0"
                  >
                    פתח תיק
                  </Link>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Two columns */}
      <div className="grid lg:grid-cols-2 gap-5">

        {/* Upcoming Hearings */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarDays size={16} className="text-slate-400" />
              <h2 className="font-semibold text-slate-800 text-sm">דיונים קרובים</h2>
              <span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">{upcomingHearings.length}</span>
            </div>
            <Link href="/crm/hearings" className="text-xs text-blue-600 hover:underline">הכל</Link>
          </div>
          <div className="divide-y divide-slate-50">
            {upcomingHearings.length === 0 ? (
              <p className="text-slate-400 text-sm p-6 text-center">אין דיונים ב-7 הימים הקרובים</p>
            ) : (
              upcomingHearings.slice(0, 5).map(h => {
                const isToday = h.date === today
                return (
                  <div key={h.id} className="px-5 py-3 flex items-center justify-between gap-3 hover:bg-slate-50/60 transition-colors">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{h.description || 'דיון'}</p>
                      {h.location && <p className="text-xs text-slate-400 mt-0.5 truncate">{h.location}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-xs font-bold font-mono ${isToday ? 'text-red-500' : 'text-slate-600'}`}>
                        {isToday ? 'היום' : h.date}
                      </p>
                      {h.time && <p className="text-xs text-slate-400 mt-0.5">{h.time}</p>}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Open Tasks */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-slate-400" />
              <h2 className="font-semibold text-slate-800 text-sm">משימות דחופות</h2>
              <span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">{urgentTasks.length}</span>
            </div>
            <Link href="/crm/tasks" className="text-xs text-blue-600 hover:underline">הכל</Link>
          </div>
          <div className="divide-y divide-slate-50">
            {urgentTasks.length === 0 ? (
              <p className="text-slate-400 text-sm p-6 text-center">אין משימות דחופות</p>
            ) : (
              urgentTasks.slice(0, 5).map(t => (
                <div key={t.id} className="px-5 py-3 flex items-center justify-between gap-3 hover:bg-slate-50/60 transition-colors">
                  <p className="text-sm text-slate-800 truncate">{t.description}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
                    t.due_date && t.due_date < today
                      ? 'bg-red-100 text-red-600'
                      : 'bg-amber-100 text-amber-600'
                  }`}>
                    {t.due_date ?? 'ללא תאריך'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Cases Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scale size={16} className="text-slate-400" />
            <h2 className="font-semibold text-slate-800 text-sm">תיקים פעילים</h2>
            <span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">{activeCases}</span>
          </div>
          <Link href="/crm/cases" className="text-xs text-blue-600 hover:underline">לכל התיקים</Link>
        </div>
        {(cases?.length ?? 0) === 0 ? (
          <p className="text-slate-400 text-sm p-8 text-center">אין תיקים פעילים עדיין</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-right text-xs font-medium text-slate-400 px-5 py-3">מספר תיק</th>
                  <th className="text-right text-xs font-medium text-slate-400 px-5 py-3">שם התיק</th>
                  <th className="text-right text-xs font-medium text-slate-400 px-5 py-3">סטטוס</th>
                  <th className="text-right text-xs font-medium text-slate-400 px-5 py-3">אחראי</th>
                </tr>
              </thead>
              <tbody>
                {(cases ?? []).slice(0, 8).map(c => {
                  const sc = statusColor[c.status] ?? { bg: 'bg-slate-100', text: 'text-slate-600' }
                  return (
                    <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors last:border-0">
                      <td className="px-5 py-3 font-mono text-xs text-slate-400">{c.case_number ?? '—'}</td>
                      <td className="px-5 py-3">
                        <Link href={`/crm/cases/${c.id}`} className="font-medium text-slate-800 hover:text-blue-600 transition-colors">
                          {c.case_name}
                        </Link>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sc.bg} ${sc.text}`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-xs text-slate-400">{c.assigned_to ?? '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({
  label, value, sub, subAlert, icon, iconBg,
}: {
  label: string
  value: string | number
  sub?: string
  subAlert?: boolean
  icon: React.ReactNode
  iconBg: string
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-400 leading-none">{label}</p>
          <p className="text-2xl font-bold text-slate-900 mt-2 leading-none">{value}</p>
          {sub && (
            <p className={`text-xs mt-2 ${subAlert ? 'text-red-500 font-semibold' : 'text-slate-400'}`}>{sub}</p>
          )}
        </div>
        <div className={`${iconBg} w-9 h-9 rounded-lg flex items-center justify-center shrink-0`}>
          {icon}
        </div>
      </div>
    </div>
  )
}
