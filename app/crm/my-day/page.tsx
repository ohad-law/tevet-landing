import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import {
  AlertTriangle,
  Zap,
  CalendarDays,
  CheckSquare,
  Clock,
  CheckCircle2,
  ArrowLeft,
} from 'lucide-react'

export const revalidate = 0

export default async function MyDayPage() {
  const supabase = await createClient()

  const now = new Date()
  const today = now.toISOString().split('T')[0]
  const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const { data: { user } } = await supabase.auth.getUser()
  const displayName = (user?.user_metadata as Record<string, unknown>)?.full_name as string
    || user?.email?.split('@')[0] || 'אוהד'

  const [
    { data: allTasks },
    { data: todayHearings },
    { data: upcomingHearings },
    { data: cases },
  ] = await Promise.all([
    supabase.from('tasks').select('id, title, description, status, priority, due_date, case_id').neq('status', 'הושלמה'),
    supabase.from('hearings').select('id, case_id, date, time, location, description, hearing_type').eq('date', today).order('time'),
    supabase.from('hearings').select('id, case_id, date, time, location, description, hearing_type').gt('date', today).lte('date', in7Days).order('date').order('time'),
    supabase.from('cases').select('id, case_name, case_number').neq('status', 'ארכיון'),
  ])

  const caseNameMap = Object.fromEntries((cases ?? []).map(c => [c.id, { name: c.case_name, number: c.case_number }]))

  const overdueTasks = (allTasks ?? []).filter(t => t.due_date && t.due_date < today)
  const todayTasks = (allTasks ?? []).filter(t => t.due_date === today)
  const urgentNoDate = (allTasks ?? []).filter(t => t.priority === 'דחוף' && !t.due_date)
  const upcomingTasks = (allTasks ?? []).filter(t => t.due_date && t.due_date > today && t.due_date <= in3Days)
  const totalOpen = (allTasks ?? []).length

  const greetingHour = now.getHours()
  const greeting = greetingHour < 12 ? 'בוקר טוב' : greetingHour < 17 ? 'צהריים טובים' : 'ערב טוב'
  const dateLabel = now.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="space-y-5" style={{ fontFamily: "'Assistant', sans-serif", color: '#1e293b' }}>

      {/* Header */}
      <div className="crm-in crm-d1 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-sm font-medium" style={{ color: '#94a3b8' }}>{dateLabel}</p>
          <h1 className="text-3xl font-extrabold mt-1 tracking-tight" style={{ color: '#0f172a' }}>
            {greeting}, {displayName} 👋
          </h1>
          <p className="text-sm mt-0.5" style={{ color: '#94a3b8' }}>
            {totalOpen > 0
              ? `${totalOpen} משימות פתוחות${overdueTasks.length > 0 ? ` · ${overdueTasks.length} באיחור` : ''}`
              : 'כל המשימות עודכנו, יום נהדר! 🎉'}
          </p>
        </div>
        {(overdueTasks.length > 0) && (
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold"
            style={{ background: '#fee2e2', color: '#b91c1c' }}
          >
            <AlertTriangle size={13} />
            {overdueTasks.length} באיחור
          </div>
        )}
      </div>

      {/* Today's hearings, prominent */}
      {(todayHearings ?? []).length > 0 && (
<div className="crm-in crm-d2">
        <div
          className="rounded-xl p-4"
          style={{ background: 'linear-gradient(135deg, #1e40af, #2563eb)', color: '#fff' }}
        >
          <div className="flex items-center gap-2 mb-3">
            <CalendarDays size={16} className="opacity-80" />
            <span className="font-bold text-sm">
              {(todayHearings ?? []).length === 1 ? 'דיון היום' : `${(todayHearings ?? []).length} דיונים היום`}
            </span>
          </div>
          <div className="space-y-2">
            {(todayHearings ?? []).map(h => {
              const caseInfo = h.case_id ? caseNameMap[h.case_id] : null
              return (
                <div key={h.id} className="flex items-center justify-between gap-3 bg-white/10 rounded-lg px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{h.description || 'דיון'}</p>
                    {caseInfo && (
                      <p className="text-xs opacity-70 mt-0.5 truncate">{caseInfo.name}</p>
                    )}
                  </div>
                  <div className="text-left shrink-0">
                    {h.time && <p className="text-sm font-bold">{h.time}</p>}
                    {h.location && <p className="text-xs opacity-70">{h.location}</p>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
</div>
      )}

      {/* Overdue, urgent */}
      {overdueTasks.length > 0 && (
        <WorkSection
          icon={<AlertTriangle size={15} color="#dc2626" />}
          title="באיחור, דורש טיפול מיידי"
          count={overdueTasks.length}
          accentColor="#fee2e2"
          accentText="#b91c1c"
          topBorder="#ef4444"
        >
          {overdueTasks.map(t => (
            <TaskRow key={t.id} task={t} caseNameMap={caseNameMap} isOverdue />
          ))}
        </WorkSection>
      )}

      {/* Today's tasks */}
      {todayTasks.length > 0 && (
        <WorkSection
          icon={<Clock size={15} color="#d97706" />}
          title="משימות להיום"
          count={todayTasks.length}
          accentColor="rgba(245,158,11,0.12)"
          accentText="#d97706"
          topBorder="#f59e0b"
        >
          {todayTasks.map(t => (
            <TaskRow key={t.id} task={t} caseNameMap={caseNameMap} />
          ))}
        </WorkSection>
      )}

      {/* Urgent no date */}
      {urgentNoDate.length > 0 && (
        <WorkSection
          icon={<Zap size={15} color="#7c3aed" />}
          title="דחוף, ללא תאריך קרוב"
          count={urgentNoDate.length}
          accentColor="rgba(124,58,237,0.08)"
          accentText="#7c3aed"
          topBorder="#8b5cf6"
        >
          {urgentNoDate.map(t => (
            <TaskRow key={t.id} task={t} caseNameMap={caseNameMap} />
          ))}
        </WorkSection>
      )}

      {/* Upcoming tasks 3 days */}
      {upcomingTasks.length > 0 && (
        <WorkSection
          icon={<CheckSquare size={15} color="#0284c7" />}
          title="משימות ב-3 ימים הקרובים"
          count={upcomingTasks.length}
          accentColor="rgba(2,132,199,0.08)"
          accentText="#0284c7"
          topBorder="#0ea5e9"
        >
          {upcomingTasks.map(t => (
            <TaskRow key={t.id} task={t} caseNameMap={caseNameMap} />
          ))}
        </WorkSection>
      )}

      {/* Upcoming hearings */}
      {(upcomingHearings ?? []).length > 0 && (
        <WorkSection
          icon={<CalendarDays size={15} color="#059669" />}
          title="דיונים קרובים"
          count={(upcomingHearings ?? []).length}
          accentColor="rgba(5,150,105,0.08)"
          accentText="#059669"
          topBorder="#10b981"
          href="/crm/hearings"
        >
          {(upcomingHearings ?? []).slice(0, 6).map(h => {
            const caseInfo = h.case_id ? caseNameMap[h.case_id] : null
            return (
              <div key={h.id} className="flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-slate-50 transition-colors" style={{ borderBottom: '1px solid #f8fafc' }}>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: '#0f172a' }}>{h.description || 'דיון'}</p>
                  {caseInfo && (
                    <Link href={`/crm/cases/${h.case_id}`} className="text-xs mt-0.5 block truncate hover:underline" style={{ color: '#3b82f6' }}>
                      {caseInfo.name}
                    </Link>
                  )}
                </div>
                <div className="text-left shrink-0">
                  <p className="text-xs font-bold tabular-nums" style={{ color: '#475569' }}>{h.date}</p>
                  {h.time && <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>{h.time}</p>}
                </div>
              </div>
            )
          })}
        </WorkSection>
      )}

      {/* All clear */}
      {overdueTasks.length === 0 && todayTasks.length === 0 && urgentNoDate.length === 0 && (todayHearings ?? []).length === 0 && (
        <div
          className="rounded-xl p-10 text-center"
          style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.06)' }}
        >
          <CheckCircle2 size={36} className="mx-auto mb-3" color="#22c55e" />
          <p className="font-bold text-lg" style={{ color: '#0f172a' }}>כל הכבוד! יום נקי 🎉</p>
          <p className="text-sm mt-1" style={{ color: '#94a3b8' }}>אין משימות דחופות ואין דיונים היום</p>
          <Link
            href="/crm/tasks"
            className="inline-flex items-center gap-1.5 text-sm font-medium mt-4 hover:underline"
            style={{ color: '#3b82f6' }}
          >
            לכל המשימות <ArrowLeft size={13} />
          </Link>
        </div>
      )}

    </div>
  )
}

/* ── Sub-components ── */

function WorkSection({
  icon, title, count, accentColor, accentText, topBorder, children, href,
}: {
  icon: React.ReactNode
  title: string
  count: number
  accentColor: string
  accentText: string
  topBorder: string
  children: React.ReactNode
  href?: string
}) {
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: '#fff',
        border: '1px solid rgba(0,0,0,0.06)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        borderTop: `3px solid ${topBorder}`,
      }}
    >
      <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: '1px solid #f1f5f9' }}>
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-semibold text-sm" style={{ color: '#0f172a' }}>{title}</span>
          <span
            className="text-xs font-bold px-2 py-0.5 rounded-full"
            style={{ background: accentColor, color: accentText }}
          >
            {count}
          </span>
        </div>
        {href && (
          <Link href={href} className="text-xs font-medium hover:underline flex items-center gap-1" style={{ color: '#3b82f6' }}>
            הכל <ArrowLeft size={11} />
          </Link>
        )}
      </div>
      <div>{children}</div>
    </div>
  )
}

function TaskRow({
  task,
  caseNameMap,
  isOverdue,
}: {
  task: {
    id: string
    title?: string | null
    description?: string | null
    due_date?: string | null
    priority?: string | null
    case_id?: string | null
  }
  caseNameMap: Record<string, { name: string; number: string | null }>
  isOverdue?: boolean
}) {
  const caseInfo = task.case_id ? caseNameMap[task.case_id] : null
  const label = task.title || task.description || 'משימה'

  return (
    <div
      className="flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-slate-50 transition-colors"
      style={{ borderBottom: '1px solid #f8fafc' }}
    >
      <div className="flex items-start gap-3 min-w-0">
        <div
          className="w-4 h-4 rounded-full border-2 shrink-0 mt-0.5"
          style={{ borderColor: isOverdue ? '#ef4444' : '#cbd5e1' }}
        />
        <div className="min-w-0">
          <p className="text-sm font-medium truncate" style={{ color: '#1e293b' }}>{label}</p>
          {caseInfo && (
            <Link
              href={`/crm/cases/${task.case_id}`}
              className="text-xs mt-0.5 block truncate hover:underline"
              style={{ color: '#3b82f6' }}
            >
              {caseInfo.name}
            </Link>
          )}
        </div>
      </div>
      <div className="shrink-0 flex items-center gap-2">
        {task.priority === 'דחוף' && (
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(124,58,237,0.1)', color: '#7c3aed' }}
          >
            דחוף
          </span>
        )}
        {task.due_date && (
          <span
            className="text-xs font-semibold px-2 py-1 rounded-full tabular-nums"
            style={
              isOverdue
                ? { background: '#fee2e2', color: '#b91c1c' }
                : { background: '#f1f5f9', color: '#475569' }
            }
          >
            {task.due_date}
          </span>
        )}
      </div>
    </div>
  )
}
