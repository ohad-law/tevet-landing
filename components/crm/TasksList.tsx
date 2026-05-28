'use client'
import { useState, useMemo, useTransition } from 'react'
import { Search, X, Check, ChevronDown, Trash2, Plus, Pencil } from 'lucide-react'

type Task = {
  id: string
  description: string
  status: string
  priority: string | null
  due_date: string | null
  case_id: string | null
}

type Props = {
  initialTasks: Task[]
  caseMap: Record<string, string>
  today: string
}

export default function TasksList({ initialTasks, caseMap, today }: Props) {
  const [tasks, setTasks] = useState(initialTasks)
  const [search, setSearch] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [showDone, setShowDone] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [quickDesc, setQuickDesc] = useState('')
  const [quickDue, setQuickDue] = useState('')
  const [addingTask, setAddingTask] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [editDesc, setEditDesc] = useState('')
  const [editDue, setEditDue] = useState('')
  const [editSaving, setEditSaving] = useState(false)

  const open = useMemo(() => tasks.filter(t => t.status !== 'הושלמה'), [tasks])
  const done = useMemo(() => tasks.filter(t => t.status === 'הושלמה'), [tasks])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return open.filter(t => {
      if (priorityFilter && t.priority !== priorityFilter) return false
      if (q && !t.description?.toLowerCase().includes(q)) return false
      return true
    })
  }, [open, search, priorityFilter])

  const overdue = filtered.filter(t => t.due_date && t.due_date < today)
  const upcoming = filtered.filter(t => !t.due_date || t.due_date >= today)

  async function deleteTask(id: string) {
    startTransition(() => setTasks(prev => prev.filter(t => t.id !== id)))
    await fetch(`/api/crm/tasks/${id}`, { method: 'DELETE' })
  }

  const PRIORITY_CYCLE: Record<string, string> = { 'רגיל': 'גבוה', 'גבוה': 'דחוף', 'דחוף': 'רגיל' }

  async function cyclePriority(id: string, current: string | null) {
    const next = PRIORITY_CYCLE[current ?? 'רגיל'] ?? 'גבוה'
    startTransition(() => setTasks(prev => prev.map(t => t.id === id ? { ...t, priority: next } : t)))
    await fetch(`/api/crm/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priority: next }),
    })
  }

  function startEditTask(task: Task) {
    setEditId(task.id)
    setEditDesc(task.description)
    setEditDue(task.due_date ?? '')
  }

  async function saveEditTask() {
    if (!editId || !editDesc.trim()) return
    setEditSaving(true)
    const res = await fetch(`/api/crm/tasks/${editId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: editDesc.trim(), due_date: editDue || null }),
    })
    if (res.ok) {
      startTransition(() =>
        setTasks(prev => prev.map(t =>
          t.id === editId ? { ...t, description: editDesc.trim(), due_date: editDue || null } : t
        ))
      )
      setEditId(null)
    }
    setEditSaving(false)
  }

  async function addQuickTask(e: React.FormEvent) {
    e.preventDefault()
    if (!quickDesc.trim()) return
    setAddingTask(true)
    const res = await fetch('/api/crm/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: quickDesc.trim(), due_date: quickDue || undefined }),
    })
    if (res.ok) {
      const { id } = await res.json()
      const newTask: Task = {
        id,
        description: quickDesc.trim(),
        status: 'לביצוע',
        priority: 'רגיל',
        due_date: quickDue || null,
        case_id: null,
      }
      startTransition(() => setTasks(prev => [...prev, newTask]))
      setQuickDesc('')
      setQuickDue('')
    }
    setAddingTask(false)
  }

  async function toggleTask(id: string, currentStatus: string) {
    const newStatus = currentStatus === 'הושלמה' ? 'לביצוע' : 'הושלמה'
    startTransition(() => {
      setTasks(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t))
    })
    try {
      await fetch(`/api/crm/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
    } catch {
      startTransition(() => {
        setTasks(prev => prev.map(t => t.id === id ? { ...t, status: currentStatus } : t))
      })
    }
  }

  const priorityStyle: Record<string, string> = {
    'דחוף': 'bg-red-100 text-red-700 border-red-200',
    'גבוה': 'bg-orange-100 text-orange-700 border-orange-200',
    'רגיל': 'bg-slate-100 text-slate-600 border-slate-200',
  }

  function TaskRow({ task, faded = false }: { task: Task; faded?: boolean }) {
    const isOverdue = task.due_date && task.due_date < today && task.status !== 'הושלמה'
    const isDone = task.status === 'הושלמה'
    const isEditing = editId === task.id
    return (
      <div>
        <div className={`group flex items-center gap-3 px-5 py-3.5 border-b border-slate-50 last:border-0 ${
          isEditing ? 'bg-blue-50/30' : isOverdue ? 'bg-red-50/40' : faded ? 'opacity-50' : ''
        }`}>
          <button
            onClick={() => toggleTask(task.id, task.status)}
            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition shrink-0 ${
              isDone
                ? 'bg-green-500 border-green-500'
                : 'border-slate-300 hover:border-blue-400'
            }`}
            title={isDone ? 'סמן כפתוחה' : 'סמן כהושלמה'}
          >
            {isDone && <Check size={10} className="text-white" strokeWidth={3} />}
          </button>

          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium truncate ${isDone ? 'line-through text-slate-400' : 'text-slate-800'}`}>
              {task.description}
            </p>
            {task.case_id && caseMap[task.case_id] && (
              <p className="text-xs text-slate-400 mt-0.5 truncate">{caseMap[task.case_id]}</p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {task.due_date && !isEditing && (
              <span className={`text-xs font-mono ${isOverdue ? 'text-red-600 font-bold' : 'text-slate-400'}`}>
                {task.due_date}
              </span>
            )}
            {task.priority && (
              <button
                onClick={() => cyclePriority(task.id, task.priority)}
                title="שנה עדיפות"
                className={`text-xs px-2 py-0.5 rounded-full border font-medium transition hover:opacity-80 ${priorityStyle[task.priority] ?? 'bg-slate-100 text-slate-500 border-slate-200'}`}
              >
                {task.priority}
              </button>
            )}
            {!faded && (
              <button
                onClick={() => isEditing ? setEditId(null) : startEditTask(task)}
                className="text-slate-300 hover:text-blue-500 transition opacity-0 group-hover:opacity-100"
                title="ערוך משימה"
              >
                <Pencil size={13} />
              </button>
            )}
            <button
              onClick={() => deleteTask(task.id)}
              className="text-slate-300 hover:text-red-500 transition opacity-0 group-hover:opacity-100"
              title="מחק משימה"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>
        {isEditing && (
          <div className="px-5 pb-3 pt-2 bg-blue-50/30 border-b border-slate-50 flex items-center gap-2">
            <input
              autoFocus
              type="text"
              value={editDesc}
              onChange={e => setEditDesc(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') saveEditTask(); if (e.key === 'Escape') setEditId(null) }}
              className="flex-1 px-3 py-1.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-400 transition text-right bg-white"
            />
            <input
              type="date"
              value={editDue}
              onChange={e => setEditDue(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:border-blue-400 transition bg-white"
            />
            <button onClick={saveEditTask} disabled={editSaving || !editDesc.trim()}
              className="bg-blue-600 text-white text-xs px-3 py-1.5 rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50">
              {editSaving ? '...' : 'שמור'}
            </button>
            <button onClick={() => setEditId(null)}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition">
              <X size={13} />
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-3 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-52">
          <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="חיפוש לפי תיאור משימה..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pr-8 pl-8 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-400 focus:bg-white transition text-right"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X size={13} />
            </button>
          )}
        </div>

        <div className="flex gap-1 bg-slate-100 rounded-lg p-0.5">
          {(['', 'דחוף', 'גבוה', 'רגיל'] as const).map(p => (
            <button
              key={p || 'all'}
              onClick={() => setPriorityFilter(p)}
              className={`text-xs px-3 py-1 rounded-md font-medium transition ${
                priorityFilter === p ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {p || 'הכל'}
            </button>
          ))}
        </div>

        <span className="text-xs text-slate-400 mr-auto">{filtered.length} פתוחות · {done.length} הושלמו</span>
      </div>

      {overdue.length > 0 && (
        <div className="bg-red-50 rounded-xl border border-red-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-red-100">
            <p className="text-sm font-semibold text-red-700">עבר הזמן ({overdue.length})</p>
          </div>
          {overdue.map(t => <TaskRow key={t.id} task={t} />)}
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {upcoming.length > 0 ? (
          upcoming.map(t => <TaskRow key={t.id} task={t} />)
        ) : overdue.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <p className="text-2xl mb-2">✅</p>
            <p className="text-sm">אין משימות פתוחות — כל הכבוד!</p>
          </div>
        ) : null}
        <form onSubmit={addQuickTask} className="flex items-center gap-2 px-4 py-2.5 border-t border-slate-100 bg-slate-50/50">
          <Plus size={14} className="text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="הוסף משימה מהירה..."
            value={quickDesc}
            onChange={e => setQuickDesc(e.target.value)}
            className="flex-1 text-sm bg-transparent outline-none placeholder:text-slate-400 text-slate-800 text-right"
          />
          <input
            type="date"
            value={quickDue}
            onChange={e => setQuickDue(e.target.value)}
            className="text-xs border border-slate-200 rounded px-2 py-1 outline-none focus:border-blue-400 transition text-slate-600 bg-white"
          />
          <button
            type="submit"
            disabled={!quickDesc.trim() || addingTask}
            className="text-xs bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700 transition disabled:opacity-40 shrink-0"
          >
            הוסף
          </button>
        </form>
      </div>

      {done.length > 0 && (
        <div>
          <button
            onClick={() => setShowDone(!showDone)}
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-600 transition mb-3"
          >
            <ChevronDown size={14} className={`transition-transform ${showDone ? 'rotate-180' : ''}`} />
            הושלמו ({done.length})
          </button>
          {showDone && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              {done.map(t => <TaskRow key={t.id} task={t} faded />)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
