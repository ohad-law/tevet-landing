'use client'
import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Search, X } from 'lucide-react'

type Case = {
  id: string
  case_number: string | null
  case_name: string
  client_id: string | null
  case_type: string | null
  status: string
  assigned_to: string | null
  value: number | null
}

const STATUS_COLOR: Record<string, string> = {
  'תיק נכנס': 'bg-slate-100 text-slate-600',
  'עריכת כתב תביעה': 'bg-yellow-100 text-yellow-700',
  'מעקב מספר הליך בנט': 'bg-blue-100 text-blue-700',
  'מסירה אישית/דואר ישראל': 'bg-orange-100 text-orange-700',
  'הודעה על המצאה': 'bg-purple-100 text-purple-700',
  'תצהיר גילוי מסמכים': 'bg-indigo-100 text-indigo-700',
  'תצהיר עדות ראשית': 'bg-pink-100 text-pink-700',
  'הוכחות': 'bg-red-100 text-red-700',
  'סיכומים': 'bg-amber-100 text-amber-700',
  'פסק דין': 'bg-green-100 text-green-700',
  'ארכיון': 'bg-slate-100 text-slate-400',
}

type Props = {
  cases: Case[]
  clientMap: Record<string, string>
}

export default function CasesTable({ cases, clientMap }: Props) {
  const [search, setSearch] = useState('')
  const [view, setView] = useState<'active' | 'archive' | 'all'>('active')
  const [typeFilter, setTypeFilter] = useState('')

  const caseTypes = useMemo(() => {
    const types = new Set(cases.map(c => c.case_type).filter(Boolean) as string[])
    return Array.from(types).sort()
  }, [cases])

  const active = useMemo(() => cases.filter(c => c.status !== 'ארכיון' && c.status !== 'פסק דין'), [cases])
  const archived = useMemo(() => cases.filter(c => c.status === 'ארכיון' || c.status === 'פסק דין'), [cases])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const pool = view === 'active' ? active : view === 'archive' ? archived : cases
    return pool.filter(c => {
      if (typeFilter && c.case_type !== typeFilter) return false
      if (!q) return true
      const clientName = (clientMap[c.client_id ?? ''] ?? '').toLowerCase()
      return (
        c.case_name?.toLowerCase().includes(q) ||
        (c.case_number ?? '').toLowerCase().includes(q) ||
        clientName.includes(q)
      )
    })
  }, [cases, active, archived, search, view, typeFilter, clientMap])

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-3 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-52">
          <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="חיפוש לפי שם תיק, מספר, לקוח..."
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
          {([
            { key: 'active', label: `פעילים (${active.length})` },
            { key: 'archive', label: `ארכיון (${archived.length})` },
            { key: 'all', label: 'הכל' },
          ] as const).map(tab => (
            <button
              key={tab.key}
              onClick={() => setView(tab.key)}
              className={`text-xs px-3 py-1 rounded-md font-medium transition ${
                view === tab.key
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {caseTypes.length > 0 && (
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-600 outline-none focus:border-blue-400"
          >
            <option value="">כל הסוגים</option>
            {caseTypes.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        )}

        <span className="text-xs text-slate-400 mr-auto">{filtered.length} תיקים</span>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs border-b border-slate-100">
                <th className="text-right font-semibold px-5 py-3">מס׳ תיק</th>
                <th className="text-right font-semibold px-5 py-3">שם התיק</th>
                <th className="text-right font-semibold px-5 py-3">לקוח</th>
                <th className="text-right font-semibold px-5 py-3">סוג</th>
                <th className="text-right font-semibold px-5 py-3">סטטוס</th>
                <th className="text-right font-semibold px-5 py-3">אחראי</th>
                <th className="text-right font-semibold px-5 py-3">ערך</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(c => (
                <tr key={c.id} className="hover:bg-slate-50/60 transition group">
                  <td className="px-5 py-3.5 font-mono text-slate-400 text-xs">{c.case_number ?? '—'}</td>
                  <td className="px-5 py-3.5">
                    <Link
                      href={`/crm/cases/${c.id}`}
                      className="font-semibold text-slate-800 group-hover:text-blue-600 transition"
                    >
                      {c.case_name}
                    </Link>
                  </td>
                  <td className="px-5 py-3.5 text-slate-600">
                    {c.client_id ? (
                      <Link href={`/crm/clients/${c.client_id}`} className="hover:text-blue-600 transition">
                        {clientMap[c.client_id] ?? '—'}
                      </Link>
                    ) : '—'}
                  </td>
                  <td className="px-5 py-3.5 text-slate-500 text-xs">{c.case_type ?? '—'}</td>
                  <td className="px-5 py-3.5">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLOR[c.status] ?? 'bg-slate-100 text-slate-500'}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-slate-500 text-xs">{c.assigned_to ?? '—'}</td>
                  <td className="px-5 py-3.5 text-slate-600 text-xs font-mono">
                    {c.value ? `₪${Number(c.value).toLocaleString()}` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <p className="text-2xl mb-2">🔍</p>
              <p className="text-sm">לא נמצאו תיקים תואמים</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
