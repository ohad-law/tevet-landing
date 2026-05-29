'use client'

import { useState, useRef, useCallback } from 'react'
import {
  Sparkles,
  Upload,
  X,
  Copy,
  Download,
  AlertCircle,
  FileText,
  Loader2,
  CheckCheck,
} from 'lucide-react'

interface Props {
  caseId: string
  caseName: string
}

const INSTRUCTION_PRESETS = [
  { label: 'כתב תביעה', value: 'נסח כתב תביעה מלא על בסיס נתוני התיק. כלול פרטי הצדדים, עילות התביעה, הסעד המבוקש ופרטי ייצוג.' },
  { label: 'סיכומים', value: 'כתוב סיכומים משפטיים מפורטים לתיק זה. כלול עובדות המקרה, המסגרת המשפטית, טענות המצדדים, ניתוח והמלצה.' },
  { label: 'מכתב דרישה', value: 'נסח מכתב דרישה מקצועי לנתבע. פרט את הדרישות, המועד לתגובה, והתוצאות האפשריות אם לא יפעל.' },
  { label: 'סיכום לקוח', value: 'כתוב עדכון מצב תיק ממוקד ללקוח, בשפה ידידותית (לא משפטית). פרט מה קרה, מה הצעד הבא ומה צפוי.' },
  { label: 'תזכיר פנימי', value: 'הכן תזכיר פנימי למשרד המסכם את מצב התיק, הסיכונים, הזדמנויות ומשימות דחופות.' },
]

export default function CaseAIAgent({ caseId, caseName }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [instruction, setInstruction] = useState('')
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const resultRef = useRef<HTMLDivElement>(null)

  const handleFile = useCallback((file: File) => {
    if (file.type !== 'application/pdf') {
      setError('יש לבחור קובץ PDF בלבד')
      return
    }
    if (file.size > 30 * 1024 * 1024) {
      setError('הקובץ גדול מדי (מקסימום 30MB)')
      return
    }
    setPdfFile(file)
    setError('')
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const toBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        // Strip data URL prefix: "data:application/pdf;base64,"
        resolve(result.split(',')[1])
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })

  const handleSubmit = async () => {
    if (!instruction.trim()) {
      setError('יש להזין הוראה')
      return
    }

    setIsLoading(true)
    setResult('')
    setError('')

    try {
      let pdfBase64: string | undefined
      if (pdfFile) {
        pdfBase64 = await toBase64(pdfFile)
      }

      const response = await fetch('/api/crm/ai-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId, instruction, pdfBase64 }),
      })

      if (!response.ok) {
        const err = await response.json() as { error?: string }
        throw new Error(err.error ?? 'שגיאה בשרת')
      }

      if (!response.body) throw new Error('אין תגובה מהשרת')

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        accumulated += chunk
        setResult(accumulated)
        // Auto-scroll to bottom
        requestAnimationFrame(() => {
          if (resultRef.current) {
            resultRef.current.scrollTop = resultRef.current.scrollHeight
          }
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה לא ידועה')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(result)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleExportWord = async () => {
    if (!result) return
    setIsExporting(true)
    try {
      const response = await fetch('/api/crm/ai-agent/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: result, title: caseName }),
      })
      if (!response.ok) throw new Error('שגיאה ביצירת קובץ')
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${caseName}.docx`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בייצוא')
    } finally {
      setIsExporting(false)
    }
  }

  const handleReset = () => {
    setResult('')
    setInstruction('')
    setPdfFile(null)
    setError('')
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Header — always visible */}
      <button
        onClick={() => setIsOpen(v => !v)}
        className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50 transition"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-sm">
            <Sparkles size={14} className="text-white" />
          </div>
          <span className="font-semibold text-slate-800 text-sm">סוכן AI לתיק</span>
          <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">Claude Opus</span>
        </div>
        <span className="text-xs text-slate-400">{isOpen ? '▲' : '▼'}</span>
      </button>

      {/* Expandable body */}
      {isOpen && (
        <div className="border-t border-slate-100 p-5 space-y-4">

          {/* Result view */}
          {result ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">תוצאה</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 border border-slate-200 px-2.5 py-1 rounded-lg hover:bg-slate-50 transition"
                  >
                    {copied ? <CheckCheck size={13} className="text-green-600" /> : <Copy size={13} />}
                    {copied ? 'הועתק' : 'העתק'}
                  </button>
                  <button
                    onClick={handleExportWord}
                    disabled={isExporting}
                    className="flex items-center gap-1.5 text-xs text-white bg-gradient-to-br from-amber-500 to-amber-600 px-2.5 py-1 rounded-lg hover:opacity-90 transition disabled:opacity-60"
                  >
                    {isExporting
                      ? <Loader2 size={13} className="animate-spin" />
                      : <Download size={13} />
                    }
                    {isExporting ? 'מייצא...' : 'Word'}
                  </button>
                  <button
                    onClick={handleReset}
                    className="text-xs text-slate-400 hover:text-slate-600 border border-slate-200 px-2.5 py-1 rounded-lg hover:bg-slate-50 transition"
                  >
                    הוראה חדשה
                  </button>
                </div>
              </div>
              <div
                ref={resultRef}
                className="bg-slate-50 rounded-lg border border-slate-200 p-4 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed max-h-[500px] overflow-y-auto text-right font-sans"
                dir="rtl"
              >
                {result}
                {isLoading && (
                  <span className="inline-block w-1 h-4 bg-amber-500 animate-pulse mr-1 align-text-bottom" />
                )}
              </div>
            </div>
          ) : (
            /* Input form */
            <div className="space-y-4">

              {/* Quick presets */}
              <div>
                <p className="text-xs text-slate-400 mb-2">פעולות מהירות:</p>
                <div className="flex flex-wrap gap-1.5">
                  {INSTRUCTION_PRESETS.map(p => (
                    <button
                      key={p.label}
                      onClick={() => setInstruction(p.value)}
                      className={`text-xs px-2.5 py-1 rounded-full border transition ${
                        instruction === p.value
                          ? 'bg-amber-50 border-amber-300 text-amber-700 font-medium'
                          : 'border-slate-200 text-slate-500 hover:border-amber-300 hover:text-amber-700 hover:bg-amber-50'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Instruction textarea */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  הוראה לסוכן <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={instruction}
                  onChange={e => setInstruction(e.target.value)}
                  placeholder="לדוגמה: נסח כתב תביעה מלא לתיק זה, כולל פרטי הצדדים ועילות התביעה..."
                  rows={4}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 text-right placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent resize-none"
                  style={{ direction: 'rtl', color: '#1e293b', background: '#fff' }}
                />
              </div>

              {/* PDF upload */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  צרף מסמך PDF <span className="text-slate-400">(אופציונלי)</span>
                </label>
                {pdfFile ? (
                  <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    <FileText size={15} className="text-amber-600 shrink-0" />
                    <span className="text-sm text-amber-700 truncate flex-1">{pdfFile.name}</span>
                    <span className="text-xs text-amber-500 shrink-0">{(pdfFile.size / 1024).toFixed(0)}KB</span>
                    <button
                      onClick={() => setPdfFile(null)}
                      className="text-amber-400 hover:text-amber-600 transition shrink-0"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div
                    onDragOver={e => { e.preventDefault(); setIsDragOver(true) }}
                    onDragLeave={() => setIsDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition ${
                      isDragOver
                        ? 'border-amber-400 bg-amber-50'
                        : 'border-slate-200 hover:border-amber-300 hover:bg-amber-50/50'
                    }`}
                  >
                    <Upload size={18} className="mx-auto text-slate-300 mb-1.5" />
                    <p className="text-xs text-slate-400">גרור PDF לכאן או <span className="text-amber-600 font-medium">לחץ לבחירה</span></p>
                    <p className="text-xs text-slate-300 mt-0.5">מקסימום 30MB</p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="application/pdf"
                      className="hidden"
                      onChange={e => {
                        const f = e.target.files?.[0]
                        if (f) handleFile(f)
                        e.target.value = ''
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <AlertCircle size={14} className="shrink-0" />
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={isLoading || !instruction.trim()}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold text-white bg-gradient-to-br from-amber-500 to-amber-600 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm shadow-amber-200"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    הסוכן עובד...
                  </>
                ) : (
                  <>
                    <Sparkles size={15} />
                    הפעל סוכן
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
