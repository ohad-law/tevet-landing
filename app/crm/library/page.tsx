'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Upload, FileText, Trash2, BookOpen,
  CheckCircle2, AlertCircle, Loader2, X, Tag,
} from 'lucide-react'

type DocStatus = 'processing' | 'ready' | 'error'

interface LibraryDoc {
  id: string
  filename: string
  file_type: string
  file_size: number
  tags: string[]
  status: DocStatus
  chunk_count: number
  created_at: string
  error_msg?: string
}

const FILE_TYPE_ICON: Record<string, string> = {
  pdf: '📄', docx: '📝', xlsx: '📊', image: '🖼️', txt: '📃',
}

const STATUS_LABEL: Record<DocStatus, { label: string; color: string }> = {
  processing: { label: 'מעבד...', color: '#d97706' },
  ready:      { label: 'מוכן',    color: '#16a34a' },
  error:      { label: 'שגיאה',   color: '#dc2626' },
}

function formatSize(bytes: number) {
  if (bytes < 1024)       return `${bytes} B`
  if (bytes < 1048576)    return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

export default function LibraryPage() {
  const [docs, setDocs]           = useState<LibraryDoc[]>([])
  const [loading, setLoading]     = useState(true)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver]   = useState(false)
  const [tagInput, setTagInput]   = useState('')
  const [pendingTags, setPendingTags] = useState<string[]>([])
  const [uploadProgress, setUploadProgress] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchDocs = useCallback(async () => {
    try {
      const res = await fetch('/api/crm/library')
      if (res.ok) setDocs(await res.json())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDocs()
    // Poll for processing docs
    const interval = setInterval(() => {
      setDocs(prev => {
        if (prev.some(d => d.status === 'processing')) {
          fetchDocs()
        }
        return prev
      })
    }, 3000)
    return () => clearInterval(interval)
  }, [fetchDocs])

  const handleFiles = async (files: FileList | File[]) => {
    const arr = Array.from(files)
    if (!arr.length) return
    setUploading(true)

    for (const file of arr) {
      setUploadProgress(`מעלה: ${file.name}`)
      const fd = new FormData()
      fd.append('file', file)
      fd.append('tags', JSON.stringify(pendingTags))
      try {
        const res = await fetch('/api/crm/library/upload', { method: 'POST', body: fd })
        if (!res.ok) {
          const { error } = await res.json()
          alert(`שגיאה: ${error}`)
        }
      } catch {
        alert(`שגיאה בהעלאת ${file.name}`)
      }
    }

    setUploadProgress(null)
    setUploading(false)
    await fetchDocs()
  }

  const handleDelete = async (id: string, filename: string) => {
    if (!confirm(`למחוק את "${filename}"?`)) return
    await fetch('/api/crm/library', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setDocs(prev => prev.filter(d => d.id !== id))
  }

  const addTag = () => {
    const t = tagInput.trim()
    if (t && !pendingTags.includes(t)) setPendingTags(prev => [...prev, t])
    setTagInput('')
  }

  const readyCount = docs.filter(d => d.status === 'ready').length
  const totalChunks = docs.filter(d => d.status === 'ready').reduce((s, d) => s + (d.chunk_count ?? 0), 0)

  return (
    <div style={{ fontFamily: "'Assistant', sans-serif", color: '#1e293b' }} className="space-y-5">

      {/* Header */}
      <div className="crm-in crm-d1">
        <h1 className="text-3xl font-extrabold tracking-tight" style={{ color: '#0f172a' }}>
          ספריית הידע
        </h1>
        <p className="text-sm mt-1" style={{ color: '#94a3b8' }}>
          {readyCount > 0
            ? `${readyCount} מסמכים מוכנים · ${totalChunks.toLocaleString()} קטעים לחיפוש`
            : 'העלה מסמכים ממשרדך — כתבי טענות, פסקי דין, מכתבים'}
        </p>
      </div>

      {/* Upload zone */}
      <div
        className="crm-in crm-d2 rounded-xl transition-all cursor-pointer"
        style={{
          border: `2px dashed ${dragOver ? '#d97706' : '#e2e8f0'}`,
          background: dragOver ? 'rgba(217,119,6,0.04)' : '#fff',
          padding: '32px 24px',
          textAlign: 'center',
        }}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => {
          e.preventDefault()
          setDragOver(false)
          handleFiles(e.dataTransfer.files)
        }}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.docx,.doc,.xlsx,.xls,.txt,.jpg,.jpeg,.png,.webp"
          className="hidden"
          onChange={e => e.target.files && handleFiles(e.target.files)}
        />

        {uploading ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 size={28} color="#d97706" className="animate-spin" />
            <p className="text-sm font-medium" style={{ color: '#d97706' }}>{uploadProgress}</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload size={26} color="#94a3b8" />
            <p className="text-sm font-semibold" style={{ color: '#475569' }}>
              גרור קבצים לכאן או לחץ לבחירה
            </p>
            <p className="text-xs" style={{ color: '#94a3b8' }}>
              PDF · Word · Excel · תמונות · TXT — עד 50MB לקובץ
            </p>
          </div>
        )}
      </div>

      {/* Tags for next upload */}
      <div className="crm-in crm-d3 rounded-xl p-4" style={{ background: '#fff', border: '1px solid #eaecf0' }}>
        <p className="text-xs font-semibold mb-2" style={{ color: '#64748b' }}>תגיות לקבצים הבאים (אופציונלי)</p>
        <div className="flex flex-wrap gap-2 mb-2">
          {pendingTags.map(t => (
            <span
              key={t}
              className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full"
              style={{ background: 'rgba(217,119,6,0.1)', color: '#d97706' }}
            >
              {t}
              <button onClick={() => setPendingTags(prev => prev.filter(p => p !== t))}>
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="למשל: פיטורים, צו הרחבה, ענף ההובלה..."
            value={tagInput}
            onChange={e => setTagInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addTag()}
            className="flex-1 text-xs rounded-lg px-3 py-2"
            style={{
              border: '1px solid #e2e8f0',
              outline: 'none',
              fontFamily: 'inherit',
              color: '#1e293b',
            }}
          />
          <button
            onClick={addTag}
            className="px-3 py-2 rounded-lg text-xs font-semibold transition-colors"
            style={{ background: '#f1f5f9', color: '#475569' }}
          >
            <Tag size={13} />
          </button>
        </div>
      </div>

      {/* Documents list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 size={24} color="#94a3b8" className="animate-spin" />
        </div>
      ) : docs.length === 0 ? (
        <div
          className="crm-in crm-d4 rounded-xl p-12 text-center"
          style={{ background: '#fff', border: '1px solid #eaecf0' }}
        >
          <BookOpen size={36} className="mx-auto mb-3" color="#cbd5e1" />
          <p className="font-semibold text-sm" style={{ color: '#475569' }}>הספרייה ריקה</p>
          <p className="text-xs mt-1" style={{ color: '#94a3b8' }}>העלה את המסמכים הראשונים כדי שהסוכן יתחיל ללמוד</p>
        </div>
      ) : (
        <div
          className="crm-in crm-d4 rounded-xl overflow-hidden"
          style={{ background: '#fff', border: '1px solid #eaecf0' }}
        >
          <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: '1px solid #f1f5f9' }}>
            <div className="flex items-center gap-2">
              <BookOpen size={15} color="#94a3b8" />
              <span className="font-semibold text-sm" style={{ color: '#0f172a' }}>מסמכים</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: '#f1f5f9', color: '#64748b' }}>
                {docs.length}
              </span>
            </div>
          </div>

          <div className="divide-y divide-slate-50">
            {docs.map(doc => {
              const st = STATUS_LABEL[doc.status]
              return (
                <div key={doc.id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors">
                  {/* Icon */}
                  <span className="text-xl shrink-0">{FILE_TYPE_ICON[doc.file_type] ?? '📄'}</span>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: '#1e293b' }}>
                      {doc.filename}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-xs" style={{ color: '#94a3b8' }}>
                        {formatSize(doc.file_size ?? 0)}
                      </span>
                      {doc.status === 'ready' && doc.chunk_count > 0 && (
                        <span className="text-xs" style={{ color: '#94a3b8' }}>
                          · {doc.chunk_count} קטעים
                        </span>
                      )}
                      {doc.tags?.length > 0 && doc.tags.map(t => (
                        <span
                          key={t}
                          className="text-xs px-2 py-0.5 rounded-full"
                          style={{ background: 'rgba(217,119,6,0.08)', color: '#d97706' }}
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                    {doc.status === 'error' && doc.error_msg && (
                      <p className="text-xs mt-0.5" style={{ color: '#dc2626' }}>{doc.error_msg}</p>
                    )}
                  </div>

                  {/* Status */}
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center gap-1.5">
                      {doc.status === 'processing' && <Loader2 size={13} color={st.color} className="animate-spin" />}
                      {doc.status === 'ready'      && <CheckCircle2 size={13} color={st.color} />}
                      {doc.status === 'error'      && <AlertCircle  size={13} color={st.color} />}
                      <span className="text-xs font-semibold" style={{ color: st.color }}>{st.label}</span>
                    </div>

                    <button
                      onClick={() => handleDelete(doc.id, doc.filename)}
                      className="p-1.5 rounded-lg transition-colors"
                      style={{ color: '#cbd5e1' }}
                      onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.color = '#ef4444')}
                      onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.color = '#cbd5e1')}
                      title="מחק מסמך"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

    </div>
  )
}
