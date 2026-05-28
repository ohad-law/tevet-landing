import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import TasksList from '@/components/crm/TasksList'

export const revalidate = 0

export default async function TasksPage() {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  const [{ data: tasks }, { data: cases }] = await Promise.all([
    supabase.from('tasks').select('id, description, status, priority, due_date, case_id').order('due_date', { ascending: true, nullsFirst: false }),
    supabase.from('cases').select('id, case_name, case_number'),
  ])

  const caseMap = Object.fromEntries((cases ?? []).map(c => [c.id, `${c.case_name} #${c.case_number}`]))

  const open = (tasks ?? []).filter(t => t.status !== 'הושלמה')
  const done = (tasks ?? []).filter(t => t.status === 'הושלמה')

  return (
    <div className="space-y-6" style={{ fontFamily: 'Assistant, sans-serif' }}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">משימות</h1>
          <p className="text-slate-500 text-sm mt-0.5">{open.length} פתוחות · {done.length} הושלמו</p>
        </div>
        <Link
          href="/crm/tasks/new"
          className="bg-slate-900 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-slate-800 transition"
        >
          + משימה חדשה
        </Link>
      </div>

      <TasksList initialTasks={tasks ?? []} caseMap={caseMap} today={today} />
    </div>
  )
}
