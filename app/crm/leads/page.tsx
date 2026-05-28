import { createClient } from '@/lib/supabase/server'
import LeadCard from '@/components/crm/LeadCard'

export const revalidate = 0

export default async function LeadsPage() {
  const supabase = await createClient()

  const [{ data: leads }, { data: talushLeads }] = await Promise.all([
    supabase.from('leads').select('*').order('created_at', { ascending: false }),
    supabase.from('leads_talush').select('*').order('created_at', { ascending: false }),
  ])

  const newLeads = (leads ?? []).filter((l: any) => !l.is_viewed).length
  const newTalush = (talushLeads ?? []).filter((l: any) => !l.is_viewed).length
  const byStatus = (arr: any[] = []) => ({
    new: arr.filter(l => l.status === 'חדש').length,
    active: arr.filter(l => l.status === 'בטיפול').length,
    converted: arr.filter(l => l.status === 'הפך ללקוח').length,
  })

  const lStats = byStatus(leads ?? [])
  const tStats = byStatus(talushLeads ?? [])

  return (
    <div className="space-y-8" style={{ fontFamily: 'Assistant, sans-serif' }}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">ניהול לידים</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {(leads?.length ?? 0) + (talushLeads?.length ?? 0)} לידים בסה"כ
          </p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'כלליים חדשים', value: lStats.new, color: 'text-blue-600' },
          { label: 'כלליים בטיפול', value: lStats.active, color: 'text-amber-600' },
          { label: 'כלליים ללקוח', value: lStats.converted, color: 'text-green-600' },
          { label: 'תלושים חדשים', value: tStats.new, color: 'text-blue-600' },
          { label: 'תלושים בטיפול', value: tStats.active, color: 'text-amber-600' },
          { label: 'תלושים ללקוח', value: tStats.converted, color: 'text-green-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-3 text-center">
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <section>
        <h2 className="font-bold text-slate-700 mb-3 flex items-center gap-2 text-sm">
          לידים כלליים
          <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-normal">{leads?.length ?? 0}</span>
          {newLeads > 0 && (
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">{newLeads} חדשים</span>
          )}
        </h2>
        <div className="space-y-2">
          {(leads ?? []).map((lead: any) => (
            <LeadCard key={lead.id} lead={lead} table="leads" />
          ))}
          {(leads?.length ?? 0) === 0 && (
            <p className="text-slate-400 text-sm py-8 text-center bg-white rounded-xl border border-slate-200">אין לידים עדיין</p>
          )}
        </div>
      </section>

      <section>
        <h2 className="font-bold text-slate-700 mb-3 flex items-center gap-2 text-sm">
          לידים תלושי שכר
          <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-normal">{talushLeads?.length ?? 0}</span>
          {newTalush > 0 && (
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">{newTalush} חדשים</span>
          )}
        </h2>
        <div className="space-y-2">
          {(talushLeads ?? []).map((lead: any) => (
            <LeadCard key={lead.id} lead={lead} table="leads_talush" />
          ))}
          {(talushLeads?.length ?? 0) === 0 && (
            <p className="text-slate-400 text-sm py-8 text-center bg-white rounded-xl border border-slate-200">אין לידי תלושים עדיין</p>
          )}
        </div>
      </section>
    </div>
  )
}
