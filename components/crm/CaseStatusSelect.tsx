'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown } from 'lucide-react'

const STATUS_ORDER = [
  'תיק נכנס', 'עריכת כתב תביעה', 'מעקב מספר הליך בנט',
  'מסירה אישית/דואר ישראל', 'הודעה על המצאה', 'תצהיר גילוי מסמכים',
  'תצהיר עדות ראשית', 'הוכחות', 'סיכומים', 'פסק דין', 'ארכיון',
]

const STATUS_COLOR: Record<string, { bg: string; text: string; dot: string }> = {
  'תיק נכנס':                 { bg: 'bg-slate-100',   text: 'text-slate-600',   dot: 'bg-slate-400' },
  'עריכת כתב תביעה':           { bg: 'bg-amber-100',  text: 'text-amber-700',  dot: 'bg-amber-500' },
  'מעקב מספר הליך בנט':        { bg: 'bg-blue-100',   text: 'text-blue-700',   dot: 'bg-blue-500' },
  'מסירה אישית/דואר ישראל':    { bg: 'bg-orange-100', text: 'text-orange-700', dot: 'bg-orange-500' },
  'הודעה על המצאה':            { bg: 'bg-purple-100', text: 'text-purple-700', dot: 'bg-purple-500' },
  'תצהיר גילוי מסמכים':        { bg: 'bg-indigo-100', text: 'text-indigo-700', dot: 'bg-indigo-500' },
  'תצהיר עדות ראשית':          { bg: 'bg-pink-100',   text: 'text-pink-700',   dot: 'bg-pink-500' },
  'הוכחות':                    { bg: 'bg-red-100',    text: 'text-red-700',    dot: 'bg-red-500' },
  'סיכומים':                   { bg: 'bg-violet-100', text: 'text-violet-700', dot: 'bg-violet-500' },
  'פסק דין':                   { bg: 'bg-green-100',  text: 'text-green-700',  dot: 'bg-green-500' },
  'ארכיון':                    { bg: 'bg-slate-100',  text: 'text-slate-400',  dot: 'bg-slate-300' },
}

export default function CaseStatusSelect({ caseId, initialStatus }: { caseId: string; initialStatus: string }) {
  const [status, setStatus] = useState(initialStatus)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const sc = STATUS_COLOR[status] ?? STATUS_COLOR['תיק נכנס']

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function changeStatus(newStatus: string) {
    if (newStatus === status) { setOpen(false); return }
    setSaving(true)
    setStatus(newStatus)
    setOpen(false)
    await fetch(`/api/crm/cases/${caseId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    setSaving(false)
    router.refresh()
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        disabled={saving}
        className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full transition ${sc.bg} ${sc.text} hover:opacity-80 cursor-pointer`}
        title="לחץ לשינוי סטטוס"
      >
        <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
        {status}
        <ChevronDown size={10} className={open ? 'rotate-180 transition' : 'transition'} />
      </button>

      {open && (
        <div className="absolute top-full mt-1.5 right-0 bg-white rounded-xl shadow-xl border border-slate-200 z-20 overflow-hidden min-w-52">
          {STATUS_ORDER.map(s => {
            const c = STATUS_COLOR[s]
            return (
              <button
                key={s}
                onClick={() => changeStatus(s)}
                className={`w-full text-right px-4 py-2.5 text-sm flex items-center gap-2.5 hover:bg-slate-50 transition ${
                  s === status ? 'bg-blue-50 font-medium text-blue-700' : 'text-slate-700'
                }`}
              >
                <span className={`w-2 h-2 rounded-full shrink-0 ${c?.dot ?? 'bg-slate-300'}`} />
                {s}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
