'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Clock, Plus, X } from 'lucide-react'

type TimelineEvent = {
  id: string
  description: string
  event_type: string | null
  created_by: string | null
  created_at: string | null
}

type Props = {
  caseId: string
  initialTimeline: TimelineEvent[]
}

const EVENT_TYPE_COLORS: Record<string, string> = {
  'הערה': 'bg-slate-100 text-slate-600',
  'עדכון': 'bg-blue-100 text-blue-700',
  'מסמך': 'bg-violet-100 text-violet-700',
  'שלב': 'bg-amber-100 text-amber-700',
  'דיון': 'bg-green-100 text-green-700',
}

export default function CaseNotesSection({ caseId, initialTimeline }: Props) {
  const [timeline, setTimeline] = useState(initialTimeline)
  const [showAdd, setShowAdd] = useState(false)
  const [description, setDescription] = useState('')
  const [eventType, setEventType] = useState('הערה')
  const [submitting, setSubmitting] = useState(false)
  const router = useRouter()

  async function addNote() {
    if (!description.trim()) return
    setSubmitting(true)
    const res = await fetch('/api/crm/timeline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ case_id: caseId, description: description.trim(), event_type: eventType }),
    })
    if (res.ok) {
      const { id } = await res.json()
      setTimeline(prev => [...prev, {
        id,
        description: description.trim(),
        event_type: eventType,
        created_by: null,
        created_at: new Date().toISOString(),
      }])
      setDescription('')
      setEventType('הערה')
      setShowAdd(false)
    }
    setSubmitting(false)
    router.refresh()
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock size={15} className="text-slate-400" />
          <h2 className="font-semibold text-slate-800 text-sm">ציר זמן והערות</h2>
          <span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">{timeline.length}</span>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium transition"
        >
          <Plus size={13} />
          הוסף הערה
        </button>
      </div>

      {showAdd && (
        <div className="px-5 py-3.5 bg-blue-50/40 border-b border-blue-100">
          <div className="space-y-2.5">
            <textarea
              autoFocus
              rows={2}
              placeholder="כתוב הערה, עדכון, או פעולה שנעשתה..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-400 transition text-right bg-white resize-none"
            />
            <div className="flex gap-2">
              <select
                value={eventType}
                onChange={e => setEventType(e.target.value)}
                className="text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-600 outline-none focus:border-blue-400"
              >
                <option value="הערה">הערה</option>
                <option value="עדכון">עדכון</option>
                <option value="מסמך">מסמך</option>
                <option value="שלב">שלב</option>
                <option value="דיון">דיון</option>
              </select>
              <button
                onClick={addNote}
                disabled={submitting || !description.trim()}
                className="bg-blue-600 text-white text-xs px-3 py-1.5 rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50"
              >
                {submitting ? '...' : 'שמור'}
              </button>
              <button
                onClick={() => setShowAdd(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {timeline.length === 0 && !showAdd ? (
        <p className="text-sm text-slate-400 text-center py-8">אין אירועים בציר הזמן</p>
      ) : (
        <div className="px-5 py-4">
          <div className="relative">
            <div className="absolute right-2 top-0 bottom-0 w-px bg-slate-100" />
            <div className="space-y-4">
              {[...timeline].reverse().map(event => (
                <div key={event.id} className="flex items-start gap-4 pr-8 relative">
                  <div className="absolute right-0 w-4 h-4 rounded-full bg-blue-100 border-2 border-blue-400 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-800">{event.description}</p>
                    <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                      {event.event_type && (
                        <span className={`px-1.5 py-0.5 rounded font-medium text-xs ${EVENT_TYPE_COLORS[event.event_type] ?? 'bg-slate-100 text-slate-500'}`}>
                          {event.event_type}
                        </span>
                      )}
                      {event.created_by && <span>· {event.created_by}</span>}
                      {event.created_at && (
                        <span>· {new Date(event.created_at).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit' })}</span>
                      )}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
