'use client'

import { useEffect, useState, useCallback } from 'react'
import { CheckCircle2, Clock, AlertCircle, Download, Send, Loader2, PenLine, FileText } from 'lucide-react'
import Link from 'next/link'

interface SigRequest {
  id: string
  document_name: string
  status: 'pending' | 'signed' | 'expired'
  created_at: string
  signed_at: string | null
  expires_at: string
  token: string
  case_id: string
  signed_url?: string
  cases: { case_name: string; case_number: string } | null
  clients: { full_name: string; phone: string; email: string } | null
}

function daysSince(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
}

function StatusBadge({ req }: { req: SigRequest }) {
  const days = daysSince(req.created_at)
  if (req.status === 'signed') {
    return (
      <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
        style={{ background: 'rgba(22,163,74,0.1)', color: '#16a34a' }}>
        <CheckCircle2 size={12} /> נחתם
      </span>
    )
  }
  if (req.status === 'expired') {
    return (
      <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
        style={{ background: '#f1f5f9', color: '#94a3b8' }}>
        <AlertCircle size={12} /> פג תוקף
      </span>
    )
  }
  if (days >= 7) {
    return (
      <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
        style={{ background: 'rgba(220,38,38,0.1)', color: '#dc2626' }}>
        <AlertCircle size={12} /> לא נפתח {days} ימים
      </span>
    )
  }
  return (
    <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
      style={{ background: 'rgba(217,119,6,0.1)', color: '#d97706' }}>
      <Clock size={12} /> ממתין
    </span>
  )
}

export default function SignaturesPage() {
  const [reqs,    setReqs]    = useState<SigRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [filter,  setFilter]  = useState<'all' | 'pending' | 'signed'>('all')

  const fetchReqs = useCallback(async () => {
    const res  = await fetch('/api/crm/signatures')
    const data = await res.json()
    setReqs(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchReqs() }, [fetchReqs])

  const filtered = reqs.filter(r => filter === 'all' || r.status === filter)
  const pending  = reqs.filter(r => r.status === 'pending').length
  const signed   = reqs.filter(r => r.status === 'signed').length

  async function sendReminder(req: SigRequest) {
    if (!req.clients?.phone) { alert('אין מספר טלפון ללקוח'); return }
    await fetch('/api/crm/signatures', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // We create a reminder by re-sending WhatsApp
      body: JSON.stringify({
        reminder: true, token: req.token,
        clientPhone: req.clients.phone,
        clientName:  req.clients.full_name,
        docName:     req.document_name,
      }),
    })
    alert('תזכורת נשלחה בוואטסאפ ✅')
  }

  return (
    <div style={{ fontFamily: "'Assistant',sans-serif", color: '#1e293b' }} className="space-y-5">

      <div className="crm-in crm-d1">
        <h1 className="text-3xl font-extrabold tracking-tight" style={{ color: '#0f172a' }}>חתימות דיגיטליות</h1>
        <p className="text-sm mt-1" style={{ color: '#94a3b8' }}>
          {pending > 0 ? `${pending} ממתינות לחתימה` : 'כל המסמכים טופלו'} · {signed} נחתמו סה"כ
        </p>
      </div>

      {/* Stats */}
      <div className="crm-in crm-d2 grid grid-cols-3 gap-3">
        {[
          { label: 'סה"כ נשלחו', val: reqs.length,  color: '#475569' },
          { label: 'ממתינים',    val: pending,       color: '#d97706' },
          { label: 'נחתמו',      val: signed,        color: '#16a34a' },
        ].map(s => (
          <div key={s.label} className="rounded-xl p-4 text-center" style={{ background: '#fff', border: '1px solid #eaecf0' }}>
            <p className="text-2xl font-extrabold" style={{ color: s.color }}>{s.val}</p>
            <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="crm-in crm-d3 flex gap-2">
        {(['all','pending','signed'] as const).map(f => (
          <button key={f}
            onClick={() => setFilter(f)}
            className="px-4 py-2 rounded-lg text-xs font-semibold transition-colors"
            style={{
              background: filter === f ? '#0f172a' : '#f1f5f9',
              color:      filter === f ? '#fff'    : '#64748b',
            }}>
            {f === 'all' ? 'הכל' : f === 'pending' ? 'ממתינים' : 'נחתמו'}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 size={24} color="#94a3b8" className="animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl p-12 text-center" style={{ background: '#fff', border: '1px solid #eaecf0' }}>
          <PenLine size={36} className="mx-auto mb-3" color="#cbd5e1" />
          <p className="font-semibold text-sm" style={{ color: '#475569' }}>אין בקשות חתימה</p>
          <p className="text-xs mt-1" style={{ color: '#94a3b8' }}>שלח מסמך לחתימה מתוך תיק לקוח</p>
        </div>
      ) : (
        <div className="crm-in crm-d4 rounded-xl overflow-hidden" style={{ background: '#fff', border: '1px solid #eaecf0' }}>
          <div className="divide-y divide-slate-50">
            {filtered.map(req => (
              <div key={req.id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors">
                <div className="shrink-0">
                  <FileText size={20} color="#94a3b8" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: '#0f172a' }}>
                    {req.document_name}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-xs" style={{ color: '#64748b' }}>
                      {req.clients?.full_name ?? 'לא צוין'}
                    </span>
                    {req.cases && (
                      <span className="text-xs" style={{ color: '#94a3b8' }}>
                        · {req.cases.case_name}
                      </span>
                    )}
                    <span className="text-xs" style={{ color: '#94a3b8' }}>
                      · נשלח {daysSince(req.created_at) === 0 ? 'היום' : `לפני ${daysSince(req.created_at)} ימים`}
                    </span>
                    {req.signed_at && (
                      <span className="text-xs" style={{ color: '#16a34a' }}>
                        · נחתם {new Date(req.signed_at).toLocaleDateString('he-IL')}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <StatusBadge req={req} />
                  {req.status === 'pending' && (
                    <button onClick={() => sendReminder(req)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors"
                      style={{ background: '#f1f5f9', color: '#475569' }}
                      title="שלח תזכורת">
                      <Send size={12} /> תזכורת
                    </button>
                  )}
                  {req.signed_url && (
                    <a href={req.signed_url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium"
                      style={{ background: 'rgba(22,163,74,0.08)', color: '#16a34a' }}>
                      <Download size={12} /> הורד
                    </a>
                  )}
                  {req.case_id && (
                    <Link href={`/crm/cases/${req.case_id}`}
                      className="text-xs px-2.5 py-1.5 rounded-lg"
                      style={{ background: '#f1f5f9', color: '#475569' }}>
                      תיק
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
