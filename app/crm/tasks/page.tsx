import { createClient } from '@/lib/supabase/server'

export const revalidate = 0

export default async function TasksPage() {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  const [{ data: tasks }, { data: cases }] = await Promise.all([
    supabase.from('tasks').select('*').order('due_date', { ascending: true, nullsFirst: false }),
    supabase.from('cases').select('id, case_name, case_number'),
  ])

  const caseMap = Object.fromEntries((cases ?? []).map(c => [c.id, `${c.case_name} #${c.case_number}`]))

  const open = (tasks ?? []).filter(t => t.status !== 'הושלמה')
  const done = (tasks ?? []).filter(t => t.status === 'הושלמה')

  const priorityStyle: Record<string, string> = {
    'דחוף': 'bg-red-100 text-red-700 border-red-200',
    'גבוה': 'bg-orange-100 text-orange-700 border-orange-200',
    'רגיל': 'bg-slate-100 text-slate-600 border-slate-200',
  }

  return (
    <div className="space-y-6" style={{ fontFamily: 'Assistant, sans-serif' }}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">משימות</h1>
          <p className="text-slate-500 text-sm mt-0.5">{open.length} פתוחות · {done.length} הושלמו</p>
        </div>
      </div>

      <div className="space-y-3">
        {open.map(task => {
          const isOverdue = task.due_date && task.due_date < today
          return (
            <div key={task.id} className={`bg-white rounded-xl border px-5 py-4 flex items-center justify-between gap-4 ${isOverdue ? 'border-red-200 bg-red-50/30' : 'border-slate-200'}`}>
              <div className="flex items-start gap-3">
                <div className={`mt-1 w-2.5 h-2.5 rounded-full shrink-0 ${
                  task.priority === 'דחוף' ? 'bg-red-500' :
                  task.priority === 'גבוה' ? 'bg-orange-500' : 'bg-blue-400'
                }`} />
                <div>
                  <p className="font-medium text-slate-800">{task.description}</p>
                  {task.case_id && (
                    <p className="text-xs text-slate-400 mt-0.5">⚖️ {caseMap[task.case_id] ?? task.case_id}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {task.due_date && (
                  <span className={`text-xs font-mono ${isOverdue ? 'text-red-600 font-bold' : 'text-slate-400'}`}>
                    {task.due_date}
                  </span>
                )}
                <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${priorityStyle[task.priority] ?? 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                  {task.priority}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  task.status === 'בטיפול' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                }`}>
                  {task.status}
                </span>
              </div>
            </div>
          )
        })}
        {open.length === 0 && (
          <div className="text-center py-16 text-slate-400 bg-white rounded-2xl border border-slate-200">
            <p className="text-3xl mb-2">✅</p>
            <p>אין משימות פתוחות — כל הכבוד!</p>
          </div>
        )}
      </div>
    </div>
  )
}
