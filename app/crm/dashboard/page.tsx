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
  Plus,
} from 'lucide-react'

export const revalidate = 0

export default async function DashboardPage() {
  const supabase = await createClient()

  const now = new Date()
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const today = now.toISOString().split('T')[0]
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const { data: { user } } = await supabase.auth.getUser()
  const displayName = (user?.user_metadata as Record<string, unknown>)?.full_name as string
    || (user?.email?.split('@')[0] ?? 'אוהד')

  const [
    { data: cases },
    { data: clients },
    { data: tasks },
    { data: hearings },
    { data: monthIncome },
    { data: soonHearings },
  ] = await Promise.all([
    supabase.from('cases').select('id, case_number, case_name, status, assigned_to, client_id, target_close_date').neq('status', 'ארכיון').neq('status', 'פסק דין'),
    supabase.from('clients').select('id, full_name, status'),
    supabase.from('tasks').select('id, title, description, status, priority, due_date, case_id').neq('status', 'הושלמה').order('due_date', { ascending: true, nullsFirst: false }),
    supabase.from('hearings').select('id, case_id, date, time, location, description').gte('date', today).lte('date', in7Days).order('date'),
    supabase.from('income').select('amount, status').eq('status', 'שולם').gte('date', firstOfMonth),
    supabase.from('hearings').select('case_id, date, description').gte('date', today).lte('date', in3Days),
  ])

  const newLeads = await Promise.all([
    supabase.from('leads').select('id, status'),
    supabase.from('leads_talush').select('id, status'),
  ]).then(([a, b]) => [...(a.data ?? []), ...(b.data ?? [])])

  const caseNameMap = Object.fromEntries((cases ?? []).map(c => [c.id, c.case_name]))
  const activeClients = clients?.filter(c => c.status === 'פעיל').length ?? 0
  const activeCases = cases?.length ?? 0
  const openTasks = tasks?.length ?? 0
  const urgentTasks = tasks?.filter(t => t.priority === 'דחוף') ?? []
  const overdueTasks = tasks?.filter(t => t.due_date && t.due_date < today) ?? []
  const totalMonthIncome = (monthIncome ?? []).reduce((sum, i) => sum + (Number(i.amount) || 0), 0)
  const upcomingHearings = hearings ?? []
  const newLeadsCount = newLeads.filter(l => l.status === 'חדש').length

  // Risk analysis
  const overdueByCase: Record<string, number> = {}
  for (const t of overdueTasks) {
    if (t.case_id) overdueByCase[t.case_id] = (overdueByCase[t.case_id] ?? 0) + 1
  }
  const soonHearingCaseIds = new Set((soonHearings ?? []).map(h => h.case_id).filter(Boolean))
  const atRiskCases = (cases ?? []).filter(c =>
    (overdueByCase[c.id] ?? 0) > 0 ||
    soonHearingCaseIds.has(c.id) ||
    (c.target_close_date && c.target_close_date >= today && c.target_close_date <= in7Days)
  ).sort((a, b) => {
    const scoreA = (soonHearingCaseIds.has(a.id) ? 10 : 0) + (overdueByCase[a.id] ?? 0) * 3 + (a.target_close_date && a.target_close_date <= in3Days ? 5 : 0)
    const scoreB = (soonHearingCaseIds.has(b.id) ? 10 : 0) + (overdueByCase[b.id] ?? 0) * 3 + (b.target_close_date && b.target_close_date <= in3Days ? 5 : 0)
    return scoreB - scoreA
  }).slice(0, 5)

  const todayHearings = (soonHearings ?? []).filter(h => h.date === today)

  const statusColor: Record<string, { bg: string; text: string }> = {
    'תיק נכנס':              { bg: '#f1f5f9', text: '#475569' },
    'עריכת כתב תביעה':       { bg: '#fef3c7', text: '#92400e' },
    'מעקב מספר הליך בנט':    { bg: '#dbeafe', text: '#1d4ed8' },
    'הוכחות':                 { bg: '#f3e8ff', text: '#6b21a8' },
    'סיכומים':                { bg: '#e0e7ff', text: '#3730a3' },
    'פסק דין':                { bg: '#dcfce7', text: '#15803d' },
    'מסירה אישית/דואר ישראל': { bg: '#ffedd5', text: '#c2410c' },
    'הודעה על המצאה':          { bg: '#f5d0fe', text: '#86198f' },
    'תצהיר גילוי מסמכים':      { bg: '#dbeafe', text: '#1e40af' },
    'תצהיר עדות ראשית':        { bg: '#fce7f3', text: '#9d174d' },
  }

  const dateLabel = now.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const greetingHour = now.getHours()
  const greeting = greetingHour < 12 ? 'בוקר טוב' : greetingHour < 17 ? 'צהריים טובים' : 'ערב טוב'

  return (
    <div className="space-y-4" style={{ fontFamily: "'Assistant', sans-serif", color: '#1e293b' }}>

      {/* ─── Header ─── */}
      <div className="crm-in crm-d1 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-sm font-medium" style={{ color: '#94a3b8' }}>{dateLabel}</p>
          <h1 className="text-3xl font-extrabold mt-1 tracking-tight" style={{ color: '#0f172a' }}>
            {greeting}, {displayName} 👋
          </h1>
          <p className="text-sm mt-1" style={{ color: '#94a3b8' }}>סקירה מערכתית בזמן אמת</p>
        </div>
        <Link
          href="/crm/cases/new"
          className="inline-flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl transition-all"
          style={{
            background: 'linear-gradient(135deg, #d97706, #b45309)',
            color: '#fff',
            boxShadow: '0 4px 14px rgba(217,119,6,0.35)',
          }}
        >
          <Plus size={16} />
          תיק חדש
        </Link>
      </div>

      {/* ─── Stats ─── */}
      <div className="crm-in crm-d2 grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="תיקים פעילים"
          value={activeCases}
          sub={`${clients?.length ?? 0} לקוחות בסה"כ`}
          icon={<Scale size={16} color="#3b82f6" />}
          accent="#3b82f6"
          iconBg="rgba(59,130,246,0.1)"
        />
        <StatCard
          label="לקוחות פעילים"
          value={activeClients}
          sub={`מתוך ${clients?.length ?? 0} סה"כ`}
          icon={<Users size={16} color="#8b5cf6" />}
          accent="#8b5cf6"
          iconBg="rgba(139,92,246,0.1)"
        />
        <StatCard
          label="משימות פתוחות"
          value={openTasks}
          sub={overdueTasks.length > 0 ? `${overdueTasks.length} באיחור` : urgentTasks.length > 0 ? `${urgentTasks.length} דחופות` : 'הכל בסדר'}
          subAlert={overdueTasks.length > 0}
          icon={<CheckSquare size={16} color="#f59e0b" />}
          accent="#f59e0b"
          iconBg="rgba(245,158,11,0.1)"
        />
        <StatCard
          label="הכנסות החודש"
          value={`₪${totalMonthIncome.toLocaleString()}`}
          sub="שולם בחודש הנוכחי"
          icon={<TrendingUp size={16} color="#22c55e" />}
          accent="#22c55e"
          iconBg="rgba(34,197,94,0.1)"
        />
      </div>

      {/* ─── Alert banners ─── */}
      {(overdueTasks.length > 0 || newLeadsCount > 0 || todayHearings.length > 0) && (
        <div className="crm-in crm-d3 space-y-2.5">
          {overdueTasks.length > 0 && (
            <AlertBanner
              icon={<AlertTriangle size={16} color="#dc2626" />}
              bg="rgba(254,226,226,0.8)"
              border="#fca5a5"
              title={`${overdueTasks.length} משימות באיחור — דורש טיפול מיידי`}
              sub={overdueTasks.slice(0, 2).map(t => t.title || t.description || '').join(' · ')}
              href="/crm/tasks"
              linkColor="#dc2626"
            />
          )}
          {newLeadsCount > 0 && (
            <AlertBanner
              icon={<UserPlus size={16} color="#d97706" />}
              bg="rgba(255,251,235,0.8)"
              border="#fcd34d"
              title={`${newLeadsCount} לידים חדשים ממתינים לטיפול`}
              href="/crm/leads"
              linkColor="#d97706"
            />
          )}
          {todayHearings.length > 0 && (
            <AlertBanner
              icon={<CalendarDays size={16} color="#2563eb" />}
              bg="rgba(239,246,255,0.8)"
              border="#93c5fd"
              title={todayHearings.length === 1 ? 'יש לך דיון היום' : `${todayHearings.length} דיונים היום`}
              sub={todayHearings.map(h => h.description || 'דיון').join(' · ')}
              href="/crm/hearings"
              linkColor="#2563eb"
            />
          )}
        </div>
      )}

      {/* ─── At-risk cases ─── */}
      {atRiskCases.length > 0 && (
        <div className="crm-in crm-d4"><Section
          icon={<Zap size={15} color="#f59e0b" />}
          title="תיקים שדורשים תשומת לב"
          badge={atRiskCases.length}
          badgeColor="rgba(245,158,11,0.15)"
          badgeText="#d97706"
        >
          {atRiskCases.map(c => {
            const overdue = overdueByCase[c.id] ?? 0
            const hasSoonHearing = soonHearingCaseIds.has(c.id)
            const hearing = (soonHearings ?? []).find(h => h.case_id === c.id)
            return (
              <div key={c.id} className="px-4 py-2.5 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0">
                <div className="min-w-0">
                  <Link href={`/crm/cases/${c.id}`} className="font-semibold text-sm hover:text-blue-600 transition-colors" style={{ color: '#0f172a' }}>
                    {c.case_name}
                  </Link>
                  <div className="flex gap-1.5 mt-1.5 flex-wrap">
                    {hasSoonHearing && hearing && (
                      <Tag color="#dbeafe" text="#1d4ed8">
                        דיון {hearing.date === today ? 'היום' : hearing.date}
                      </Tag>
                    )}
                    {overdue > 0 && (
                      <Tag color="#fee2e2" text="#b91c1c">
                        {overdue} משימות באיחור
                      </Tag>
                    )}
                    {c.target_close_date && c.target_close_date <= in7Days && (
                      <Tag color="#ffedd5" text="#c2410c">
                        יעד: {c.target_close_date === today ? 'היום' : c.target_close_date}
                      </Tag>
                    )}
                  </div>
                </div>
                <Link href={`/crm/cases/${c.id}`} className="text-xs font-medium hover:underline shrink-0 flex items-center gap-1" style={{ color: '#3b82f6' }}>
                  פתח תיק <ArrowLeft size={11} />
                </Link>
              </div>
            )
          })}
        </Section></div>
      )}

      {/* ─── Two columns ─── */}
      <div className="crm-in crm-d5 grid lg:grid-cols-2 gap-5">

        {/* Hearings */}
        <Section
          icon={<CalendarDays size={15} color="#94a3b8" />}
          title="דיונים קרובים"
          badge={upcomingHearings.length}
          href="/crm/hearings"
          hrefLabel="הכל"
        >
          {upcomingHearings.length === 0 ? (
            <EmptyState text="אין דיונים ב-7 הימים הקרובים" />
          ) : upcomingHearings.slice(0, 5).map(h => {
            const isToday = h.date === today
            const relatedCaseName = h.case_id ? caseNameMap[h.case_id] : null
            return (
              <div key={h.id} className="px-4 py-2.5 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: '#0f172a' }}>{h.description || 'דיון'}</p>
                  {relatedCaseName && (
                    <Link href={`/crm/cases/${h.case_id}`} className="text-xs mt-0.5 block truncate hover:underline" style={{ color: '#3b82f6' }}>
                      {relatedCaseName}
                    </Link>
                  )}
                </div>
                <div className="text-left shrink-0">
                  <p className={`text-xs font-bold tabular-nums ${isToday ? 'text-red-500' : ''}`} style={!isToday ? { color: '#475569' } : {}}>
                    {isToday ? 'היום 🔴' : h.date}
                  </p>
                  {h.time && <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>{h.time}</p>}
                </div>
              </div>
            )
          })}
        </Section>

        {/* Urgent tasks */}
        <Section
          icon={<Clock size={15} color="#94a3b8" />}
          title="משימות דחופות"
          badge={urgentTasks.length}
          href="/crm/tasks"
          hrefLabel="הכל"
        >
          {urgentTasks.length === 0 ? (
            <EmptyState text="אין משימות דחופות — מצוין! 🎉" />
          ) : urgentTasks.slice(0, 6).map(t => (
            <div key={t.id} className="px-4 py-2.5 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0">
              <p className="text-sm truncate" style={{ color: '#1e293b' }}>{t.title || t.description}</p>
              <span
                className="text-xs font-semibold px-2 py-1 rounded-full shrink-0"
                style={
                  t.due_date && t.due_date < today
                    ? { background: '#fee2e2', color: '#b91c1c' }
                    : { background: '#fef3c7', color: '#92400e' }
                }
              >
                {t.due_date ? t.due_date : 'ללא תאריך'}
              </span>
            </div>
          ))}
        </Section>
      </div>

      {/* ─── Cases table ─── */}
      <div className="crm-in crm-d6"><Section
        icon={<Scale size={15} color="#94a3b8" />}
        title="תיקים פעילים"
        badge={activeCases}
        href="/crm/cases"
        hrefLabel="לכל התיקים"
      >
        {(cases?.length ?? 0) === 0 ? (
          <EmptyState text="אין תיקים פעילים עדיין" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <th className="text-right text-xs font-semibold px-4 py-2" style={{ color: '#94a3b8' }}>מספר</th>
                  <th className="text-right text-xs font-semibold px-4 py-2" style={{ color: '#94a3b8' }}>שם התיק</th>
                  <th className="text-right text-xs font-semibold px-4 py-2" style={{ color: '#94a3b8' }}>סטטוס</th>
                  <th className="text-right text-xs font-semibold px-4 py-2" style={{ color: '#94a3b8' }}>אחראי</th>
                </tr>
              </thead>
              <tbody>
                {(cases ?? []).slice(0, 10).map(c => {
                  const sc = statusColor[c.status] ?? { bg: '#f1f5f9', text: '#475569' }
                  return (
                    <tr key={c.id} className="hover:bg-slate-50/70 transition-colors" style={{ borderBottom: '1px solid #f8fafc' }}>
                      <td className="px-4 py-2.5 font-mono text-xs" style={{ color: '#94a3b8' }}>{c.case_number ?? '—'}</td>
                      <td className="px-4 py-2.5">
                        <Link href={`/crm/cases/${c.id}`} className="font-semibold hover:text-blue-600 transition-colors text-sm" style={{ color: '#0f172a' }}>
                          {c.case_name}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className="text-xs font-medium px-2.5 py-1 rounded-full"
                          style={{ background: sc.bg, color: sc.text }}
                        >
                          {c.status}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-xs" style={{ color: '#94a3b8' }}>{c.assigned_to ?? '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Section></div>

    </div>
  )
}

/* ─────────────── Sub-components ─────────────── */

function StatCard({
  label, value, sub, subAlert, icon, accent, iconBg,
}: {
  label: string
  value: string | number
  sub?: string
  subAlert?: boolean
  icon: React.ReactNode
  accent: string
  iconBg: string
}) {
  return (
    <div
      className="rounded-xl p-4"
      style={{
        background: '#fff',
        border: '1px solid rgba(0,0,0,0.06)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        borderTop: `3px solid ${accent}`,
      }}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="text-xs font-semibold" style={{ color: '#94a3b8' }}>{label}</p>
        <div
          className="rounded-lg flex items-center justify-center shrink-0"
          style={{ width: 30, height: 30, background: iconBg }}
        >
          {icon}
        </div>
      </div>
      <p className="text-3xl font-bold leading-none tabular-nums" style={{ color: '#0f172a' }}>{value}</p>
      {sub && (
        <p className="text-xs mt-1.5" style={{ color: subAlert ? '#dc2626' : '#94a3b8', fontWeight: subAlert ? 600 : 400 }}>
          {sub}
        </p>
      )}
    </div>
  )
}

function Section({
  icon, title, badge, badgeColor, badgeText, children, href, hrefLabel,
}: {
  icon: React.ReactNode
  title: string
  badge?: number
  badgeColor?: string
  badgeText?: string
  children: React.ReactNode
  href?: string
  hrefLabel?: string
}) {
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: '#fff',
        border: '1px solid rgba(0,0,0,0.06)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.03)',
      }}
    >
      <div
        className="flex items-center justify-between px-4 py-2.5"
        style={{ borderBottom: '1px solid #f1f5f9' }}
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-semibold text-sm" style={{ color: '#0f172a' }}>{title}</span>
          {badge !== undefined && badge > 0 && (
            <span
              className="text-xs font-bold px-2 py-0.5 rounded-full"
              style={{
                background: badgeColor ?? '#f1f5f9',
                color: badgeText ?? '#64748b',
              }}
            >
              {badge}
            </span>
          )}
        </div>
        {href && hrefLabel && (
          <Link href={href} className="text-xs font-medium flex items-center gap-1 hover:underline" style={{ color: '#3b82f6' }}>
            {hrefLabel} <ArrowLeft size={11} />
          </Link>
        )}
      </div>
      <div>{children}</div>
    </div>
  )
}

function AlertBanner({
  icon, bg, border, title, sub, href, linkColor,
}: {
  icon: React.ReactNode
  bg: string
  border: string
  title: string
  sub?: string
  href: string
  linkColor: string
}) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-xl"
      style={{ background: bg, border: `1px solid ${border}` }}
    >
      <div className="shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold" style={{ color: linkColor }}>{title}</p>
        {sub && <p className="text-xs mt-0.5 truncate" style={{ color: linkColor, opacity: 0.75 }}>{sub}</p>}
      </div>
      <Link href={href} className="text-xs font-semibold shrink-0 flex items-center gap-1 hover:underline" style={{ color: linkColor }}>
        לצפייה <ArrowLeft size={11} />
      </Link>
    </div>
  )
}

function Tag({ children, color, text }: { children: React.ReactNode; color: string; text: string }) {
  return (
    <span
      className="text-xs font-medium px-2 py-0.5 rounded-full"
      style={{ background: color, color: text }}
    >
      {children}
    </span>
  )
}

function EmptyState({ text }: { text: string }) {
  return <p className="text-sm text-center py-8" style={{ color: '#94a3b8' }}>{text}</p>
}
