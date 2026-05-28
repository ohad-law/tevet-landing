'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Pencil, X } from 'lucide-react'

type Expense = {
  id: string
  amount: number
  date: string
  description: string
  category: string | null
}

export default function ExpensesList({ initialExpenses }: { initialExpenses: Expense[] }) {
  const [expenses, setExpenses] = useState(initialExpenses)
  const [showAll, setShowAll] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [editDesc, setEditDesc] = useState('')
  const [editAmount, setEditAmount] = useState('')
  const [editDate, setEditDate] = useState('')
  const [editCategory, setEditCategory] = useState('')
  const [editSaving, setEditSaving] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function startEdit(e: Expense) {
    setEditId(e.id)
    setEditDesc(e.description)
    setEditAmount(String(e.amount))
    setEditDate(e.date)
    setEditCategory(e.category ?? '')
  }

  async function saveEdit() {
    if (!editId) return
    setEditSaving(true)
    const res = await fetch(`/api/crm/expenses/${editId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        description: editDesc.trim(),
        amount: parseFloat(editAmount) || 0,
        date: editDate,
        category: editCategory.trim() || null,
      }),
    })
    if (res.ok) {
      startTransition(() =>
        setExpenses(prev => prev.map(e =>
          e.id === editId
            ? { ...e, description: editDesc.trim(), amount: parseFloat(editAmount) || 0, date: editDate, category: editCategory.trim() || null }
            : e
        ))
      )
      setEditId(null)
      router.refresh()
    }
    setEditSaving(false)
  }

  async function deleteExpense(id: string) {
    startTransition(() => setExpenses(prev => prev.filter(e => e.id !== id)))
    await fetch(`/api/crm/expenses/${id}`, { method: 'DELETE' })
    router.refresh()
  }

  const visible = showAll ? expenses : expenses.slice(0, 20)

  return (
    <div className="divide-y divide-slate-50">
      {visible.map(e => (
        <div key={e.id}>
          <div className={`group px-5 py-3 flex items-center justify-between ${editId === e.id ? 'bg-blue-50/30' : ''}`}>
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-800 truncate">{e.description}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-xs text-slate-400">{e.date}</p>
                {e.category && (
                  <span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{e.category}</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 mr-3">
              <p className="font-semibold text-red-600">₪{Number(e.amount ?? 0).toLocaleString()}</p>
              <button
                onClick={() => editId === e.id ? setEditId(null) : startEdit(e)}
                className="text-slate-300 hover:text-blue-500 transition opacity-0 group-hover:opacity-100"
                title="ערוך"
              >
                <Pencil size={13} />
              </button>
              <button
                onClick={() => deleteExpense(e.id)}
                className="text-slate-300 hover:text-red-500 transition opacity-0 group-hover:opacity-100"
                title="מחק הוצאה"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>
          {editId === e.id && (
            <div className="px-5 pb-3 pt-1 bg-blue-50/30 border-b border-slate-100 flex flex-wrap gap-2 items-center">
              <input
                autoFocus
                type="text"
                value={editDesc}
                onChange={ev => setEditDesc(ev.target.value)}
                placeholder="תיאור"
                className="flex-1 min-w-32 px-3 py-1.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-400 transition text-right bg-white"
              />
              <input
                type="number"
                value={editAmount}
                onChange={ev => setEditAmount(ev.target.value)}
                placeholder="סכום"
                className="w-28 px-3 py-1.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-400 transition bg-white"
              />
              <input
                type="date"
                value={editDate}
                onChange={ev => setEditDate(ev.target.value)}
                className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:border-blue-400 transition bg-white"
              />
              <input
                type="text"
                value={editCategory}
                onChange={ev => setEditCategory(ev.target.value)}
                placeholder="קטגוריה"
                className="w-28 px-3 py-1.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-400 transition text-right bg-white"
              />
              <button
                onClick={saveEdit}
                disabled={editSaving}
                className="bg-blue-600 text-white text-xs px-3 py-1.5 rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50"
              >
                {editSaving ? '...' : 'שמור'}
              </button>
              <button
                onClick={() => setEditId(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition"
              >
                <X size={13} />
              </button>
            </div>
          )}
        </div>
      ))}
      {expenses.length === 0 && (
        <p className="text-slate-400 text-sm p-6 text-center">אין הוצאות רשומות עדיין</p>
      )}
      {expenses.length > 20 && (
        <button
          onClick={() => setShowAll(v => !v)}
          className="w-full py-2.5 text-xs text-blue-600 hover:text-blue-700 font-medium transition text-center border-t border-slate-50"
        >
          {showAll ? 'הצג פחות' : `הצג את כל ${expenses.length} הרשומות`}
        </button>
      )}
    </div>
  )
}
