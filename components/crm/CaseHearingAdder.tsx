'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X } from 'lucide-react'

export default function CaseHearingAdder({ caseId }: { caseId: string }) {
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const router = useRouter()

  async function addHearing() {
    if (!date) return
    setSubmitting(true)
    await fetch('/api/crm/hearings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, time: time || null, description, location, case_id: caseId }),
    })
    setDate('')
    setTime('')
    setDescription('')
    setLocation('')
    setOpen(false)
    setSubmitting(false)
    router.refresh()
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium transition"
      >
        <Plus size={13} />
        הוסף דיון
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <input
        autoFocus
        type="date"
        value={date}
        onChange={e => setDate(e.target.value)}
        className="text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-600 outline-none focus:border-blue-400"
      />
      <input
        type="time"
        value={time}
        onChange={e => setTime(e.target.value)}
        className="text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-600 outline-none focus:border-blue-400 w-24"
      />
      <input
        type="text"
        placeholder="תיאור (אופציונלי)"
        value={description}
        onChange={e => setDescription(e.target.value)}
        className="text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-600 outline-none focus:border-blue-400 text-right flex-1 min-w-0"
      />
      <button
        onClick={addHearing}
        disabled={submitting || !date}
        className="bg-blue-600 text-white text-xs px-3 py-1.5 rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 shrink-0"
      >
        {submitting ? '...' : 'שמור'}
      </button>
      <button
        onClick={() => setOpen(false)}
        className="text-slate-400 hover:text-slate-600 shrink-0"
      >
        <X size={14} />
      </button>
    </div>
  )
}
