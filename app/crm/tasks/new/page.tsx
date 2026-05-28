import { createClient } from '@/lib/supabase/server'
import TaskForm from '@/components/crm/TaskForm'

export const revalidate = 0

export default async function NewTaskPage() {
  const supabase = await createClient()
  const { data: cases } = await supabase
    .from('cases')
    .select('id, case_name, case_number')
    .neq('status', 'ארכיון')
    .order('case_name')

  return <TaskForm cases={cases ?? []} />
}
