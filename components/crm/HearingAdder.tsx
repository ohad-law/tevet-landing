'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X } from 'lucide-react'

type Case = { id: string; case_name: string; case_number: string | null }

type Props = { cases: Case[] }

export default function HearingAdder({ cases }: Props) {
  const [open, setOpen] = useState(false)
  const [caseId, setCaseId] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function submit() {
    if (!date || !caseId) { setError('תאריך ותיק חובה'); return }
    setSubmitting(true)
    setError('')
    const res = await fetch('/api/crm/hearings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, time: time || null, description, location, case_id: caseId }),
    })
    if (!res.ok) {
      const err = await res.json()
      setError(err.error ?? 'שגיאה')
      setSubmitting(false)
      return
    }
    setCaseId('')
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
        className="bg-slate-900 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-slate-800 transition flex items-center gap-2"
      >
        <Plus size={15} />
        דיון חדש
      </button>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-blue-200 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-800 text-sm">הוספת דיון</h3>
        <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600">
          <X size={16} />
        </button>
      </div>

      {error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="block text-xs font-medium text-slate-600 mb-1">תיק *</label>
          <select
            value={caseId}
            onChange={e => setCaseId(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-400 transition bg-slate-50 focus:bg-white"
          >
            <option value="">— בחר תיק —</option>
            {cases.map(c => (
              <option key={c.id} value={c.id}>
                {c.case_name}{c.case_number ? ` #${c.case_number}` : ''}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">תאריך *</label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-400 transition bg-slate-50 focus:bg-white"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">שעה</label>
          <input
            type="time"
            value={time}
            onChange={e => setTime(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-400 transition bg-slate-50 focus:bg-white"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">תיאור</label>
          <input
            type="text"
            placeholder="סוג הדיון"
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-400 transition text-right bg-slate-50 focus:bg-white"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">מיקום</label>
          <input
            type="text"
            placeholder="בית משפט / כתובת"
            value={location}
            onChange={e => setLocation(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-400 transition text-right bg-slate-50 focus:bg-white"
          />
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={submit}
          disabled={submitting}
          className="bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-blue-700 transition disabled:opacity-50"
        >
          {submitting ? 'שומר...' : 'שמור דיון'}
        </button>
        <button
          onClick={() => setOpen(false)}
          className="text-sm text-slate-500 px-4 py-2 rounded-xl hover:bg-slate-100 transition"
        >
          ביטול
        </button>
      </div>
    </div>
  )
}
