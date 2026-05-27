import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  ArrowRight,
  Calendar,
  User,
  Hash,
  Scale,
  Clock,
  CheckSquare,
  AlertCircle,
  Banknote,
  FileText,
  MapPin,
} from 'lucide-react'

export const revalidate = 0

const STATUS_COLOR: Record<string, { bg: string; text: string; dot: string }> = {
  'תיק נכנס':                  { bg: 'bg-slate-100',   text: 'text-slate-600',   dot: 'bg-slate-400' },
  'עריכת כתב תביעה':            { bg: 'bg-amber-100',  text: 'text-amber-700',  dot: 'bg-amber-500' },
  'מעקב מספר הליך בנט':         { bg: 'bg-blue-100',   text: 'text-blue-700',   dot: 'bg-blue-500' },
  'מסירה אישית/דואר ישראל':     { bg: 'bg-orange-100', text: 'text-orange-700', dot: 'bg-orange-500' },
  'הודעה על המצאה':             { bg: 'bg-purple-100', text: 'text-purple-700', dot: 'bg-purple-500' },
  'תצהיר גילוי מסמכים':         { bg: 'bg-indigo-100', text: 'text-indigo-700', dot: 'bg-indigo-500' },
  'תצהיר עדות ראשית':           { bg: 'bg-pink-100',   text: 'text-pink-700',   dot: 'bg-pink-500' },
  'הוכחות':                     { bg: 'bg-red-100',    text: 'text-red-700',    dot: 'bg-red-500' },
  'סיכומים':                    { bg: 'bg-violet-100', text: 'text-violet-700', dot: 'bg-violet-500' },
  'פסק דין':                    { bg: 'bg-green-100',  text: 'text-green-700',  dot: 'bg-green-500' },
  'ארכיון':                     { bg: 'bg-slate-100',  text: 'text-slate-400',  dot: 'bg-slate-300' },
}

const STATUS_ORDER = [
  'תיק נכנס', 'עריכת כתב תביעה', 'מעקב מספר הליך בנט',
  'מסירה אישית/דואר ישראל', 'הודעה על המצאה', 'תצהיר גילוי מסמכים',
  'תצהיר עדות ראשית', 'הוכחות', 'סיכומים', 'פסק דין', 'ארכיון',
]

export default async function CaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [
    { data: c },
    { data: client },
    { data: hearings },
    { data: tasks },
    { data: timeline },
  ] = await Promise.all([
    supabase.from('cases').select('*').eq('id', id).single(),
    supabase.from('clients').select('id, full_name, phone, email, id_number').eq('id', id).maybeSingle(),
    supabase.from('hearings').select('*').eq('case_id', id).order('date', { ascending: true }),
    supabase.from('tasks').select('*').eq('case_id', id).order('created_at', { ascending: false }),
    supabase.from('case_timeline').select('*').eq('case_id', id).order('created_at', { ascending: true }),
  ])

  if (!c) notFound()

  // Fetch client separately with correct client_id
  const { data: clientData } = await supabase
    .from('clients')
    .select('id, full_name, phone, email, id_number')
    .eq('id', c.client_id ?? '')
    .maybeSingle()

  const today = new Date().toISOString().split('T')[0]
  const sc = STATUS_COLOR[c.status] ?? STATUS_COLOR['תיק נכנס']
  const currentStatusIndex = STATUS_ORDER.indexOf(c.status)
  const openTasks = (tasks ?? []).filter(t => t.status !== 'הושלמה')
  const overdueTasks = openTasks.filter(t => t.due_date && t.due_date < today)
  const upcomingHearings = (hearings ?? []).filter(h => h.date >= today)
  const pastHearings = (hearings ?? []).filter(h => h.date < today)

  return (
    <div className="space-y-6" style={{ fontFamily: 'Assistant, sans-serif' }}>

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <Link href="/crm/cases" className="hover:text-slate-600 transition flex items-center gap-1">
          <ArrowRight size={14} />
          תיקים
        </Link>
        <span>/</span>
        <span className="text-slate-600 font-medium">{c.case_name}</span>
      </div>

      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${sc.bg} ${sc.text}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                {c.status}
              </span>
              {c.case_number && (
                <span className="text-xs text-slate-400 font-mono bg-slate-50 border border-slate-200 px-2 py-0.5 rounded">
                  #{c.case_number}
                </span>
              )}
            </div>
            <h1 className="text-xl font-bold text-slate-900 mt-2">{c.case_name}</h1>
            {c.case_type && <p className="text-sm text-slate-500 mt-0.5">{c.case_type}</p>}
          </div>

          <div className="flex items-center gap-2">
            {overdueTasks.length > 0 && (
              <span className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 border border-red-200 px-3 py-1.5 rounded-lg font-medium">
                <AlertCircle size={13} />
                {overdueTasks.length} משימות באיחור
              </span>
            )}
          </div>
        </div>

        {/* Status progress bar */}
        {c.status !== 'ארכיון' && (
          <div className="mt-5">
            <div className="flex items-center gap-1 overflow-x-auto pb-1">
              {STATUS_ORDER.filter(s => s !== 'ארכיון').map((s, i) => {
                const idx = STATUS_ORDER.indexOf(s)
                const done = idx < currentStatusIndex
                const active = idx === currentStatusIndex
                const future = idx > currentStatusIndex
                return (
                  <div key={s} className="flex items-center gap-1 shrink-0">
                    <div className={`h-1.5 rounded-full transition-all ${
                      active ? 'w-6 bg-blue-600' :
                      done ? 'w-4 bg-blue-200' :
                      'w-4 bg-slate-100'
                    }`} />
                  </div>
                )
              })}
              <span className="text-xs text-slate-400 mr-2 shrink-0">
                שלב {currentStatusIndex + 1} מתוך {STATUS_ORDER.length - 1}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <InfoCard icon={<User size={15} />} label="לקוח">
          {clientData ? (
            <Link href={`/crm/clients/${clientData.id}`} className="text-blue-600 hover:underline font-medium text-sm">
              {clientData.full_name}
            </Link>
          ) : '—'}
        </InfoCard>
        <InfoCard icon={<Calendar size={15} />} label="תאריך פתיחה">
          <span className="text-sm font-medium text-slate-800">{c.open_date ?? '—'}</span>
        </InfoCard>
        <InfoCard icon={<Hash size={15} />} label="מספר הליך בנט">
          <span className="text-sm font-medium text-slate-800 font-mono">{c.net_hamishpat_number ?? '—'}</span>
        </InfoCard>
        <InfoCard icon={<User size={15} />} label="אחראי תיק">
          <span className="text-sm font-medium text-slate-800">{c.assigned_to || '—'}</span>
        </InfoCard>
        <InfoCard icon={<Banknote size={15} />} label="ערך תביעה">
          <span className="text-sm font-medium text-slate-800">
            {c.value ? `₪${Number(c.value).toLocaleString()}` : '—'}
          </span>
        </InfoCard>
        <InfoCard icon={<Banknote size={15} />} label={'שכ"ט'}>
          <div>
            <span className="text-sm font-medium text-slate-800">
              {c.fee_amount ? `₪${Number(c.fee_amount).toLocaleString()}` : '—'}
            </span>
            {c.fee_status && (
              <span className={`mr-2 text-xs px-1.5 py-0.5 rounded font-medium ${
                c.fee_status === 'שולמה' ? 'bg-green-100 text-green-700' :
                c.fee_status === 'הוחזרה' ? 'bg-red-100 text-red-600' :
                'bg-amber-100 text-amber-700'
              }`}>
                {c.fee_status}
              </span>
            )}
          </div>
        </InfoCard>
        <InfoCard icon={<Calendar size={15} />} label="יעד סיום">
          <span className={`text-sm font-medium ${
            c.target_close_date && c.target_close_date < today ? 'text-red-600' : 'text-slate-800'
          }`}>
            {c.target_close_date ?? '—'}
          </span>
        </InfoCard>
        <InfoCard icon={<User size={15} />} label="נתבע">
          <span className="text-sm font-medium text-slate-800">{c.defendant_name || '—'}</span>
        </InfoCard>
      </div>

      {/* Parties + Description */}
      {(c.parties || c.case_description) && (
        <div className="grid lg:grid-cols-2 gap-4">
          {c.parties && (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">צדדים</h3>
              <p className="text-sm text-slate-700 whitespace-pre-line">{c.parties}</p>
            </div>
          )}
          {c.case_description && (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">תיאור</h3>
              <p className="text-sm text-slate-700 whitespace-pre-line">{c.case_description}</p>
            </div>
          )}
        </div>
      )}

      {/* Two columns: Hearings + Tasks */}
      <div className="grid lg:grid-cols-2 gap-5">

        {/* Hearings */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar size={15} className="text-slate-400" />
              <h2 className="font-semibold text-slate-800 text-sm">דיונים</h2>
              <span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">{(hearings ?? []).length}</span>
            </div>
          </div>

          {upcomingHearings.length === 0 && pastHearings.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">אין דיונים רשומים</p>
          ) : (
            <div className="divide-y divide-slate-50">
              {upcomingHearings.map(h => (
                <div key={h.id} className={`px-5 py-3 flex items-start justify-between gap-3 ${h.date === today ? 'bg-blue-50/30' : ''}`}>
                  <div>
                    <p className="text-sm font-medium text-slate-800">{h.description || 'דיון'}</p>
                    {h.location && (
                      <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                        <MapPin size={11} /> {h.location}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-xs font-bold font-mono ${h.date === today ? 'text-blue-600' : 'text-slate-700'}`}>
                      {h.date === today ? 'היום' : h.date}
                    </p>
                    {h.time && <p className="text-xs text-slate-400">{h.time}</p>}
                  </div>
                </div>
              ))}
              {pastHearings.length > 0 && (
                <details className="group">
                  <summary className="px-5 py-3 text-xs text-slate-400 cursor-pointer hover:text-slate-600">
                    דיונים שעברו ({pastHearings.length})
                  </summary>
                  {pastHearings.map(h => (
                    <div key={h.id} className="px-5 py-2.5 flex items-center justify-between opacity-50 border-t border-slate-50">
                      <p className="text-xs text-slate-600">{h.description || 'דיון'}</p>
                      <p className="text-xs font-mono text-slate-400">{h.date}</p>
                    </div>
                  ))}
                </details>
              )}
            </div>
          )}
        </div>

        {/* Tasks */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckSquare size={15} className="text-slate-400" />
              <h2 className="font-semibold text-slate-800 text-sm">משימות</h2>
              <span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">{openTasks.length}</span>
            </div>
            <Link href="/crm/tasks" className="text-xs text-blue-600 hover:underline">הכל</Link>
          </div>

          {openTasks.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">אין משימות פתוחות</p>
          ) : (
            <div className="divide-y divide-slate-50">
              {openTasks.slice(0, 8).map(t => {
                const overdue = t.due_date && t.due_date < today
                return (
                  <div key={t.id} className="px-5 py-3 flex items-center justify-between gap-3">
                    <div className="flex items-start gap-2 min-w-0">
                      <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                        t.priority === 'דחוף' ? 'bg-red-500' :
                        t.priority === 'גבוה' ? 'bg-amber-500' : 'bg-slate-300'
                      }`} />
                      <p className="text-sm text-slate-700 truncate">{t.description}</p>
                    </div>
                    <div className="text-right shrink-0">
                      {t.due_date && (
                        <span className={`text-xs font-mono ${overdue ? 'text-red-600 font-semibold' : 'text-slate-400'}`}>
                          {t.due_date}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Timeline */}
      {(timeline ?? []).length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-2">
            <Clock size={15} className="text-slate-400" />
            <h2 className="font-semibold text-slate-800 text-sm">ציר זמן</h2>
          </div>
          <div className="px-5 py-4">
            <div className="relative">
              <div className="absolute right-2 top-0 bottom-0 w-px bg-slate-100" />
              <div className="space-y-4">
                {(timeline ?? []).map((event, i) => (
                  <div key={event.id} className="flex items-start gap-4 pr-8 relative">
                    <div className="absolute right-0 w-4 h-4 rounded-full bg-blue-100 border-2 border-blue-400 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-800">{event.description}</p>
                      <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                        {event.event_type && <span className="font-medium text-slate-500">{event.event_type}</span>}
                        {event.created_by && <span>· {event.created_by}</span>}
                        {event.created_at && <span>· {new Date(event.created_at).toLocaleDateString('he-IL')}</span>}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function InfoCard({ icon, label, children }: {
  icon: React.ReactNode
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 px-4 py-3.5">
      <div className="flex items-center gap-1.5 text-slate-400 mb-1.5">
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <div>{children}</div>
    </div>
  )
}
