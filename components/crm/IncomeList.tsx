'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Clock } from 'lucide-react'

type Income = {
  id: string
  amount: number
  date: string
  description: string | null
  status: string
}

export default function IncomeList({ initialIncome }: { initialIncome: Income[] }) {
  const [income, setIncome] = useState(initialIncome)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  async function toggleStatus(id: string, current: string) {
    const next = current === 'שולם' ? 'ממתין' : 'שולם'
    startTransition(() =>
      setIncome(prev => prev.map(i => i.id === id ? { ...i, status: next } : i))
    )
    await fetch(`/api/crm/income/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    })
    router.refresh()
  }

  return (
    <div className="divide-y divide-slate-50">
      {income.slice(0, 20).map(i => (
        <div key={i.id} className="px-5 py-3 flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-800 truncate">{i.description || 'הכנסה'}</p>
            <p className="text-xs text-slate-400 mt-0.5">{i.date}</p>
          </div>
          <div className="flex items-center gap-3 shrink-0 mr-3">
            <p className="font-semibold text-slate-800">₪{Number(i.amount ?? 0).toLocaleString()}</p>
            <button
              onClick={() => toggleStatus(i.id, i.status)}
              className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium transition ${
                i.status === 'שולם'
                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                  : i.status === 'ממתין'
                  ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                  : 'bg-slate-100 text-slate-500'
              }`}
              title={i.status === 'שולם' ? 'סמן כממתין' : 'סמן כשולם'}
            >
              {i.status === 'שולם' ? <Check size={11} /> : <Clock size={11} />}
              {i.status}
            </button>
          </div>
        </div>
      ))}
      {income.length === 0 && (
        <p className="text-slate-400 text-sm p-6 text-center">אין הכנסות רשומות עדיין</p>
      )}
    </div>
  )
}
