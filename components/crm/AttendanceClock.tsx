'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Clock, LogIn, LogOut } from 'lucide-react'

type TodayRecord = {
  id?: string
  check_in: string | null
  check_out: string | null
  total_hours: number | null
  notes?: string | null
}

type Props = {
  userEmail: string
  today: string
  todayRecord: TodayRecord | null
}

export default function AttendanceClock({ userEmail, today, todayRecord }: Props) {
  const [record, setRecord] = useState(todayRecord)
  const [loading, setLoading] = useState(false)
  const [notes, setNotes] = useState(todayRecord?.notes ?? '')
  const [notesSaving, setNotesSaving] = useState(false)
  const router = useRouter()

  const now = () => new Date().toTimeString().slice(0, 5)

  async function checkIn() {
    setLoading(true)
    const check_in = now()
    const res = await fetch('/api/crm/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_email: userEmail, date: today, check_in }),
    })
    if (res.ok) {
      setRecord(prev => ({ ...prev, check_in, check_out: null, total_hours: null }))
      router.refresh()
    }
    setLoading(false)
  }

  async function checkOut() {
    setLoading(true)
    const check_out = now()
    const checkInTime = record?.check_in
    let total_hours: number | null = null
    if (checkInTime) {
      const [ih, im] = checkInTime.split(':').map(Number)
      const [oh, om] = check_out.split(':').map(Number)
      total_hours = Math.round(((oh * 60 + om) - (ih * 60 + im)) / 60 * 10) / 10
    }
    const res = await fetch('/api/crm/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_email: userEmail, date: today, check_out, total_hours }),
    })
    if (res.ok) {
      setRecord(prev => ({ ...prev, check_out, total_hours } as TodayRecord))
      router.refresh()
    }
    setLoading(false)
  }

  async function saveNotes() {
    if (!hasCheckedIn) return
    setNotesSaving(true)
    await fetch('/api/crm/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_email: userEmail, date: today, notes }),
    })
    setNotesSaving(false)
    router.refresh()
  }

  const hasCheckedIn = !!record?.check_in
  const hasCheckedOut = !!record?.check_out

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <div className="flex items-center gap-2 mb-4">
        <Clock size={18} className="text-blue-600" />
        <h2 className="font-bold text-slate-800">שעון נוכחות — היום</h2>
        <span className="text-xs text-slate-400 font-mono mr-auto">{today}</span>
      </div>

      <div className="flex items-center gap-6">
        <div className="text-center">
          <p className="text-xs text-slate-400 font-medium mb-1">כניסה</p>
          <p className={`text-2xl font-bold font-mono ${hasCheckedIn ? 'text-emerald-600' : 'text-slate-300'}`}>
            {record?.check_in ?? '--:--'}
          </p>
        </div>

        <div className="text-slate-200 text-2xl">→</div>

        <div className="text-center">
          <p className="text-xs text-slate-400 font-medium mb-1">יציאה</p>
          <p className={`text-2xl font-bold font-mono ${hasCheckedOut ? 'text-red-500' : 'text-slate-300'}`}>
            {record?.check_out ?? '--:--'}
          </p>
        </div>

        {record?.total_hours != null && (
          <>
            <div className="text-slate-200 text-2xl">=</div>
            <div className="text-center">
              <p className="text-xs text-slate-400 font-medium mb-1">סה"כ</p>
              <p className="text-2xl font-bold text-blue-600">{record.total_hours}ש'</p>
            </div>
          </>
        )}

        <div className="mr-auto flex gap-2">
          {!hasCheckedIn && (
            <button
              onClick={checkIn}
              disabled={loading}
              className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-emerald-700 transition disabled:opacity-50"
            >
              <LogIn size={15} />
              כניסה
            </button>
          )}
          {hasCheckedIn && !hasCheckedOut && (
            <button
              onClick={checkOut}
              disabled={loading}
              className="flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-red-600 transition disabled:opacity-50"
            >
              <LogOut size={15} />
              יציאה
            </button>
          )}
          {hasCheckedIn && hasCheckedOut && (
            <span className="text-sm text-emerald-600 font-medium bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-xl">
              יום עבודה הסתיים
            </span>
          )}
        </div>
      </div>

      {hasCheckedIn && (
        <div className="mt-4 pt-4 border-t border-slate-100">
          <div className="flex items-end gap-3">
            <textarea
              rows={2}
              placeholder="הערות ליום זה (תיקים שטופלו, פגישות, וכד׳)..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-400 transition text-right resize-none bg-slate-50 focus:bg-white"
            />
            <button
              onClick={saveNotes}
              disabled={notesSaving}
              className="text-xs bg-slate-800 text-white px-3 py-2 rounded-lg hover:bg-slate-700 transition disabled:opacity-50 shrink-0"
            >
              {notesSaving ? '...' : 'שמור'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
