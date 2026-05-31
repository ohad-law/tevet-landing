'use client'

import { useState, useRef, useCallback } from 'react'
import { X, Upload, PenLine, Send, CheckCircle2, Loader2, FileText, ChevronRight, ChevronLeft } from 'lucide-react'

interface SignatureField {
  type: 'signature' | 'date' | 'initials'
  page: number
  x: number; y: number; w: number; h: number
}

interface Props {
  caseId:    string
  clientId:  string
  clientName: string
  onClose:   () => void
  onSent:    () => void
}

const FIELD_LABELS = { signature: '✍️ חתימה', date: '📅 תאריך', initials: 'ר"ת' }

export default function SendSignatureModal({ caseId, clientId, clientName, onClose, onSent }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1)

  // Step 1
  const [docName,    setDocName]    = useState('')
  const [pdfBase64,  setPdfBase64]  = useState<string | null>(null)
  const [pdfPages,   setPdfPages]   = useState<string[]>([])
  const [pdfLoading, setPdfLoading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // Step 2 — signature fields
  const [fields,    setFields]    = useState<SignatureField[]>([])
  const [activePage, setActivePage] = useState(0)
  const [addType,   setAddType]   = useState<SignatureField['type']>('signature')
  const imgRef = useRef<HTMLDivElement>(null)

  // Step 3
  const [sendWA,    setSendWA]    = useState(true)
  const [sendEmail, setSendEmail] = useState(false)
  const [sending,   setSending]   = useState(false)
  const [sent,      setSent]      = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  /* ── PDF load ── */
  const loadPdf = useCallback(async (file: File) => {
    setPdfLoading(true)
    const reader = new FileReader()
    reader.onload = async (e) => {
      const base64 = e.target!.result as string
      setPdfBase64(base64)
      if (!docName) setDocName(file.name.replace(/\.pdf$/i, ''))

      try {
        const pdfjsLib = await import('pdfjs-dist')
        pdfjsLib.GlobalWorkerOptions.workerSrc =
          `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`
        const bytes  = Uint8Array.from(atob(base64.split(',')[1]), c => c.charCodeAt(0))
        const pdf    = await pdfjsLib.getDocument({ data: bytes }).promise
        const images: string[] = []
        for (let i = 1; i <= pdf.numPages; i++) {
          const page     = await pdf.getPage(i)
          const viewport = page.getViewport({ scale: 1.5 })
          const canvas   = document.createElement('canvas')
          canvas.width   = viewport.width; canvas.height = viewport.height
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await page.render({ canvasContext: canvas.getContext('2d')!, viewport, canvas } as any).promise
          images.push(canvas.toDataURL('image/jpeg', 0.85))
        }
        setPdfPages(images)
      } catch (err) {
        console.error('PDF render error:', err)
      } finally {
        setPdfLoading(false)
      }
    }
    reader.readAsDataURL(file)
  }, [docName])

  /* ── add field on click ── */
  const handlePageClick = (e: React.MouseEvent<HTMLDivElement>, pageIdx: number) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = (e.clientX - rect.left)  / rect.width
    const y = (e.clientY - rect.top)   / rect.height
    setFields(prev => [...prev, {
      type: addType, page: pageIdx,
      x: Math.max(0, x - 0.08), y: Math.max(0, y - 0.025),
      w: 0.18, h: 0.05,
    }])
  }

  /* ── send ── */
  const handleSend = async () => {
    if (!pdfBase64 || !docName.trim()) { setError('חסר שם מסמך או PDF'); return }
    setSending(true); setError(null)
    try {
      const res = await fetch('/api/crm/signatures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseId, clientId,
          documentName:    docName.trim(),
          pdfBase64,
          signatureFields: fields,
          sendWhatsApp:    sendWA,
          sendEmail,
        }),
      })
      const data = await res.json()
      if (data.error) { setError(data.error); return }
      setSent(true)
      setTimeout(() => { onSent(); onClose() }, 2000)
    } catch {
      setError('שגיאת רשת — נסה שוב')
    } finally {
      setSending(false)
    }
  }

  /* ── render ── */
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}>
      <div
        className="w-full max-w-2xl rounded-2xl overflow-hidden"
        style={{ background: '#fff', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
        onClick={e => e.stopPropagation()}
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid #f1f5f9' }}>
          <div className="flex items-center gap-3">
            <PenLine size={18} color="#d97706" />
            <div>
              <h2 className="font-bold text-slate-900 text-sm">שלח לחתימה דיגיטלית</h2>
              <p className="text-xs text-slate-400">{clientName}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Step indicators */}
            {([1,2,3] as const).map(s => (
              <div key={s} className="flex items-center gap-1">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ background: step >= s ? '#d97706' : '#f1f5f9', color: step >= s ? '#fff' : '#94a3b8' }}>
                  {s}
                </div>
                {s < 3 && <div className="w-4 h-px" style={{ background: step > s ? '#d97706' : '#e2e8f0' }} />}
              </div>
            ))}
            <button onClick={onClose} className="mr-2"><X size={18} color="#94a3b8" /></button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* ── Step 1: Upload ── */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1.5">שם המסמך</label>
                <input value={docName} onChange={e => setDocName(e.target.value)}
                  placeholder="למשל: ייפוי כח, הסכם שכר טרחה..."
                  className="w-full px-3 py-2.5 rounded-lg text-sm"
                  style={{ border: '1.5px solid #e2e8f0', fontFamily: 'inherit', outline: 'none' }} />
              </div>

              <div
                onClick={() => fileRef.current?.click()}
                className="rounded-xl cursor-pointer transition-all flex flex-col items-center justify-center gap-3"
                style={{ border: '2px dashed #e2e8f0', padding: '32px 24px', background: '#fafbfc', minHeight: 160 }}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) loadPdf(f) }}
              >
                <input ref={fileRef} type="file" accept=".pdf" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) loadPdf(f) }} />
                {pdfLoading ? (
                  <><Loader2 size={24} color="#d97706" className="animate-spin" /><p className="text-sm text-slate-500">טוען PDF...</p></>
                ) : pdfPages.length > 0 ? (
                  <><CheckCircle2 size={24} color="#16a34a" />
                    <p className="text-sm font-semibold text-slate-700">{docName}</p>
                    <p className="text-xs text-slate-400">{pdfPages.length} עמודים · לחץ להחלפה</p></>
                ) : (
                  <><Upload size={24} color="#94a3b8" />
                    <p className="text-sm font-semibold text-slate-600">גרור PDF לכאן או לחץ לבחירה</p></>
                )}
              </div>
            </div>
          )}

          {/* ── Step 2: Place fields ── */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500">לחץ על המסמך כדי להוסיף שדה חתימה</p>
                <div className="flex gap-2">
                  {(['signature','date','initials'] as const).map(t => (
                    <button key={t} onClick={() => setAddType(t)}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                      style={{ background: addType === t ? '#0f172a' : '#f1f5f9', color: addType === t ? '#fff' : '#475569' }}>
                      {FIELD_LABELS[t]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Page navigation */}
              {pdfPages.length > 1 && (
                <div className="flex items-center justify-center gap-3">
                  <button onClick={() => setActivePage(p => Math.max(0, p-1))} disabled={activePage === 0}><ChevronRight size={16} /></button>
                  <span className="text-xs text-slate-500">עמוד {activePage+1} מתוך {pdfPages.length}</span>
                  <button onClick={() => setActivePage(p => Math.min(pdfPages.length-1, p+1))} disabled={activePage === pdfPages.length-1}><ChevronLeft size={16} /></button>
                </div>
              )}

              {/* PDF with overlaid fields */}
              <div ref={imgRef} onClick={e => handlePageClick(e, activePage)}
                style={{ position: 'relative', cursor: 'crosshair', userSelect: 'none', borderRadius: 8, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.1)' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={pdfPages[activePage]} alt={`עמוד ${activePage+1}`} style={{ width: '100%', display: 'block' }} />
                {fields.filter(f => f.page === activePage).map((field, fi) => (
                  <div key={fi}
                    style={{
                      position: 'absolute',
                      left:   `${field.x * 100}%`, top:    `${field.y * 100}%`,
                      width:  `${field.w * 100}%`, height: `${field.h * 100}%`,
                      background: 'rgba(217,119,6,0.15)', border: '1.5px solid #d97706',
                      borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'default',
                    }}>
                    <span style={{ fontSize: 10, color: '#d97706', fontWeight: 600 }}>{FIELD_LABELS[field.type]}</span>
                    <button
                      onClick={e => { e.stopPropagation(); setFields(prev => prev.filter((_, i) => i !== fields.indexOf(field))) }}
                      style={{ position: 'absolute', top: -6, left: -6, background: '#fff', borderRadius: '50%', border: '1px solid #e2e8f0', width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                      <X size={9} color="#dc2626" />
                    </button>
                  </div>
                ))}
              </div>

              {fields.length === 0 && (
                <p className="text-xs text-center" style={{ color: '#d97706' }}>
                  ⚠️ לא סומנו שדות חתימה — הלקוח יוכל לחתום בכל מקום במסמך
                </p>
              )}
              {fields.length > 0 && (
                <p className="text-xs text-center text-slate-400">{fields.length} שדות סומנו</p>
              )}
            </div>
          )}

          {/* ── Step 3: Send ── */}
          {step === 3 && (
            <div className="space-y-5">
              {sent ? (
                <div className="text-center py-8">
                  <CheckCircle2 size={56} color="#16a34a" className="mx-auto mb-3" />
                  <h3 className="font-bold text-slate-800 text-lg">נשלח בהצלחה!</h3>
                  <p className="text-slate-500 text-sm mt-1">הלקוח יקבל קישור לחתימה</p>
                </div>
              ) : (
                <>
                  <div className="rounded-xl p-4 space-y-1" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                    <div className="flex items-center gap-2">
                      <FileText size={14} color="#94a3b8" />
                      <span className="text-sm font-semibold text-slate-700">{docName}</span>
                    </div>
                    <p className="text-xs text-slate-400 pr-5">{fields.length} שדות חתימה · {pdfPages.length} עמודים</p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-600">שלח דרך:</p>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" checked={sendWA} onChange={e => setSendWA(e.target.checked)} />
                      <span className="text-sm text-slate-700">📱 וואטסאפ</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" checked={sendEmail} onChange={e => setSendEmail(e.target.checked)} />
                      <span className="text-sm text-slate-700">📧 מייל</span>
                    </label>
                  </div>

                  {error && <p className="text-xs text-red-600">{error}</p>}

                  <button onClick={handleSend} disabled={sending || (!sendWA && !sendEmail)}
                    className="w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
                    style={{ background: (sendWA || sendEmail) ? '#d97706' : '#e2e8f0', color: (sendWA || sendEmail) ? '#fff' : '#94a3b8' }}>
                    {sending ? <><Loader2 size={16} className="animate-spin" />שולח...</> : <><Send size={16} />שלח לחתימה</>}
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer nav */}
        {!sent && (
          <div className="flex items-center justify-between px-6 py-4" style={{ borderTop: '1px solid #f1f5f9' }}>
            <button onClick={() => step > 1 && setStep(s => (s - 1) as 1|2|3)}
              disabled={step === 1}
              className="text-sm font-medium text-slate-500 disabled:opacity-30">
              → חזור
            </button>
            {step < 3 ? (
              <button
                onClick={() => {
                  if (step === 1 && !pdfBase64) { setError('נא להעלות PDF'); return }
                  if (step === 1 && !docName.trim()) { setError('נא להזין שם מסמך'); return }
                  setError(null)
                  setStep(s => (s + 1) as 2|3)
                }}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-bold transition-colors"
                style={{ background: '#0f172a', color: '#fff' }}>
                המשך ←
              </button>
            ) : null}
          </div>
        )}
        {error && step === 1 && (
          <p className="text-xs text-red-600 px-6 pb-3">{error}</p>
        )}
      </div>
    </div>
  )
}
