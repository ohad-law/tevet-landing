import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export const revalidate = 0

export default async function CasesPage() {
  const supabase = await createClient()

  const [{ data: cases }, { data: clients }] = await Promise.all([
    supabase.from('cases').select('*').order('created_at', { ascending: false }),
    supabase.from('clients').select('id, full_name'),
  ])

  const clientMap = Object.fromEntries((clients ?? []).map(c => [c.id, c.full_name]))

  const statusColor: Record<string, string> = {
    'תיק נכנס': 'bg-slate-100 text-slate-600',
    'עריכת כתב תביעה': 'bg-yellow-100 text-yellow-700',
    'מעקב מספר הליך בנט': 'bg-blue-100 text-blue-700',
    'מסירה אישית/דואר ישראל': 'bg-orange-100 text-orange-700',
    'הודעה על המצאה': 'bg-purple-100 text-purple-700',
    'תצהיר גילוי מסמכים': 'bg-indigo-100 text-indigo-700',
    'תצהיר עדות ראשית': 'bg-pink-100 text-pink-700',
    'הוכחות': 'bg-red-100 text-red-700',
    'סיכומים': 'bg-amber-100 text-amber-700',
    'פסק דין': 'bg-green-100 text-green-700',
    'ארכיון': 'bg-slate-100 text-slate-400',
  }

  const activeCases = (cases ?? []).filter(c => c.status !== 'ארכיון' && c.status !== 'פסק דין')
  const archivedCases = (cases ?? []).filter(c => c.status === 'ארכיון' || c.status === 'פסק דין')

  return (
    <div className="space-y-6" style={{ fontFamily: 'Assistant, sans-serif' }}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">ניהול תיקים</h1>
          <p className="text-slate-500 text-sm mt-0.5">{activeCases.length} תיקים פעילים</p>
        </div>
        <Link href="/crm/cases/new" className="bg-slate-900 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-slate-800 transition">
          + תיק חדש
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs border-b border-slate-100">
                <th className="text-right font-semibold px-5 py-3">מס׳ תיק</th>
                <th className="text-right font-semibold px-5 py-3">שם התיק</th>
                <th className="text-right font-semibold px-5 py-3">לקוח</th>
                <th className="text-right font-semibold px-5 py-3">סוג</th>
                <th className="text-right font-semibold px-5 py-3">סטטוס</th>
                <th className="text-right font-semibold px-5 py-3">אחראי</th>
                <th className="text-right font-semibold px-5 py-3">ערך</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {activeCases.map(c => (
                <tr key={c.id} className="hover:bg-slate-50/60 transition group">
                  <td className="px-5 py-3.5 font-mono text-slate-400 text-xs">{c.case_number}</td>
                  <td className="px-5 py-3.5">
                    <Link href={`/crm/cases/${c.id}`} className="font-semibold text-slate-800 group-hover:text-blue-600 transition">
                      {c.case_name}
                    </Link>
                  </td>
                  <td className="px-5 py-3.5 text-slate-600">{clientMap[c.client_id] ?? '—'}</td>
                  <td className="px-5 py-3.5 text-slate-500 text-xs">{c.case_type ?? '—'}</td>
                  <td className="px-5 py-3.5">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusColor[c.status] ?? 'bg-slate-100 text-slate-500'}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-slate-500 text-xs">{c.assigned_to ?? '—'}</td>
                  <td className="px-5 py-3.5 text-slate-600 text-xs">
                    {c.value ? `₪${Number(c.value).toLocaleString()}` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {activeCases.length === 0 && (
            <div className="text-center py-16 text-slate-400">
              <p className="text-3xl mb-2">⚖️</p>
              <p>אין תיקים פעילים עדיין</p>
              <Link href="/crm/cases/new" className="text-blue-600 text-sm hover:underline mt-2 inline-block">פתח תיק ראשון</Link>
            </div>
          )}
        </div>
      </div>

      {archivedCases.length > 0 && (
        <details className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <summary className="px-5 py-4 cursor-pointer text-sm font-medium text-slate-500 hover:text-slate-700">
            ארכיון ({archivedCases.length} תיקים)
          </summary>
          <div className="divide-y divide-slate-50">
            {archivedCases.map(c => (
              <div key={c.id} className="px-5 py-3 flex items-center justify-between">
                <Link href={`/crm/cases/${c.id}`} className="text-sm text-slate-600 hover:text-blue-600">
                  {c.case_name} <span className="text-slate-400 text-xs ml-2">#{c.case_number}</span>
                </Link>
                <span className="text-xs text-slate-400">{c.status}</span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}
