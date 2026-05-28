'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

type Case = { id: string; case_name: string; case_number: string | null }

type Props = {
  cases: Case[]
  defaultCaseId?: string
}

export default function TaskForm({ cases, defaultCaseId }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const data = Object.fromEntries(new FormData(e.currentTarget))
    const res = await fetch('/api/crm/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (!res.ok) {
      const err = await res.json()
      setError(err.error ?? 'שגיאה ביצירת משימה')
      setLoading(false)
      return
    }

    router.push('/crm/tasks')
    router.refresh()
  }

  return (
    <div className="space-y-6 max-w-xl" style={{ fontFamily: 'Assistant, sans-serif' }}>
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <Link href="/crm/tasks" className="hover:text-slate-600 transition flex items-center gap-1">
          <ArrowRight size={14} />
          משימות
        </Link>
        <span>/</span>
        <span className="text-slate-600 font-medium">משימה חדשה</span>
      </div>

      <h1 className="text-2xl font-bold text-slate-800">משימה חדשה</h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">תיאור משימה *</label>
          <textarea
            name="description"
            required
            rows={3}
            placeholder="תאר את המשימה..."
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-400 transition text-right bg-slate-50 focus:bg-white resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">עדיפות</label>
            <select
              name="priority"
              defaultValue="רגיל"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-400 transition bg-slate-50 focus:bg-white"
            >
              <option value="רגיל">רגיל</option>
              <option value="גבוה">גבוה</option>
              <option value="דחוף">דחוף</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">תאריך יעד</label>
            <input
              name="due_date"
              type="date"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-400 transition bg-slate-50 focus:bg-white"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">תיק מקושר</label>
          <select
            name="case_id"
            defaultValue={defaultCaseId ?? ''}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-400 transition bg-slate-50 focus:bg-white"
          >
            <option value="">— ללא תיק —</option>
            {cases.map(c => (
              <option key={c.id} value={c.id}>
                {c.case_name}{c.case_number ? ` #${c.case_number}` : ''}
              </option>
            ))}
          </select>
        </div>

        <input type="hidden" name="status" value="לביצוע" />

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-blue-700 transition disabled:opacity-50"
          >
            {loading ? 'שומר...' : 'צור משימה'}
          </button>
          <Link
            href="/crm/tasks"
            className="text-sm text-slate-500 px-4 py-2.5 rounded-xl hover:bg-slate-100 transition"
          >
            ביטול
          </Link>
        </div>
      </form>
    </div>
  )
}
