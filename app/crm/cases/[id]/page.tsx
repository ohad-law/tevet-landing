import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  ArrowRight,
  Calendar,
  User,
  Hash,
  AlertCircle,
  Banknote,
} from 'lucide-react'
import CaseStatusSelect from '@/components/crm/CaseStatusSelect'
import CaseTasksSection from '@/components/crm/CaseTasksSection'
import CaseHearingsSection from '@/components/crm/CaseHearingsSection'
import CaseNotesSection from '@/components/crm/CaseNotesSection'
import CaseFeeToggle from '@/components/crm/CaseFeeToggle'
import PrintButton from '@/components/crm/PrintButton'
import CaseAIAgent from '@/components/crm/CaseAIAgent'
import SignatureButton from '@/components/crm/SignatureButton'

export const revalidate = 0

import { CASE_STATUSES, STATUS_COLOR } from '@/lib/case-statuses'

const STATUS_ORDER = CASE_STATUSES

export default async function CaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [
    { data: c },
    { data: client },
    { data: hearings },
    { data: tasks },
    { data: timeline },
    { data: caseIncome },
  ] = await Promise.all([
    supabase.from('cases').select('*').eq('id', id).single(),
    supabase.from('clients').select('id, full_name, phone, email, id_number').eq('id', id).maybeSingle(),
    supabase.from('hearings').select('*').eq('case_id', id).order('date', { ascending: true }),
    supabase.from('tasks').select('*').eq('case_id', id).order('created_at', { ascending: false }),
    supabase.from('case_timeline').select('*').eq('case_id', id).order('created_at', { ascending: true }),
    supabase.from('income').select('id, amount, date, description, status').eq('case_id', id).order('date', { ascending: false }),
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
              <CaseStatusSelect caseId={id} initialStatus={c.status} />
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
            <SignatureButton
              caseId={id}
              clientId={clientData?.id ?? ''}
              clientName={clientData?.full_name ?? ''}
              clientPhone={clientData?.phone ?? ''}
              clientEmail={clientData?.email ?? ''}
            />
            <PrintButton />
            <Link
              href={`/crm/cases/${id}/edit`}
              className="text-xs text-slate-500 border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition font-medium"
            >
              ערוך תיק
            </Link>
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
          ) : 'לא צוין'}
        </InfoCard>
        <InfoCard icon={<Calendar size={15} />} label="תאריך פתיחה">
          <span className="text-sm font-medium text-slate-800">{c.open_date ?? 'לא צוין'}</span>
        </InfoCard>
        <InfoCard icon={<Hash size={15} />} label="מספר הליך בנט">
          <span className="text-sm font-medium text-slate-800 font-mono">{c.net_hamishpat_number ?? 'לא צוין'}</span>
        </InfoCard>
        <InfoCard icon={<User size={15} />} label="אחראי תיק">
          <span className="text-sm font-medium text-slate-800">{c.assigned_to || 'לא צוין'}</span>
        </InfoCard>
        <InfoCard icon={<Banknote size={15} />} label="ערך תביעה">
          <span className="text-sm font-medium text-slate-800">
            {c.value ? `₪${Number(c.value).toLocaleString()}` : 'לא צוין'}
          </span>
        </InfoCard>
        <InfoCard icon={<Banknote size={15} />} label={'שכ"ט'}>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-800">
              {c.fee_amount ? `₪${Number(c.fee_amount).toLocaleString()}` : 'לא צוין'}
            </span>
            <CaseFeeToggle caseId={id} initialStatus={c.fee_status ?? null} />
          </div>
        </InfoCard>
        <InfoCard icon={<Calendar size={15} />} label="יעד סיום">
          <span className={`text-sm font-medium ${
            c.target_close_date && c.target_close_date < today ? 'text-red-600' : 'text-slate-800'
          }`}>
            {c.target_close_date ?? 'לא צוין'}
          </span>
        </InfoCard>
        <InfoCard icon={<User size={15} />} label="נתבע">
          <span className="text-sm font-medium text-slate-800">{c.defendant_name || 'לא צוין'}</span>
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

        <CaseHearingsSection caseId={id} initialHearings={hearings ?? []} today={today} />

        {/* Tasks */}
        <CaseTasksSection caseId={id} initialTasks={tasks ?? []} today={today} />
      </div>

      {/* Timeline + Notes */}
      {/* Income entries for this case */}
      {(caseIncome?.length ?? 0) > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Banknote size={15} className="text-slate-400" />
              <h2 className="font-semibold text-slate-800 text-sm">תשלומים בתיק</h2>
              <span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">{caseIncome!.length}</span>
            </div>
            <span className="text-xs font-semibold text-slate-700">
              סה"כ שולם: ₪{caseIncome!.filter(i => i.status === 'שולם').reduce((s, i) => s + (i.amount ?? 0), 0).toLocaleString()}
            </span>
          </div>
          <div className="divide-y divide-slate-50">
            {caseIncome!.map(i => (
              <div key={i.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-800">{i.description || 'תשלום'}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{i.date}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <p className="font-semibold text-slate-800">₪{Number(i.amount ?? 0).toLocaleString()}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    i.status === 'שולם' ? 'bg-green-100 text-green-700' :
                    i.status === 'ממתין' ? 'bg-amber-100 text-amber-700' :
                    'bg-slate-100 text-slate-500'
                  }`}>{i.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <CaseNotesSection caseId={id} initialTimeline={timeline ?? []} />

      {/* AI Legal Agent */}
      <CaseAIAgent caseId={id} caseName={c.case_name as string} />
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
