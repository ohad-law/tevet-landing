'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { MapPin, Trash2, Pencil, X, Check } from 'lucide-react'

type Hearing = {
  id: string
  date: string
  time: string | null
  description: string | null
  location: string | null
  case_id: string | null
}

type Case = { id: string; case_name: string; case_number: string | null }

type Props = {
  initialHearings: Hearing[]
  caseMap: Record<string, Case>
  today: string
}

export default function HearingsManager({ initialHearings, caseMap, today }: Props) {
  const [hearings, setHearings] = useState(initialHearings)
  const [isPending, startTransition] = useTransition()
  const [editId, setEditId] = useState<string | null>(null)
  const [editDate, setEditDate] = useState('')
  const [editTime, setEditTime] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editLocation, setEditLocation] = useState('')
  const [editSaving, setEditSaving] = useState(false)
  const router = useRouter()

  const upcoming = hearings.filter(h => h.date >= today)
  const past = hearings.filter(h => h.date < today)

  function startEdit(h: Hearing) {
    setEditId(h.id)
    setEditDate(h.date)
    setEditTime(h.time ?? '')
    setEditDescription(h.description ?? '')
    setEditLocation(h.location ?? '')
  }

  function cancelEdit() { setEditId(null) }

  async function saveEdit() {
    if (!editId || !editDate) return
    setEditSaving(true)
    const res = await fetch(`/api/crm/hearings/${editId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: editDate,
        time: editTime || null,
        description: editDescription || null,
        location: editLocation || null,
      }),
    })
    if (res.ok) {
      startTransition(() =>
        setHearings(prev => prev.map(h =>
          h.id === editId
            ? { ...h, date: editDate, time: editTime || null, description: editDescription || null, location: editLocation || null }
            : h
        ))
      )
      setEditId(null)
      router.refresh()
    }
    setEditSaving(false)
  }

  async function deleteHearing(id: string) {
    startTransition(() => setHearings(prev => prev.filter(h => h.id !== id)))
    await fetch(`/api/crm/hearings/${id}`, { method: 'DELETE' })
    router.refresh()
  }

  function HearingRow({ h, faded = false }: { h: Hearing; faded?: boolean }) {
    const c = h.case_id ? caseMap[h.case_id] : null
    const isToday = h.date === today
    const isEditing = editId === h.id
    const daysUntil = !faded
      ? Math.ceil((new Date(h.date).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24))
      : 0

    return (
      <div>
        <div className={`group bg-white rounded-xl border px-5 py-4 flex items-center justify-between gap-4 ${
          isEditing ? 'border-blue-300 rounded-b-none' :
          isToday ? 'border-red-300 bg-red-50/20' : faded ? 'border-slate-100 opacity-60' : 'border-slate-200'
        }`}>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-slate-800">{h.description || 'דיון'}</p>
            {c && (
              <Link href={`/crm/cases/${c.id}`} className="text-xs text-blue-600 hover:underline mt-0.5 block">
                {c.case_name}{c.case_number ? ` #${c.case_number}` : ''}
              </Link>
            )}
            {h.location && (
              <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                <MapPin size={10} /> {h.location}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right">
              <p className={`font-mono text-sm font-bold ${isToday ? 'text-red-600' : 'text-slate-700'}`}>
                {isToday ? 'היום!' : h.date}
              </p>
              {h.time && <p className="text-xs text-slate-400 mt-0.5">{h.time}</p>}
              {!faded && !isToday && daysUntil <= 7 && daysUntil > 0 && (
                <p className="text-xs text-amber-600 font-medium mt-0.5">עוד {daysUntil} ימים</p>
              )}
            </div>
            {!faded && (
              <button
                onClick={() => isEditing ? cancelEdit() : startEdit(h)}
                className="text-slate-300 hover:text-blue-500 transition opacity-0 group-hover:opacity-100 shrink-0"
                title="ערוך דיון"
              >
                <Pencil size={14} />
              </button>
            )}
            <button
              onClick={() => deleteHearing(h.id)}
              className="text-slate-300 hover:text-red-500 transition opacity-0 group-hover:opacity-100 shrink-0"
              title="מחק דיון"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
        {isEditing && (
          <div className="bg-blue-50/40 border border-blue-300 border-t-0 rounded-xl rounded-t-none px-5 py-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">תאריך *</label>
                <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-400 transition bg-white" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">שעה</label>
                <input type="time" value={editTime} onChange={e => setEditTime(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-400 transition bg-white" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">תיאור</label>
                <input type="text" value={editDescription} onChange={e => setEditDescription(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-400 transition text-right bg-white" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">מיקום</label>
                <input type="text" value={editLocation} onChange={e => setEditLocation(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-400 transition text-right bg-white" />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={saveEdit} disabled={editSaving || !editDate}
                className="flex items-center gap-1.5 bg-blue-600 text-white text-xs px-3 py-1.5 rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50">
                <Check size={12} /> {editSaving ? '...' : 'שמור'}
              </button>
              <button onClick={cancelEdit}
                className="flex items-center gap-1 text-slate-400 hover:text-slate-600 text-xs px-2 py-1.5 rounded-lg hover:bg-slate-100 transition">
                <X size={12} /> ביטול
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <section>
        <h2 className="font-semibold text-slate-700 mb-3 text-sm">דיונים קרובים ({upcoming.length})</h2>
        <div className="space-y-3">
          {upcoming.map(h => <HearingRow key={h.id} h={h} />)}
          {upcoming.length === 0 && (
            <div className="text-center py-12 text-slate-400 bg-white rounded-2xl border border-slate-200">
              <p className="text-3xl mb-2">📅</p>
              <p>אין דיונים קרובים</p>
            </div>
          )}
        </div>
      </section>

      {past.length > 0 && (
        <details>
          <summary className="cursor-pointer text-sm font-medium text-slate-500 hover:text-slate-700 py-2">
            דיונים שעברו ({past.length})
          </summary>
          <div className="mt-3 space-y-2">
            {past.slice().reverse().slice(0, 30).map(h => (
              <HearingRow key={h.id} h={h} faded />
            ))}
          </div>
        </details>
      )}
    </div>
  )
}
