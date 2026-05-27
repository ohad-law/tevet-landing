'use client'
import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Search, X } from 'lucide-react'

type Client = {
  id: string
  full_name: string
  phone: string | null
  email: string | null
  status: string | null
}

type Props = {
  clients: Client[]
  caseCountMap: Record<string, number>
}

export default function ClientsGrid({ clients, caseCountMap }: Props) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const statuses = useMemo(() => {
    const s = new Set(clients.map(c => c.status).filter(Boolean) as string[])
    return Array.from(s).sort()
  }, [clients])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return clients.filter(c => {
      if (statusFilter && c.status !== statusFilter) return false
      if (!q) return true
      return (
        c.full_name?.toLowerCase().includes(q) ||
        (c.phone ?? '').includes(q) ||
        (c.email ?? '').toLowerCase().includes(q)
      )
    })
  }, [clients, search, statusFilter])

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-3 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-52">
          <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="חיפוש לפי שם, טלפון, אימייל..."
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
          <button
            onClick={() => setStatusFilter('')}
            className={`text-xs px-3 py-1 rounded-md font-medium transition ${
              !statusFilter ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            הכל ({clients.length})
          </button>
          {statuses.map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(statusFilter === s ? '' : s)}
              className={`text-xs px-3 py-1 rounded-md font-medium transition ${
                statusFilter === s ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <span className="text-xs text-slate-400 mr-auto">{filtered.length} לקוחות</span>
      </div>

      <div className="grid gap-3">
        {filtered.map(client => (
          <Link key={client.id} href={`/crm/clients/${client.id}`}>
            <div className="bg-white rounded-xl border border-slate-200 px-5 py-4 hover:border-blue-300 hover:shadow-md transition-all flex items-center justify-between group">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 font-bold text-sm shrink-0">
                  {client.full_name?.charAt(0) ?? '?'}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-800 group-hover:text-blue-600 transition">{client.full_name}</p>
                  <p className="text-xs text-slate-400 mt-0.5 truncate">
                    {client.phone}
                    {client.email ? ` · ${client.email}` : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-right shrink-0">
                <div>
                  <p className="text-lg font-bold text-slate-800">{caseCountMap[client.id] ?? 0}</p>
                  <p className="text-xs text-slate-400">תיקים פעילים</p>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                  client.status === 'פעיל' ? 'bg-green-100 text-green-700' :
                  client.status === 'ממתין' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-slate-100 text-slate-500'
                }`}>
                  {client.status}
                </span>
              </div>
            </div>
          </Link>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-16 text-slate-400 bg-white rounded-2xl border border-slate-200">
            <p className="text-2xl mb-2">🔍</p>
            <p className="text-sm">לא נמצאו לקוחות תואמים</p>
          </div>
        )}
      </div>
    </div>
  )
}
