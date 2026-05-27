import { createClient } from '@/lib/supabase/server'

export const revalidate = 0

export default async function FinancesPage() {
  const supabase = await createClient()
  const now = new Date()
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const firstOfYear = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0]

  const [{ data: income }, { data: expenses }] = await Promise.all([
    supabase.from('income').select('*').order('date', { ascending: false }),
    supabase.from('expenses').select('*').order('date', { ascending: false }),
  ])

  const paid = (income ?? []).filter(i => i.status === 'שולם')
  const pending = (income ?? []).filter(i => i.status === 'ממתין')

  const monthIncome = paid.filter(i => i.date >= firstOfMonth).reduce((s, i) => s + (i.amount ?? 0), 0)
  const yearIncome = paid.filter(i => i.date >= firstOfYear).reduce((s, i) => s + (i.amount ?? 0), 0)
  const pendingTotal = pending.reduce((s, i) => s + (i.amount ?? 0), 0)
  const monthExpenses = (expenses ?? []).filter(e => e.date >= firstOfMonth).reduce((s, e) => s + (e.amount ?? 0), 0)

  return (
    <div className="space-y-6" style={{ fontFamily: 'Assistant, sans-serif' }}>
      <h1 className="text-2xl font-bold text-slate-800">פיננסים</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <p className="text-slate-500 text-xs font-medium">הכנסות החודש</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">₪{monthIncome.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <p className="text-slate-500 text-xs font-medium">הכנסות השנה</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">₪{yearIncome.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-2xl border border-amber-200 bg-amber-50/30 p-5">
          <p className="text-slate-500 text-xs font-medium">ממתין לתשלום</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">₪{pendingTotal.toLocaleString()}</p>
          <p className="text-xs text-slate-400 mt-1">{pending.length} חשבוניות</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <p className="text-slate-500 text-xs font-medium">הוצאות החודש</p>
          <p className="text-2xl font-bold text-red-500 mt-1">₪{monthExpenses.toLocaleString()}</p>
        </div>
      </div>

      {/* Recent Income */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-800">הכנסות אחרונות</h2>
        </div>
        <div className="divide-y divide-slate-50">
          {(income ?? []).slice(0, 15).map(i => (
            <div key={i.id} className="px-5 py-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-800">{i.description || 'הכנסה'}</p>
                <p className="text-xs text-slate-400 mt-0.5">{i.date}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-slate-800">₪{Number(i.amount ?? 0).toLocaleString()}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  i.status === 'שולם' ? 'bg-green-100 text-green-700' :
                  i.status === 'ממתין' ? 'bg-amber-100 text-amber-700' :
                  'bg-slate-100 text-slate-500'
                }`}>{i.status}</span>
              </div>
            </div>
          ))}
          {(income?.length ?? 0) === 0 && (
            <p className="text-slate-400 text-sm p-6 text-center">אין הכנסות רשומות עדיין</p>
          )}
        </div>
      </div>
    </div>
  )
}
