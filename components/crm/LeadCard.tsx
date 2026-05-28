'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Phone, MessageCircle, ChevronDown } from 'lucide-react'

type Lead = {
  id: string
  full_name: string | null
  phone: string | null
  email: string | null
  status: string
  is_viewed: boolean
  created_at: string
  source?: string | null
  campaign_name?: string | null
  employer_name?: string | null
  issue_description?: string | null
}

type Props = {
  lead: Lead
  table: 'leads' | 'leads_talush'
}

const STATUSES = ['חדש', 'בטיפול', 'הפך ללקוח', 'לא רלוונטי']

const statusStyle: Record<string, string> = {
  'חדש': 'bg-blue-100 text-blue-700',
  'בטיפול': 'bg-yellow-100 text-yellow-700',
  'הפך ללקוח': 'bg-green-100 text-green-700',
  'לא רלוונטי': 'bg-slate-100 text-slate-500',
}

export default function LeadCard({ lead, table }: Props) {
  const [status, setStatus] = useState(lead.status)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  async function changeStatus(newStatus: string) {
    if (newStatus === status) { setOpen(false); return }
    setSaving(true)
    setStatus(newStatus)
    setOpen(false)
    await fetch(`/api/crm/leads/${lead.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table, status: newStatus }),
    })
    setSaving(false)
    router.refresh()
  }

  const whatsappUrl = lead.phone
    ? `https://wa.me/972${lead.phone.replace(/^0/, '').replace(/\D/g, '')}`
    : null

  return (
    <div className={`bg-white rounded-xl border px-5 py-4 flex items-start justify-between gap-4 ${!lead.is_viewed ? 'border-blue-200 bg-blue-50/20' : 'border-slate-200'}`}>
      <div className="flex items-start gap-3 min-w-0">
        {!lead.is_viewed && <div className="w-2 h-2 bg-blue-500 rounded-full shrink-0 mt-1.5" />}
        <div className="min-w-0">
          <p className="font-semibold text-slate-800">{lead.full_name ?? 'ללא שם'}</p>
          <div className="flex flex-wrap gap-3 mt-1.5">
            {lead.phone && (
              <a href={`tel:${lead.phone}`} className="flex items-center gap-1 text-xs text-slate-500 hover:text-blue-600 transition">
                <Phone size={11} />
                {lead.phone}
              </a>
            )}
            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-green-700 hover:text-green-800 transition"
              >
                <MessageCircle size={11} />
                WhatsApp
              </a>
            )}
            {lead.email && (
              <a href={`mailto:${lead.email}`} className="text-xs text-slate-400 hover:text-blue-600 transition truncate">
                {lead.email}
              </a>
            )}
          </div>
          {lead.employer_name && (
            <p className="text-xs text-slate-500 mt-1">מעסיק: {lead.employer_name}</p>
          )}
          {lead.issue_description && (
            <p className="text-xs text-slate-400 mt-1 line-clamp-2">{lead.issue_description}</p>
          )}
          {(lead.source || lead.campaign_name) && (
            <p className="text-xs text-slate-400 mt-1">
              {lead.source && `מקור: ${lead.source}`}
              {lead.campaign_name && ` · ${lead.campaign_name}`}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <span className="text-xs text-slate-400 font-mono">
          {new Date(lead.created_at).toLocaleDateString('he-IL')}
        </span>

        <div className="relative">
          <button
            onClick={() => setOpen(!open)}
            disabled={saving}
            className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium transition hover:opacity-80 ${statusStyle[status] ?? 'bg-slate-100 text-slate-500'}`}
          >
            {status}
            <ChevronDown size={10} />
          </button>
          {open && (
            <div className="absolute top-full mt-1 left-0 bg-white rounded-xl shadow-xl border border-slate-200 z-20 overflow-hidden min-w-36">
              {STATUSES.map(s => (
                <button
                  key={s}
                  onClick={() => changeStatus(s)}
                  className={`w-full text-right px-4 py-2.5 text-sm flex items-center gap-2 hover:bg-slate-50 transition ${s === status ? 'bg-blue-50 font-medium text-blue-700' : 'text-slate-700'}`}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
