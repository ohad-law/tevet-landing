import { createClient } from '@/lib/supabase/server'
import FinanceAdder from '@/components/crm/FinanceAdder'
import IncomeList from '@/components/crm/IncomeList'
import ExpensesList from '@/components/crm/ExpensesList'
import ExportCsvButton from '@/components/crm/ExportCsvButton'

export const revalidate = 0

export default async function FinancesPage() {
  const supabase = await createClient()
  const now = new Date()
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const firstOfYear = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0]

  const [{ data: income }, { data: expenses }, { data: cases }, { data: clients }] = await Promise.all([
    supabase.from('income').select('*').order('date', { ascending: false }),
    supabase.from('expenses').select('*').order('date', { ascending: false }),
    supabase.from('cases').select('id, case_name, case_number').neq('status', 'ארכיון').order('case_name'),
    supabase.from('clients').select('id, full_name').eq('status', 'פעיל').order('full_name'),
  ])

  const paid = (income ?? []).filter(i => i.status === 'שולם')
  const pending = (income ?? []).filter(i => i.status === 'ממתין')

  const monthIncome = paid.filter(i => i.date >= firstOfMonth).reduce((s, i) => s + (i.amount ?? 0), 0)
  const yearIncome = paid.filter(i => i.date >= firstOfYear).reduce((s, i) => s + (i.amount ?? 0), 0)
  const pendingTotal = pending.reduce((s, i) => s + (i.amount ?? 0), 0)
  const monthExpenses = (expenses ?? []).filter(e => e.date >= firstOfMonth).reduce((s, e) => s + (e.amount ?? 0), 0)
  const profit = monthIncome - monthExpenses

  const incomeExportData = (income ?? []).map(i => ({
    תאריך: i.date,
    תיאור: i.description ?? '',
    סכום: i.amount,
    סטטוס: i.status,
    'מספר חשבונית': i.invoice_number ?? '',
    'אמצעי תשלום': i.payment_method ?? '',
  }))

  const expensesExportData = (expenses ?? []).map(e => ({
    תאריך: e.date,
    תיאור: e.description,
    סכום: e.amount,
    קטגוריה: e.category ?? '',
  }))

  return (
    <div className="space-y-6" style={{ fontFamily: 'Assistant, sans-serif' }}>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">פיננסים</h1>
          <p className="text-slate-500 text-sm mt-0.5">הכנסות, הוצאות ומאזן</p>
        </div>
        <FinanceAdder cases={cases ?? []} clients={clients ?? []} />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <p className="text-slate-500 text-xs font-medium">הכנסות החודש</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">₪{monthIncome.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <p className="text-slate-500 text-xs font-medium">הכנסות השנה</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">₪{yearIncome.toLocaleString()}</p>
        </div>
        <div className="bg-amber-50/30 rounded-2xl border border-amber-200 p-5">
          <p className="text-slate-500 text-xs font-medium">ממתין לתשלום</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">₪{pendingTotal.toLocaleString()}</p>
          <p className="text-xs text-slate-400 mt-1">{pending.length} רשומות</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <p className="text-slate-500 text-xs font-medium">הוצאות החודש</p>
          <p className="text-2xl font-bold text-red-500 mt-1">₪{monthExpenses.toLocaleString()}</p>
        </div>
        <div className={`rounded-2xl border p-5 ${profit >= 0 ? 'bg-emerald-50/30 border-emerald-200' : 'bg-red-50/30 border-red-200'}`}>
          <p className="text-slate-500 text-xs font-medium">רווח נקי החודש</p>
          <p className={`text-2xl font-bold mt-1 ${profit >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
            ₪{profit.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Income, interactive list with mark-as-paid */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-bold text-slate-800">הכנסות</h2>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">{(income ?? []).length} סה"כ</span>
              <ExportCsvButton data={incomeExportData} filename="הכנסות" label="CSV" />
            </div>
          </div>
          <IncomeList initialIncome={income ?? []} />
        </div>

        {/* Expenses */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-bold text-slate-800">הוצאות</h2>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">{(expenses ?? []).length} סה"כ</span>
              <ExportCsvButton data={expensesExportData} filename="הוצאות" label="CSV" />
            </div>
          </div>
          <ExpensesList initialExpenses={expenses ?? []} />
        </div>
      </div>
    </div>
  )
}
