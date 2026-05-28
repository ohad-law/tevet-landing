import { createClient } from '@/lib/supabase/server'
import LeadsManager from '@/components/crm/LeadsManager'
import ExportCsvButton from '@/components/crm/ExportCsvButton'

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
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">ניהול לידים</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {(leads?.length ?? 0) + (talushLeads?.length ?? 0)} לידים בסה"כ
          </p>
        </div>
        <ExportCsvButton
          data={[
            ...(leads ?? []).map((l: any) => ({
              'סוג': 'כללי',
              'שם': l.full_name ?? '',
              'טלפון': l.phone ?? '',
              'אימייל': l.email ?? '',
              'סטטוס': l.status,
              'מקור': l.source ?? '',
              'קמפיין': l.campaign_name ?? '',
              'תאריך': new Date(l.created_at).toLocaleDateString('he-IL'),
            })),
            ...(talushLeads ?? []).map((l: any) => ({
              'סוג': 'תלוש שכר',
              'שם': l.full_name ?? '',
              'טלפון': l.phone ?? '',
              'אימייל': l.email ?? '',
              'סטטוס': l.status,
              'מקור': l.source ?? '',
              'קמפיין': l.campaign_name ?? '',
              'תאריך': new Date(l.created_at).toLocaleDateString('he-IL'),
            })),
          ]}
          filename="לידים"
        />
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

      <LeadsManager leads={leads ?? []} talushLeads={talushLeads ?? []} />
    </div>
  )
}
