'use client'
import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X, CheckCheck } from 'lucide-react'
import LeadCard from './LeadCard'

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
  leads: Lead[]
  talushLeads: Lead[]
}

const FILTER_STATUSES = ['הכל', 'חדש', 'בטיפול', 'הפך ללקוח', 'לא רלוונטי']

export default function LeadsManager({ leads, talushLeads }: Props) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('הכל')
  const [tab, setTab] = useState<'leads' | 'talush' | 'all'>('all')
  const [markingViewed, setMarkingViewed] = useState(false)
  const router = useRouter()

  const unviewedLeads = leads.filter(l => !l.is_viewed).length
  const unviewedTalush = talushLeads.filter(l => !l.is_viewed).length
  const totalUnviewed = (tab === 'leads' || tab === 'all' ? unviewedLeads : 0) + (tab === 'talush' || tab === 'all' ? unviewedTalush : 0)

  async function markAllViewed() {
    setMarkingViewed(true)
    const tables: ('leads' | 'leads_talush')[] = []
    if ((tab === 'leads' || tab === 'all') && unviewedLeads > 0) tables.push('leads')
    if ((tab === 'talush' || tab === 'all') && unviewedTalush > 0) tables.push('leads_talush')
    await Promise.all(tables.map(t => fetch('/api/crm/leads/mark-all-viewed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table: t }),
    })))
    setMarkingViewed(false)
    router.refresh()
  }

  const filter = (arr: Lead[]) => {
    const q = search.trim().toLowerCase()
    return arr.filter(l => {
      if (statusFilter !== 'הכל' && l.status !== statusFilter) return false
      if (!q) return true
      return (
        (l.full_name ?? '').toLowerCase().includes(q) ||
        (l.phone ?? '').includes(q) ||
        (l.email ?? '').toLowerCase().includes(q) ||
        (l.employer_name ?? '').toLowerCase().includes(q)
      )
    })
  }

  const filteredLeads = useMemo(() => filter(leads), [leads, search, statusFilter])
  const filteredTalush = useMemo(() => filter(talushLeads), [talushLeads, search, statusFilter])

  const showLeads = tab === 'all' || tab === 'leads'
  const showTalush = tab === 'all' || tab === 'talush'
  const totalShown = (showLeads ? filteredLeads.length : 0) + (showTalush ? filteredTalush.length : 0)

  return (
    <div className="space-y-5">
      {/* Filters bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-52">
          <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="חיפוש לפי שם, טלפון, אימייל..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pr-8 pl-8 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-400 focus:bg-white transition text-right"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X size={13} />
            </button>
          )}
        </div>

        <div className="flex gap-1 bg-slate-100 rounded-lg p-0.5">
          {(['all', 'leads', 'talush'] as const).map(t => (
            <button key={t}
              onClick={() => setTab(t)}
              className={`text-xs px-3 py-1 rounded-md font-medium transition ${
                tab === t ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {t === 'all' ? 'הכל' : t === 'leads' ? 'כלליים' : 'תלושי שכר'}
            </button>
          ))}
        </div>

        <div className="flex gap-1 bg-slate-100 rounded-lg p-0.5">
          {FILTER_STATUSES.map(s => (
            <button key={s}
              onClick={() => setStatusFilter(s)}
              className={`text-xs px-3 py-1 rounded-md font-medium transition ${
                statusFilter === s ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <span className="text-xs text-slate-400 mr-auto">{totalShown} לידים</span>
        {totalUnviewed > 0 && (
          <button
            onClick={markAllViewed}
            disabled={markingViewed}
            className="flex items-center gap-1.5 text-xs text-blue-600 border border-blue-200 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition disabled:opacity-50 font-medium"
          >
            <CheckCheck size={13} />
            {markingViewed ? '...' : `סמן הכל כנצפה (${totalUnviewed})`}
          </button>
        )}
      </div>

      {showLeads && (
        <section>
          <h2 className="font-bold text-slate-700 mb-3 flex items-center gap-2 text-sm">
            לידים כלליים
            <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-normal">{filteredLeads.length}</span>
          </h2>
          <div className="space-y-2">
            {filteredLeads.map(lead => (
              <LeadCard key={lead.id} lead={lead} table="leads" />
            ))}
            {filteredLeads.length === 0 && (
              <p className="text-slate-400 text-sm py-8 text-center bg-white rounded-xl border border-slate-200">
                {search || statusFilter !== 'הכל' ? 'אין תוצאות לחיפוש זה' : 'אין לידים עדיין'}
              </p>
            )}
          </div>
        </section>
      )}

      {showTalush && (
        <section>
          <h2 className="font-bold text-slate-700 mb-3 flex items-center gap-2 text-sm">
            לידים תלושי שכר
            <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-normal">{filteredTalush.length}</span>
          </h2>
          <div className="space-y-2">
            {filteredTalush.map(lead => (
              <LeadCard key={lead.id} lead={lead} table="leads_talush" />
            ))}
            {filteredTalush.length === 0 && (
              <p className="text-slate-400 text-sm py-8 text-center bg-white rounded-xl border border-slate-200">
                {search || statusFilter !== 'הכל' ? 'אין תוצאות לחיפוש זה' : 'אין לידי תלושים עדיין'}
              </p>
            )}
          </div>
        </section>
      )}
    </div>
  )
}
