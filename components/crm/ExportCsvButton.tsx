'use client'
import { Download } from 'lucide-react'

type Props = {
  data: Record<string, unknown>[]
  filename: string
  label?: string
}

export default function ExportCsvButton({ data, filename, label = 'ייצוא CSV' }: Props) {
  function exportCsv() {
    if (!data.length) return
    const headers = Object.keys(data[0])
    const rows = data.map(row =>
      headers.map(h => {
        const v = row[h]
        if (v == null) return ''
        const s = String(v).replace(/"/g, '""')
        return s.includes(',') || s.includes('\n') || s.includes('"') ? `"${s}"` : s
      }).join(',')
    )
    const bom = '﻿'
    const csv = bom + [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <button
      onClick={exportCsv}
      className="flex items-center gap-1.5 text-xs text-slate-500 border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 hover:text-slate-700 transition font-medium"
    >
      <Download size={13} />
      {label}
    </button>
  )
}
