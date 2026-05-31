'use client'

import { useState, useRef, useCallback } from 'react'
import { X, Upload, PenLine, Send, CheckCircle2, Loader2, FileText } from 'lucide-react'

type FieldType = 'signature' | 'date' | 'full_name' | 'id_number'

interface SignatureField {
  type: FieldType
  page: number
  x: number; y: number; w: number; h: number
}

interface Props {
  caseId:       string
  clientId:     string
  clientName:   string
  clientPhone?: string
  clientEmail?: string
  onClose:      () => void
  onSent:       () => void
}

const FIELD_LABELS: Record<FieldType, string> = {
  signature: '✍️ חתימה',
  date:      '📅 תאריך',
  full_name: '👤 שם מלא',
  id_number: '🪪 ת"ז',
}
const FIELD_COLOR: Record<FieldType, string> = {
  signature: '#d97706',
  date:      '#0284c7',
  full_name: '#16a34a',
  id_number: '#7c3aed',
}

export default function SendSignatureModal({
  caseId, clientId, clientName,
  clientPhone = '', clientEmail = '',
  onClose, onSent,
}: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1)

  /* ── Step 1 ── */
  const [docName,    setDocName]    = useState('')
  const [pdfFile,    setPdfFile]    = useState<File | null>(null)
  const [pdfPages,   setPdfPages]   = useState<string[]>([])
  const [pdfLoading, setPdfLoading] = useState(false)
  const [pdfError,   setPdfError]   = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  /* ── Step 2: drag-to-draw ── */
  const [fields,     setFields]     = useState<SignatureField[]>([])
  const [addType,    setAddType]    = useState<FieldType>('signature')
  const [isDragging, setIsDragging] = useState(false)
  const [dragPage,   setDragPage]   = useState(0)
  const [dragStart,  setDragStart]  = useState({ x: 0, y: 0 })
  const [dragCurr,   setDragCurr]   = useState({ x: 0, y: 0 })

  /* ── Step 3 ── */
  const [phone,     setPhone]     = useState(clientPhone)
  const [email,     setEmail]     = useState(clientEmail)
  const [sendWA,    setSendWA]    = useState(true)
  const [sendEmail, setSendEmail] = useState(false)
  const [sending,   setSending]   = useState(false)
  const [sent,      setSent]      = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  /* ── PDF load ── */
  const loadPdf = useCallback(async (file: File) => {
    setPdfLoading(true)
    setPdfError(null)
    setPdfFile(file)
    if (!docName) setDocName(file.name.replace(/\.pdf$/i, ''))
    try {
      const pdfjsLib = await import('pdfjs-dist')
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'
      const bytes = new Uint8Array(await file.arrayBuffer())
      const pdf   = await pdfjsLib.getDocument({ data: bytes }).promise
      const images: string[] = []
      for (let i = 1; i <= pdf.numPages; i++) {
        const page     = await pdf.getPage(i)
        const viewport = page.getViewport({ scale: 1.5 })
        const canvas   = document.createElement('canvas')
        canvas.width   = viewport.width
        canvas.height  = viewport.height
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await page.render({ canvasContext: canvas.getContext('2d')!, viewport } as any).promise
        images.push(canvas.toDataURL('image/jpeg', 0.85))
        page.cleanup()
      }
      setPdfPages(images)
    } catch (err) {
      console.error('PDF render error:', err)
      setPdfError('שגיאה בטעינת ה-PDF — ודא שהקובץ תקין ונסה שוב')
    } finally {
      setPdfLoading(false)
    }
  }, [docName])

  /* ── Drag helpers ── */
  const getNorm = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    return {
      x: Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height)),
    }
  }

  const onMouseDown = (e: React.MouseEvent<HTMLDivElement>, pi: number) => {
    e.preventDefault()
    const pos = getNorm(e)
    setIsDragging(true); setDragPage(pi)
    setDragStart(pos); setDragCurr(pos)
  }
  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>, pi: number) => {
    if (!isDragging || dragPage !== pi) return
    setDragCurr(getNorm(e))
  }
  const onMouseUp = (e: React.MouseEvent<HTMLDivElement>, pi: number) => {
    if (!isDragging || dragPage !== pi) { setIsDragging(false); return }
    setIsDragging(false)
    const end = getNorm(e)
    const x = Math.min(dragStart.x, end.x)
    const y = Math.min(dragStart.y, end.y)
    const w = Math.abs(end.x - dragStart.x)
    const h = Math.abs(end.y - dragStart.y)
    if (w > 0.04 && h > 0.015) {
      setFields(prev => [...prev, { type: addType, page: pi, x, y, w, h }])
    }
  }

  /* ── Send ── */
  const handleSend = async () => {
    if (!pdfFile || !docName.trim()) { setError('חסר שם מסמך או PDF'); return }
    if (sendWA && !phone.trim())    { setError('הזן מספר טלפון לשליחה בוואטסאפ'); return }
    if (sendEmail && !email.trim()) { setError('הזן כתובת מייל לשליחה'); return }
    setSending(true); setError(null)
    try {
      const fd = new FormData()
      fd.append('file',            pdfFile)
      fd.append('caseId',          caseId)
      fd.append('clientId',        clientId)
      fd.append('documentName',    docName.trim())
      fd.append('signatureFields', JSON.stringify(fields))
      fd.append('sendWhatsApp',    String(sendWA))
      fd.append('sendEmail',       String(sendEmail))
      fd.append('phone',           phone.trim())
      fd.append('email',           email.trim())
      const res  = await fetch('/api/crm/signatures', { method: 'POST', body: fd })
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

  const prevOk = step === 1 ? !!pdfFile : true

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}>
      <div
        className="w-full max-w-2xl rounded-2xl overflow-hidden flex flex-col"
        style={{ background: '#fff', maxHeight: '90vh' }}
        onClick={e => e.stopPropagation()}
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0" style={{ borderBottom: '1px solid #f1f5f9' }}>
          <div className="flex items-center gap-3">
            <PenLine size={18} color="#d97706" />
            <div>
              <h2 className="font-bold text-slate-900 text-sm">שלח לחתימה דיגיטלית</h2>
              <p className="text-xs text-slate-400">{clientName}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {([1, 2, 3] as const).map(s => (
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
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) loadPdf(f) }}
                className="rounded-xl cursor-pointer flex flex-col items-center justify-center gap-3"
                style={{ border: '2px dashed #e2e8f0', padding: '32px 24px', background: '#fafbfc', minHeight: 160 }}
              >
                <input ref={fileRef} type="file" accept=".pdf" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) loadPdf(f) }} />
                {pdfLoading ? (
                  <><Loader2 size={24} color="#d97706" className="animate-spin" /><p className="text-sm text-slate-500">טוען PDF...</p></>
                ) : pdfError ? (
                  <><X size={24} color="#dc2626" />
                    <p className="text-sm font-semibold text-red-600">{pdfError}</p>
                    <p className="text-xs text-slate-400">לחץ לבחירת קובץ אחר</p></>
                ) : pdfFile ? (
                  <><CheckCircle2 size={24} color="#16a34a" />
                    <p className="text-sm font-semibold text-slate-700">{docName}</p>
                    <p className="text-xs text-slate-400">
                      {pdfPages.length > 0 ? `${pdfPages.length} עמודים` : 'קובץ נטען'} · לחץ להחלפה
                    </p></>
                ) : (
                  <><Upload size={24} color="#94a3b8" />
                    <p className="text-sm font-semibold text-slate-600">גרור PDF לכאן או לחץ לבחירה</p></>
                )}
              </div>
            </div>
          )}

          {/* ── Step 2: Drag-to-draw fields ── */}
          {step === 2 && (
            <div className="space-y-3">
              {/* Toolbar */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <p className="text-xs text-slate-500">גרור על המסמך כדי לסמן שדה</p>
                <div className="flex gap-1.5 flex-wrap">
                  {(Object.keys(FIELD_LABELS) as FieldType[]).map(t => (
                    <button key={t} onClick={() => setAddType(t)}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all"
                      style={{
                        background: addType === t ? FIELD_COLOR[t] : '#f1f5f9',
                        color:      addType === t ? '#fff'           : '#475569',
                        outline: addType === t ? `2px solid ${FIELD_COLOR[t]}` : 'none',
                        outlineOffset: 2,
                      }}>
                      {FIELD_LABELS[t]}
                    </button>
                  ))}
                </div>
              </div>

              {/* All pages stacked */}
              <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #e2e8f0', maxHeight: '52vh', overflowY: 'auto' }}>
                {pdfPages.length === 0 ? (
                  <div className="flex items-center justify-center py-16">
                    <p className="text-sm text-slate-400">אין תצוגה מקדימה — ניתן לדלג ולשלוח ישר</p>
                  </div>
                ) : (
                  pdfPages.map((src, pi) => (
                    <div key={pi} style={{ position: 'relative', userSelect: 'none', cursor: 'crosshair' }}
                      onMouseDown={e => onMouseDown(e, pi)}
                      onMouseMove={e => onMouseMove(e, pi)}
                      onMouseUp={e => onMouseUp(e, pi)}
                      onMouseLeave={() => setIsDragging(false)}
                    >
                      {/* Page label */}
                      <div style={{ position: 'absolute', top: 6, left: 6, background: 'rgba(0,0,0,0.45)', color: '#fff', fontSize: 10, padding: '2px 7px', borderRadius: 4, zIndex: 2 }}>
                        עמוד {pi + 1}
                      </div>

                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={src} alt={`עמוד ${pi + 1}`}
                        style={{ width: '100%', display: 'block', borderBottom: pi < pdfPages.length - 1 ? '2px solid #e2e8f0' : 'none' }}
                        draggable={false} />

                      {/* Placed fields */}
                      {fields.filter(f => f.page === pi).map((field) => {
                        const gi = fields.indexOf(field)
                        return (
                          <div key={gi}
                            style={{
                              position: 'absolute',
                              left:   `${field.x * 100}%`, top:    `${field.y * 100}%`,
                              width:  `${field.w * 100}%`, height: `${field.h * 100}%`,
                              background: `${FIELD_COLOR[field.type]}1a`,
                              border: `1.5px solid ${FIELD_COLOR[field.type]}`,
                              borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center',
                              cursor: 'default', zIndex: 3,
                            }}
                          >
                            <span style={{ fontSize: 10, color: FIELD_COLOR[field.type], fontWeight: 700, whiteSpace: 'nowrap' }}>
                              {FIELD_LABELS[field.type]}
                            </span>
                            <button
                              onMouseDown={e => e.stopPropagation()}
                              onClick={e => { e.stopPropagation(); setFields(prev => prev.filter((_, i) => i !== gi)) }}
                              style={{ position: 'absolute', top: -7, left: -7, background: '#fff', borderRadius: '50%', border: '1px solid #e2e8f0', width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 4 }}>
                              <X size={9} color="#dc2626" />
                            </button>
                          </div>
                        )
                      })}

                      {/* Drag preview */}
                      {isDragging && dragPage === pi && (
                        <div style={{
                          position: 'absolute', pointerEvents: 'none', zIndex: 5,
                          left:   `${Math.min(dragStart.x, dragCurr.x) * 100}%`,
                          top:    `${Math.min(dragStart.y, dragCurr.y) * 100}%`,
                          width:  `${Math.abs(dragCurr.x - dragStart.x) * 100}%`,
                          height: `${Math.abs(dragCurr.y - dragStart.y) * 100}%`,
                          background: `${FIELD_COLOR[addType]}22`,
                          border: `2px dashed ${FIELD_COLOR[addType]}`,
                          borderRadius: 3,
                        }} />
                      )}
                    </div>
                  ))
                )}
              </div>

              {fields.length === 0 && (
                <p className="text-xs text-center" style={{ color: '#d97706' }}>
                  ⚠️ לא סומנו שדות — הלקוח יוכל לחתום בכל מקום
                </p>
              )}
              {fields.length > 0 && (
                <p className="text-xs text-center text-slate-400">{fields.length} שדות סומנו</p>
              )}
            </div>
          )}

          {/* ── Step 3: Contact + Send ── */}
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
                  {/* Doc summary */}
                  <div className="rounded-xl p-4 space-y-1" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                    <div className="flex items-center gap-2">
                      <FileText size={14} color="#94a3b8" />
                      <span className="text-sm font-semibold text-slate-700">{docName}</span>
                    </div>
                    <p className="text-xs text-slate-400 pr-5">{fields.length} שדות · {pdfPages.length || '?'} עמודים</p>
                  </div>

                  {/* Contact details */}
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-slate-600">פרטי התקשרות עם הלקוח:</p>
                    <div>
                      <label className="text-xs text-slate-500 block mb-1.5">📱 מספר טלפון (וואטסאפ)</label>
                      <input
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        placeholder="05X-XXXXXXX"
                        className="w-full px-3 py-2.5 rounded-lg text-sm"
                        style={{ border: '1.5px solid #e2e8f0', fontFamily: 'inherit', outline: 'none', direction: 'ltr', textAlign: 'right' }}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 block mb-1.5">📧 כתובת מייל</label>
                      <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="example@email.com"
                        className="w-full px-3 py-2.5 rounded-lg text-sm"
                        style={{ border: '1.5px solid #e2e8f0', fontFamily: 'inherit', outline: 'none', direction: 'ltr', textAlign: 'right' }}
                      />
                    </div>
                  </div>

                  {/* Send via */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-600">שלח דרך:</p>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" checked={sendWA} onChange={e => setSendWA(e.target.checked)} />
                      <span className="text-sm text-slate-700">
                        📱 וואטסאפ
                        {sendWA && !phone.trim() && <span className="text-red-500 text-xs mr-1">(נדרש מספר טלפון)</span>}
                      </span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" checked={sendEmail} onChange={e => setSendEmail(e.target.checked)} />
                      <span className="text-sm text-slate-700">
                        📧 מייל
                        {sendEmail && !email.trim() && <span className="text-red-500 text-xs mr-1">(נדרשת כתובת מייל)</span>}
                      </span>
                    </label>
                    {!sendWA && !sendEmail && (
                      <p className="text-xs text-slate-400">ניתן לשלוח ידנית — הקישור יישמר במערכת</p>
                    )}
                  </div>

                  {error && <p className="text-xs text-red-600">{error}</p>}

                  <button onClick={handleSend} disabled={sending}
                    className="w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
                    style={{ background: '#d97706', color: '#fff' }}>
                    {sending
                      ? <><Loader2 size={16} className="animate-spin" />שולח...</>
                      : <><Send size={16} />שלח לחתימה</>}
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer nav */}
        {!sent && (
          <div className="flex items-center justify-between px-6 py-4 flex-shrink-0" style={{ borderTop: '1px solid #f1f5f9' }}>
            <button
              onClick={() => step > 1 && setStep(s => (s - 1) as 1 | 2 | 3)}
              disabled={step === 1}
              className="text-sm font-medium text-slate-500 disabled:opacity-30">
              → חזור
            </button>
            {step < 3 ? (
              <button
                onClick={() => {
                  if (step === 1 && !pdfFile) { setError('נא להעלות PDF'); return }
                  if (step === 1 && !docName.trim()) { setError('נא להזין שם מסמך'); return }
                  setError(null)
                  setStep(s => (s + 1) as 2 | 3)
                }}
                disabled={!prevOk}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-bold disabled:opacity-40"
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
