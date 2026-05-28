'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

const CASE_STATUSES = [
  'תיק נכנס', 'עריכת כתב תביעה', 'מעקב מספר הליך בנט',
  'מסירה אישית/דואר ישראל', 'הודעה על המצאה', 'תצהיר גילוי מסמכים',
  'תצהיר עדות ראשית', 'הוכחות', 'סיכומים', 'פסק דין', 'ארכיון',
]

type Client = { id: string; full_name: string }

type CaseData = {
  id?: string
  case_name?: string
  case_number?: string
  case_type?: string
  status?: string
  client_id?: string
  court_name?: string
  open_date?: string
  fee?: string
  fee_amount?: number | null
  notes?: string
  value?: number | null
  assigned_to?: string
  net_hamishpat_number?: string
  target_close_date?: string
  defendant_name?: string
  parties?: string
  case_description?: string
}

type Props = {
  clients: Client[]
  initialData?: CaseData
  defaultClientId?: string
}

export default function CaseForm({ clients, initialData, defaultClientId }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const isEdit = !!initialData?.id

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const data = Object.fromEntries(new FormData(e.currentTarget))

    const url = isEdit ? `/api/crm/cases/${initialData!.id}` : '/api/crm/cases'
    const method = isEdit ? 'PATCH' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (!res.ok) {
      const err = await res.json()
      setError(err.error ?? 'שגיאה בשמירה')
      setLoading(false)
      return
    }

    if (isEdit) {
      router.push(`/crm/cases/${initialData!.id}`)
      router.refresh()
    } else {
      const { id } = await res.json()
      router.push(`/crm/cases/${id}`)
    }
  }

  const d = initialData ?? {}

  return (
    <div className="space-y-6 max-w-2xl" style={{ fontFamily: 'Assistant, sans-serif' }}>
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <Link href="/crm/cases" className="hover:text-slate-600 transition flex items-center gap-1">
          <ArrowRight size={14} />
          תיקים
        </Link>
        {isEdit && (
          <>
            <span>/</span>
            <Link href={`/crm/cases/${d.id}`} className="hover:text-slate-600 transition">
              {d.case_name}
            </Link>
          </>
        )}
        <span>/</span>
        <span className="text-slate-600 font-medium">{isEdit ? 'עריכה' : 'תיק חדש'}</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-slate-800">{isEdit ? 'עריכת תיק' : 'פתיחת תיק חדש'}</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">שם התיק *</label>
            <input
              name="case_name"
              required
              type="text"
              defaultValue={d.case_name ?? ''}
              placeholder="למשל: כהן נ׳ מפעלים בע״מ"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-400 transition text-right bg-slate-50 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">מספר תיק</label>
            <input
              name="case_number"
              type="text"
              defaultValue={d.case_number ?? ''}
              placeholder="מספר תיק בית משפט"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-400 transition text-right bg-slate-50 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">סוג תיק</label>
            <input
              name="case_type"
              type="text"
              defaultValue={d.case_type ?? ''}
              placeholder="פיטורים, שכר, תאונה..."
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-400 transition text-right bg-slate-50 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">לקוח</label>
            <select
              name="client_id"
              defaultValue={d.client_id ?? defaultClientId ?? ''}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-400 transition bg-slate-50 focus:bg-white"
            >
              <option value="">— בחר לקוח —</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.full_name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">סטטוס</label>
            <select
              name="status"
              defaultValue={d.status ?? 'תיק נכנס'}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-400 transition bg-slate-50 focus:bg-white"
            >
              {CASE_STATUSES.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">בית משפט</label>
            <input
              name="court_name"
              type="text"
              defaultValue={d.court_name ?? ''}
              placeholder="שם בית המשפט"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-400 transition text-right bg-slate-50 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">תאריך פתיחה</label>
            <input
              name="open_date"
              type="date"
              defaultValue={d.open_date ?? ''}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-400 transition bg-slate-50 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">מספר הליך בנט</label>
            <input
              name="net_hamishpat_number"
              type="text"
              defaultValue={d.net_hamishpat_number ?? ''}
              placeholder="מספר בנט המשפט"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-400 transition text-right bg-slate-50 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">נתבע</label>
            <input
              name="defendant_name"
              type="text"
              defaultValue={d.defendant_name ?? ''}
              placeholder="שם הנתבע"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-400 transition text-right bg-slate-50 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">ערך תביעה (₪)</label>
            <input
              name="value"
              type="number"
              defaultValue={d.value ?? ''}
              placeholder="0"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-400 transition text-right bg-slate-50 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">סכום שכ"ט (₪)</label>
            <input
              name="fee_amount"
              type="number"
              defaultValue={d.fee_amount ?? ''}
              placeholder="0"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-400 transition text-right bg-slate-50 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">שכ״ט (תיאור)</label>
            <input
              name="fee"
              type="text"
              defaultValue={d.fee ?? ''}
              placeholder="למשל: 15% מהפיצוי"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-400 transition text-right bg-slate-50 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">יעד סיום</label>
            <input
              name="target_close_date"
              type="date"
              defaultValue={d.target_close_date ?? ''}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-400 transition bg-slate-50 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">אחראי תיק</label>
            <input
              name="assigned_to"
              type="text"
              defaultValue={d.assigned_to ?? ''}
              placeholder="שם עורך הדין"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-400 transition text-right bg-slate-50 focus:bg-white"
            />
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">צדדים</label>
            <textarea
              name="parties"
              rows={2}
              defaultValue={d.parties ?? ''}
              placeholder="שמות הצדדים בתיק..."
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-400 transition text-right bg-slate-50 focus:bg-white resize-none"
            />
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">תיאור התיק</label>
            <textarea
              name="case_description"
              rows={3}
              defaultValue={d.case_description ?? ''}
              placeholder="תיאור קצר של התיק..."
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-400 transition text-right bg-slate-50 focus:bg-white resize-none"
            />
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">הערות</label>
            <textarea
              name="notes"
              rows={3}
              defaultValue={d.notes ?? ''}
              placeholder="הערות נוספות..."
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-400 transition text-right bg-slate-50 focus:bg-white resize-none"
            />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-blue-700 transition disabled:opacity-50"
          >
            {loading ? 'שומר...' : isEdit ? 'שמור שינויים' : 'פתח תיק'}
          </button>
          <Link
            href={isEdit ? `/crm/cases/${d.id}` : '/crm/cases'}
            className="text-sm text-slate-500 px-4 py-2.5 rounded-xl hover:bg-slate-100 transition"
          >
            ביטול
          </Link>
        </div>
      </form>
    </div>
  )
}
