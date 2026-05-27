import { createClient } from '@/lib/supabase/server'

export const revalidate = 0

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
}

type TalushLead = Lead & {
  employer_name: string | null
  issue_description: string | null
}

const statusStyle: Record<string, string> = {
  'חדש': 'bg-blue-100 text-blue-700',
  'בטיפול': 'bg-yellow-100 text-yellow-700',
  'הפך ללקוח': 'bg-green-100 text-green-700',
  'לא רלוונטי': 'bg-slate-100 text-slate-500',
}

function LeadCard({ lead, type }: { lead: Lead | TalushLead; type: 'general' | 'talush' }) {
  const talush = type === 'talush' ? (lead as TalushLead) : null
  return (
    <div className={`bg-white rounded-xl border px-5 py-4 flex items-center justify-between gap-4 ${!lead.is_viewed ? 'border-blue-200 bg-blue-50/20' : 'border-slate-200'}`}>
      <div className="flex items-center gap-3">
        {!lead.is_viewed && <div className="w-2 h-2 bg-blue-500 rounded-full shrink-0" />}
        <div>
          <p className="font-semibold text-slate-800">{lead.full_name ?? 'ללא שם'}</p>
          <p className="text-xs text-slate-400 mt-0.5">
            {lead.phone}
            {lead.email ? ` · ${lead.email}` : ''}
            {talush?.employer_name ? ` · ${talush.employer_name}` : ''}
          </p>
          {talush?.issue_description && (
            <p className="text-xs text-slate-500 mt-1 line-clamp-1">{talush.issue_description}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusStyle[lead.status] ?? 'bg-slate-100 text-slate-500'}`}>
          {lead.status}
        </span>
        <span className="text-xs text-slate-400 font-mono">
          {new Date(lead.created_at).toLocaleDateString('he-IL')}
        </span>
      </div>
    </div>
  )
}

export default async function LeadsPage() {
  const supabase = await createClient()

  const [{ data: leads }, { data: talushLeads }] = await Promise.all([
    supabase.from('leads').select('*').order('created_at', { ascending: false }),
    supabase.from('leads_talush').select('*').order('created_at', { ascending: false }),
  ])

  const newLeads = (leads ?? []).filter(l => !l.is_viewed).length
  const newTalush = (talushLeads ?? []).filter(l => !l.is_viewed).length

  return (
    <div className="space-y-8" style={{ fontFamily: 'Assistant, sans-serif' }}>
      <div>
        <h1 className="text-2xl font-bold text-slate-800">ניהול לידים</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          {newLeads} לידים כלליים חדשים · {newTalush} לידי תלושים חדשים
        </p>
      </div>

      <section>
        <h2 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
          🎯 לידים כלליים{' '}
          <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-normal">{leads?.length ?? 0}</span>
        </h2>
        <div className="space-y-2">
          {(leads as Lead[] ?? []).map(lead => (
            <LeadCard key={lead.id} lead={lead} type="general" />
          ))}
          {(leads?.length ?? 0) === 0 && (
            <p className="text-slate-400 text-sm py-6 text-center bg-white rounded-xl border border-slate-200">אין לידים עדיין</p>
          )}
        </div>
      </section>

      <section>
        <h2 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
          📄 לידים תלושי שכר{' '}
          <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-normal">{talushLeads?.length ?? 0}</span>
        </h2>
        <div className="space-y-2">
          {(talushLeads as TalushLead[] ?? []).map(lead => (
            <LeadCard key={lead.id} lead={lead} type="talush" />
          ))}
          {(talushLeads?.length ?? 0) === 0 && (
            <p className="text-slate-400 text-sm py-6 text-center bg-white rounded-xl border border-slate-200">אין לידי תלושים עדיין</p>
          )}
        </div>
      </section>
    </div>
  )
}
