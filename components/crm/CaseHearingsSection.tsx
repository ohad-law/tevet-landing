'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar, MapPin, Trash2, Plus, X, Pencil } from 'lucide-react'

type Hearing = {
  id: string
  date: string
  time: string | null
  description: string | null
  location: string | null
}

type Props = {
  caseId: string
  initialHearings: Hearing[]
  today: string
}

export default function CaseHearingsSection({ caseId, initialHearings, today }: Props) {
  const [hearings, setHearings] = useState(initialHearings)
  const [showAdd, setShowAdd] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const upcoming = hearings.filter(h => h.date >= today)
  const past = hearings.filter(h => h.date < today)

  function startEdit(h: Hearing) {
    setEditId(h.id)
    setDate(h.date)
    setTime(h.time ?? '')
    setDescription(h.description ?? '')
    setLocation(h.location ?? '')
    setShowAdd(false)
  }

  function cancelForm() {
    setShowAdd(false)
    setEditId(null)
    setDate(''); setTime(''); setDescription(''); setLocation('')
  }

  async function deleteHearing(id: string) {
    startTransition(() => setHearings(prev => prev.filter(h => h.id !== id)))
    await fetch(`/api/crm/hearings/${id}`, { method: 'DELETE' })
    router.refresh()
  }

  async function saveHearing() {
    if (!date) return
    setSubmitting(true)
    if (editId) {
      const res = await fetch(`/api/crm/hearings/${editId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, time: time || null, description: description.trim() || null, location: location.trim() || null }),
      })
      if (res.ok) {
        startTransition(() =>
          setHearings(prev => prev.map(h => h.id === editId
            ? { ...h, date, time: time || null, description: description.trim() || null, location: location.trim() || null }
            : h
          ).sort((a, b) => a.date.localeCompare(b.date)))
        )
        cancelForm()
        router.refresh()
      }
    } else {
      const res = await fetch('/api/crm/hearings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ case_id: caseId, date, time: time || null, description: description.trim() || null, location: location.trim() || null }),
      })
      if (res.ok) {
        const { id } = await res.json()
        startTransition(() =>
          setHearings(prev => [...prev, { id, date, time: time || null, description: description.trim() || null, location: location.trim() || null }].sort((a, b) => a.date.localeCompare(b.date)))
        )
        cancelForm()
        router.refresh()
      }
    }
    setSubmitting(false)
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar size={15} className="text-slate-400" />
          <h2 className="font-semibold text-slate-800 text-sm">דיונים</h2>
          <span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">{hearings.length}</span>
        </div>
        <button
          onClick={() => { cancelForm(); setShowAdd(s => !s) }}
          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium transition"
        >
          <Plus size={13} />
          הוסף דיון
        </button>
      </div>

      {(showAdd || editId) && (
        <div className="px-5 py-3.5 bg-blue-50/40 border-b border-blue-100">
          <p className="text-xs font-medium text-blue-700 mb-2">{editId ? 'עריכת דיון' : 'דיון חדש'}</p>
          <div className="space-y-2.5">
            <div className="flex gap-2">
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
                className="text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-600 outline-none focus:border-blue-400"
              />
            </div>
            <input
              type="text"
              placeholder="תיאור הדיון..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-400 transition text-right bg-white"
            />
            <input
              type="text"
              placeholder="מיקום (בית משפט, אולם...)..."
              value={location}
              onChange={e => setLocation(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-400 transition text-right bg-white"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={saveHearing}
                disabled={submitting || !date}
                className="bg-blue-600 text-white text-xs px-3 py-1.5 rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50"
              >
                {submitting ? '...' : 'שמור'}
              </button>
              <button
                onClick={cancelForm}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {upcoming.length === 0 && past.length === 0 && !showAdd ? (
        <p className="text-sm text-slate-400 text-center py-8">אין דיונים רשומים</p>
      ) : (
        <div className="divide-y divide-slate-50">
          {upcoming.map(h => (
            <div key={h.id} className={`group px-5 py-3 flex items-start justify-between gap-3 ${h.date === today ? 'bg-blue-50/30' : ''} ${editId === h.id ? 'bg-amber-50/30' : ''}`}>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-800">{h.description || 'דיון'}</p>
                {h.location && (
                  <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                    <MapPin size={11} /> {h.location}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="text-right">
                  <p className={`text-xs font-bold font-mono ${h.date === today ? 'text-blue-600' : 'text-slate-700'}`}>
                    {h.date === today ? 'היום' : h.date}
                  </p>
                  {h.time && <p className="text-xs text-slate-400">{h.time}</p>}
                </div>
                <button
                  onClick={() => startEdit(h)}
                  className="text-slate-300 hover:text-blue-500 transition opacity-0 group-hover:opacity-100"
                  title="ערוך דיון"
                >
                  <Pencil size={12} />
                </button>
                <button
                  onClick={() => deleteHearing(h.id)}
                  className="text-slate-300 hover:text-red-500 transition opacity-0 group-hover:opacity-100"
                  title="מחק דיון"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}

          {past.length > 0 && (
            <details className="group/details">
              <summary className="px-5 py-3 text-xs text-slate-400 cursor-pointer hover:text-slate-600 list-none flex items-center gap-1">
                דיונים שעברו ({past.length})
              </summary>
              {past.slice().reverse().map(h => (
                <div key={h.id} className="group px-5 py-2.5 flex items-center justify-between border-t border-slate-50">
                  <p className="text-xs text-slate-500">{h.description || 'דיון'}</p>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-mono text-slate-400">{h.date}</p>
                    <button
                      onClick={() => deleteHearing(h.id)}
                      className="text-slate-300 hover:text-red-500 transition opacity-0 group-hover:opacity-100"
                      title="מחק דיון"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </details>
          )}
        </div>
      )}
    </div>
  )
}
