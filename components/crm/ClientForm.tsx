'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

type ClientData = {
  id?: string
  full_name?: string
  phone?: string
  email?: string
  address?: string
  id_number?: string
  status?: string
  notes?: string
}

type Props = {
  initialData?: ClientData
}

export default function ClientForm({ initialData }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const isEdit = !!initialData?.id

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const data = Object.fromEntries(new FormData(e.currentTarget))
    const url = isEdit ? `/api/crm/clients/${initialData!.id}` : '/api/crm/clients'
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
      router.push(`/crm/clients/${initialData!.id}`)
      router.refresh()
    } else {
      const { id } = await res.json()
      router.push(`/crm/clients/${id}`)
    }
  }

  const d = initialData ?? {}

  return (
    <div className="space-y-6 max-w-2xl" style={{ fontFamily: 'Assistant, sans-serif' }}>
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <Link href="/crm/clients" className="hover:text-slate-600 transition flex items-center gap-1">
          <ArrowRight size={14} />
          לקוחות
        </Link>
        {isEdit && (
          <>
            <span>/</span>
            <Link href={`/crm/clients/${d.id}`} className="hover:text-slate-600 transition">
              {d.full_name}
            </Link>
          </>
        )}
        <span>/</span>
        <span className="text-slate-600 font-medium">{isEdit ? 'עריכה' : 'לקוח חדש'}</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-slate-800">{isEdit ? 'עריכת לקוח' : 'הוספת לקוח חדש'}</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">שם מלא *</label>
            <input
              name="full_name"
              required
              type="text"
              defaultValue={d.full_name ?? ''}
              placeholder="שם פרטי ומשפחה"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-400 transition text-right bg-slate-50 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">טלפון</label>
            <input
              name="phone"
              type="tel"
              defaultValue={d.phone ?? ''}
              placeholder="050-0000000"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-400 transition text-right bg-slate-50 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">אימייל</label>
            <input
              name="email"
              type="email"
              defaultValue={d.email ?? ''}
              placeholder="example@mail.com"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-400 transition text-right bg-slate-50 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">תעודת זהות</label>
            <input
              name="id_number"
              type="text"
              defaultValue={d.id_number ?? ''}
              placeholder="000000000"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-400 transition text-right bg-slate-50 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">סטטוס</label>
            <select
              name="status"
              defaultValue={d.status ?? 'פעיל'}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-400 transition bg-slate-50 focus:bg-white"
            >
              <option value="פעיל">פעיל</option>
              <option value="ממתין">ממתין</option>
              <option value="ארכיון">ארכיון</option>
            </select>
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">כתובת</label>
            <input
              name="address"
              type="text"
              defaultValue={d.address ?? ''}
              placeholder="רחוב, עיר"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-400 transition text-right bg-slate-50 focus:bg-white"
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
            {loading ? 'שומר...' : isEdit ? 'שמור שינויים' : 'הוסף לקוח'}
          </button>
          <Link
            href={isEdit ? `/crm/clients/${d.id}` : '/crm/clients'}
            className="text-sm text-slate-500 px-4 py-2.5 rounded-xl hover:bg-slate-100 transition"
          >
            ביטול
          </Link>
        </div>
      </form>
    </div>
  )
}
