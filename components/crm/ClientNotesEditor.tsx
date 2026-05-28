'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Check, X } from 'lucide-react'

type Props = {
  clientId: string
  initialNotes: string | null
}

export default function ClientNotesEditor({ clientId, initialNotes }: Props) {
  const [notes, setNotes] = useState(initialNotes ?? '')
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  async function save() {
    setSaving(true)
    await fetch(`/api/crm/clients/${clientId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes: notes.trim() || null }),
    })
    setSaving(false)
    setEditing(false)
    router.refresh()
  }

  function cancel() {
    setNotes(initialNotes ?? '')
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="mt-3 flex items-start gap-2">
        <textarea
          autoFocus
          rows={2}
          value={notes}
          onChange={e => setNotes(e.target.value)}
          onKeyDown={e => { if (e.key === 'Escape') cancel() }}
          className="flex-1 text-sm border border-blue-300 bg-blue-50/30 rounded-lg px-3 py-2 outline-none focus:border-blue-400 transition text-right resize-none"
        />
        <div className="flex flex-col gap-1 shrink-0">
          <button onClick={save} disabled={saving}
            className="p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50">
            <Check size={13} />
          </button>
          <button onClick={cancel}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition">
            <X size={13} />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-3 group flex items-start gap-2">
      {notes ? (
        <p className="flex-1 text-sm text-slate-500 bg-slate-50 rounded-lg px-3 py-2">{notes}</p>
      ) : (
        <p className="flex-1 text-sm text-slate-400 italic">אין הערות</p>
      )}
      <button
        onClick={() => setEditing(true)}
        className="p-1 text-slate-300 hover:text-blue-500 transition opacity-0 group-hover:opacity-100 shrink-0 mt-1"
        title="ערוך הערות"
      >
        <Pencil size={13} />
      </button>
    </div>
  )
}
