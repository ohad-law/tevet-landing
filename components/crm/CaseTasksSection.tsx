'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CheckSquare, Plus, Check, X } from 'lucide-react'

type Task = {
  id: string
  description: string
  status: string
  priority: string | null
  due_date: string | null
}

type Props = {
  caseId: string
  initialTasks: Task[]
  today: string
}

export default function CaseTasksSection({ caseId, initialTasks, today }: Props) {
  const [tasks, setTasks] = useState(initialTasks)
  const [showAdd, setShowAdd] = useState(false)
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('רגיל')
  const [dueDate, setDueDate] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const openTasks = tasks.filter(t => t.status !== 'הושלמה')

  async function toggleTask(id: string, currentStatus: string) {
    const newStatus = currentStatus === 'הושלמה' ? 'פתוחה' : 'הושלמה'
    startTransition(() => setTasks(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t)))
    await fetch(`/api/crm/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    router.refresh()
  }

  async function addTask() {
    if (!description.trim()) return
    setSubmitting(true)
    const res = await fetch('/api/crm/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        description: description.trim(),
        priority,
        due_date: dueDate || null,
        case_id: caseId,
        status: 'פתוחה',
      }),
    })
    if (res.ok) {
      const { id } = await res.json()
      startTransition(() =>
        setTasks(prev => [...prev, {
          id,
          description: description.trim(),
          status: 'פתוחה',
          priority,
          due_date: dueDate || null,
        }])
      )
      setDescription('')
      setDueDate('')
      setPriority('רגיל')
      setShowAdd(false)
    }
    setSubmitting(false)
    router.refresh()
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckSquare size={15} className="text-slate-400" />
          <h2 className="font-semibold text-slate-800 text-sm">משימות</h2>
          <span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">{openTasks.length}</span>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium transition"
        >
          <Plus size={13} />
          הוסף משימה
        </button>
      </div>

      {showAdd && (
        <div className="px-5 py-3.5 bg-blue-50/40 border-b border-blue-100">
          <div className="space-y-2.5">
            <input
              autoFocus
              type="text"
              placeholder="תיאור המשימה..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addTask()}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-400 transition text-right bg-white"
            />
            <div className="flex gap-2">
              <select
                value={priority}
                onChange={e => setPriority(e.target.value)}
                className="text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-600 outline-none focus:border-blue-400"
              >
                <option value="רגיל">רגיל</option>
                <option value="גבוה">גבוה</option>
                <option value="דחוף">דחוף</option>
              </select>
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-600 outline-none focus:border-blue-400 flex-1"
              />
              <button
                onClick={addTask}
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

      {openTasks.length === 0 && !showAdd ? (
        <p className="text-sm text-slate-400 text-center py-8">אין משימות פתוחות</p>
      ) : (
        <div className="divide-y divide-slate-50">
          {openTasks.slice(0, 10).map(t => {
            const overdue = t.due_date && t.due_date < today
            const isDone = t.status === 'הושלמה'
            return (
              <div key={t.id} className={`px-5 py-3 flex items-center justify-between gap-3 ${overdue ? 'bg-red-50/30' : ''}`}>
                <div className="flex items-center gap-2.5 min-w-0">
                  <button
                    onClick={() => toggleTask(t.id, t.status)}
                    className={`w-4.5 h-4.5 rounded-full border-2 flex items-center justify-center transition shrink-0 ${
                      isDone ? 'bg-green-500 border-green-500' : 'border-slate-300 hover:border-blue-400'
                    }`}
                    style={{ width: 18, height: 18 }}
                  >
                    {isDone && <Check size={9} className="text-white" strokeWidth={3} />}
                  </button>
                  <div className="flex items-start gap-1.5 min-w-0">
                    <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                      t.priority === 'דחוף' ? 'bg-red-500' :
                      t.priority === 'גבוה' ? 'bg-amber-500' : 'bg-slate-300'
                    }`} />
                    <p className={`text-sm truncate ${isDone ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                      {t.description}
                    </p>
                  </div>
                </div>
                {t.due_date && (
                  <span className={`text-xs font-mono shrink-0 ${overdue ? 'text-red-600 font-semibold' : 'text-slate-400'}`}>
                    {t.due_date}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
