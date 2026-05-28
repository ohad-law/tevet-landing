'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const FEE_STATUSES = ['לא שולמה', 'שולמה', 'הוחזרה'] as const
type FeeStatus = typeof FEE_STATUSES[number]

const statusStyle: Record<FeeStatus, string> = {
  'לא שולמה': 'bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200',
  'שולמה':    'bg-green-100 text-green-700 border-green-200 hover:bg-green-200',
  'הוחזרה':   'bg-red-100 text-red-600 border-red-200 hover:bg-red-200',
}

type Props = {
  caseId: string
  initialStatus: FeeStatus | null
}

export default function CaseFeeToggle({ caseId, initialStatus }: Props) {
  const [status, setStatus] = useState<FeeStatus>(initialStatus ?? 'לא שולמה')
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  async function cycle() {
    const idx = FEE_STATUSES.indexOf(status)
    const next = FEE_STATUSES[(idx + 1) % FEE_STATUSES.length]
    setSaving(true)
    setStatus(next)
    await fetch(`/api/crm/cases/${caseId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fee_status: next }),
    })
    setSaving(false)
    router.refresh()
  }

  return (
    <button
      onClick={cycle}
      disabled={saving}
      title="לחץ לשינוי סטטוס תשלום"
      className={`text-xs px-1.5 py-0.5 rounded font-medium border transition disabled:opacity-70 ${statusStyle[status]}`}
    >
      {status}
    </button>
  )
}
