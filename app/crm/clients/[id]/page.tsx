import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowRight, Phone, Mail, MapPin, Hash, CheckSquare, Scale, Pencil, MessageCircle, Banknote } from 'lucide-react'
import ClientNotesEditor from '@/components/crm/ClientNotesEditor'

export const revalidate = 0

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: client }, { data: cases }, { data: tasks }, { data: income }] = await Promise.all([
    supabase.from('clients').select('*').eq('id', id).single(),
    supabase.from('cases').select('id, case_number, case_name, status, open_date, case_type').eq('client_id', id).order('created_at', { ascending: false }),
    supabase.from('tasks').select('id, description, status, priority, due_date, case_id').eq('client_id', id).neq('status', 'הושלמה').order('due_date'),
    supabase.from('income').select('id, amount, date, description, status').eq('client_id', id).order('date', { ascending: false }),
  ])

  if (!client) notFound()

  const today = new Date().toISOString().split('T')[0]
  const caseNameMap = Object.fromEntries((cases ?? []).map(c => [c.id, { name: c.case_name, id: c.id }]))
  const activeCases = (cases ?? []).filter(c => c.status !== 'ארכיון')
  const openTasks = tasks ?? []
  const paidIncome = (income ?? []).filter(i => i.status === 'שולם')
  const totalPaid = paidIncome.reduce((s, i) => s + (Number(i.amount) || 0), 0)
  const pendingIncome = (income ?? []).filter(i => i.status === 'ממתין')
  const totalPending = pendingIncome.reduce((s, i) => s + (Number(i.amount) || 0), 0)

  const statusColor: Record<string, string> = {
    'תיק נכנס': 'bg-slate-100 text-slate-600',
    'עריכת כתב תביעה': 'bg-amber-100 text-amber-700',
    'מעקב מספר הליך בנט': 'bg-blue-100 text-blue-700',
    'הוכחות': 'bg-red-100 text-red-700',
    'סיכומים': 'bg-violet-100 text-violet-700',
    'פסק דין': 'bg-green-100 text-green-700',
    'ארכיון': 'bg-slate-100 text-slate-400',
  }

  return (
    <div className="space-y-6" style={{ fontFamily: 'Assistant, sans-serif' }}>

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <Link href="/crm/clients" className="hover:text-slate-600 transition flex items-center gap-1">
          <ArrowRight size={14} />
          לקוחות
        </Link>
        <span>/</span>
        <span className="text-slate-600 font-medium">{client.full_name}</span>
      </div>

      {/* Header card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-start gap-5">
          <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center text-white text-xl font-bold shrink-0">
            {client.full_name?.charAt(0) ?? '?'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold text-slate-900">{client.full_name}</h1>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                client.status === 'פעיל' ? 'bg-green-100 text-green-700' :
                client.status === 'ממתין' ? 'bg-amber-100 text-amber-700' :
                'bg-slate-100 text-slate-500'
              }`}>
                {client.status}
              </span>
              <Link
                href={`/crm/clients/${id}/edit`}
                className="flex items-center gap-1 text-xs text-slate-500 border border-slate-200 px-2.5 py-1 rounded-lg hover:bg-slate-50 transition font-medium"
              >
                <Pencil size={11} />
                ערוך
              </Link>
            </div>
            <div className="flex flex-wrap gap-4 mt-3">
              {client.phone && (
                <a href={`tel:${client.phone}`} className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-blue-600 transition">
                  <Phone size={14} className="text-slate-400" />
                  {client.phone}
                </a>
              )}
              {client.phone && (
                <a
                  href={`https://wa.me/972${client.phone.replace(/^0/, '').replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 border border-green-200 px-2.5 py-1 rounded-lg hover:bg-green-100 transition"
                >
                  <MessageCircle size={12} />
                  WhatsApp
                </a>
              )}
              {client.email && (
                <a href={`mailto:${client.email}`} className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-blue-600 transition">
                  <Mail size={14} className="text-slate-400" />
                  {client.email}
                </a>
              )}
              {client.address && (
                <span className="flex items-center gap-1.5 text-sm text-slate-500">
                  <MapPin size={14} className="text-slate-400" />
                  {client.address}
                </span>
              )}
              {client.id_number && (
                <span className="flex items-center gap-1.5 text-sm text-slate-500">
                  <Hash size={14} className="text-slate-400" />
                  ת.ז. {client.id_number}
                </span>
              )}
            </div>
            <ClientNotesEditor clientId={id} initialNotes={client.notes ?? null} />
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <p className="text-2xl font-bold text-slate-900">{cases?.length ?? 0}</p>
          <p className="text-xs text-slate-400 mt-0.5">תיקים סה"כ</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{activeCases.length}</p>
          <p className="text-xs text-slate-400 mt-0.5">תיקים פעילים</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <p className={`text-2xl font-bold ${openTasks.length > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
            {openTasks.length}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">משימות פתוחות</p>
        </div>
        <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-4 text-center">
          <p className="text-2xl font-bold text-emerald-700">₪{totalPaid.toLocaleString()}</p>
          <p className="text-xs text-slate-400 mt-0.5">שולם סה"כ</p>
          {totalPending > 0 && (
            <p className="text-xs text-amber-600 mt-0.5 font-medium">+ ₪{totalPending.toLocaleString()} ממתין</p>
          )}
        </div>
      </div>

      {/* Cases */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Scale size={15} className="text-slate-400" />
            <h2 className="font-semibold text-slate-800 text-sm">תיקים</h2>
            <span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">{cases?.length ?? 0}</span>
          </div>
          <Link
            href={`/crm/cases/new?client_id=${id}`}
            className="text-xs text-blue-600 hover:text-blue-700 font-medium transition flex items-center gap-1"
          >
            + תיק חדש
          </Link>
        </div>
        {(cases?.length ?? 0) === 0 ? (
          <p className="text-sm text-slate-400 text-center py-8">אין תיקים ללקוח זה</p>
        ) : (
          <div className="divide-y divide-slate-50">
            {(cases ?? []).map(c => (
              <Link key={c.id} href={`/crm/cases/${c.id}`}
                className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50/60 transition-colors group">
                <div>
                  <p className="text-sm font-medium text-slate-800 group-hover:text-blue-600 transition-colors">
                    {c.case_name}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {c.case_type && <span>{c.case_type} · </span>}
                    <span className="font-mono">#{c.case_number}</span>
                    {c.open_date && <span> · נפתח {c.open_date}</span>}
                  </p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
                  statusColor[c.status] ?? 'bg-slate-100 text-slate-500'
                }`}>
                  {c.status}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Open Tasks */}
      {openTasks.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-2">
            <CheckSquare size={15} className="text-slate-400" />
            <h2 className="font-semibold text-slate-800 text-sm">משימות פתוחות</h2>
            <span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">{openTasks.length}</span>
          </div>
          <div className="divide-y divide-slate-50">
            {openTasks.map(t => {
              const overdue = t.due_date && t.due_date < today
              const relatedCase = t.case_id ? caseNameMap[t.case_id] : null
              return (
                <div key={t.id} className="px-5 py-3 flex items-center justify-between gap-3">
                  <div className="flex items-start gap-2 min-w-0">
                    <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                      t.priority === 'דחוף' ? 'bg-red-500' :
                      t.priority === 'גבוה' ? 'bg-amber-500' : 'bg-slate-300'
                    }`} />
                    <div className="min-w-0">
                      <p className="text-sm text-slate-700 truncate">{t.description}</p>
                      {relatedCase && (
                        <Link href={`/crm/cases/${relatedCase.id}`} className="text-xs text-blue-500 hover:underline truncate block mt-0.5">
                          {relatedCase.name}
                        </Link>
                      )}
                    </div>
                  </div>
                  {t.due_date && (
                    <span className={`text-xs font-mono shrink-0 ${overdue ? 'text-red-600 font-semibold' : 'text-slate-400'}`}>
                      {t.due_date}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Income */}
      {(income?.length ?? 0) > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Banknote size={15} className="text-slate-400" />
              <h2 className="font-semibold text-slate-800 text-sm">תשלומים</h2>
              <span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">{income!.length}</span>
            </div>
          </div>
          <div className="divide-y divide-slate-50">
            {income!.map(i => (
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
    </div>
  )
}
