'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { use } from 'react'
import { getStroke } from 'perfect-freehand'
import { CheckCircle2, Loader2, AlertCircle, PenLine, X, RotateCcw } from 'lucide-react'

/* ── types ── */
type FieldType = 'signature' | 'date' | 'initials' | 'full_name' | 'id_number'
interface SignatureField {
  type: FieldType
  page: number
  x: number; y: number; w: number; h: number
}
const FIELD_COLOR: Record<FieldType, string> = {
  signature: '#d97706',
  date:      '#0284c7',
  initials:  '#d97706',
  full_name: '#16a34a',
  id_number: '#7c3aed',
}
const FIELD_LABEL: Record<FieldType, string> = {
  signature: '✍️ חתום כאן',
  date:      '📅 תאריך',
  initials:  'ר"ת',
  full_name: '👤 שם מלא',
  id_number: '🪪 ת"ז',
}
interface DocData {
  documentName:    string
  clientName:      string
  signatureFields: SignatureField[]
  pdfBase64:       string
}

/* ── perfect-freehand → SVG path ── */
function getSvgPathFromStroke(stroke: number[][]): string {
  if (!stroke.length) return ''
  const d = stroke.reduce((acc, [x0, y0], i, arr) => {
    const [x1, y1] = arr[(i + 1) % arr.length]
    acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2)
    return acc
  }, ['M', ...stroke[0], 'Q'] as (string | number)[])
  d.push('Z')
  return d.join(' ')
}

/* ── SignatureCanvas ── */
function SignatureCanvas({ onDone, onClear }: { onDone: (png: string) => void; onClear: () => void }) {
  const canvasRef    = useRef<HTMLCanvasElement>(null)
  const [points, setPoints]   = useState<number[][]>([])
  const [strokes, setStrokes] = useState<number[][][]>([])
  const [isDrawing, setIsDrawing] = useState(false)
  const [isEmpty, setIsEmpty]     = useState(true)

  const getPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect()
    return [e.clientX - rect.left, e.clientY - rect.top, e.pressure || 0.5]
  }

  const redraw = useCallback((allStrokes: number[][][], currentPoints: number[][]) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const drawStroke = (pts: number[][]) => {
      const stroke = getStroke(pts, {
        size: 3.5, thinning: 0.6, smoothing: 0.5, streamline: 0.5,
        start: { taper: 10, easing: t => t * t },
        end:   { taper: 10, easing: t => 1 - (1 - t) * (1 - t) },
      })
      const path = new Path2D(getSvgPathFromStroke(stroke))
      ctx.fillStyle = '#1a1a3e'
      ctx.fill(path)
    }

    allStrokes.forEach(drawStroke)
    if (currentPoints.length > 1) drawStroke(currentPoints)
  }, [])

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    canvasRef.current?.setPointerCapture(e.pointerId)
    setIsDrawing(true)
    setIsEmpty(false)
    setPoints([getPos(e)])
  }

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return
    const next = [...points, getPos(e)]
    setPoints(next)
    redraw(strokes, next)
  }

  const onPointerUp = () => {
    if (!isDrawing) return
    setIsDrawing(false)
    const completed = [...strokes, points]
    setStrokes(completed)
    setPoints([])
    redraw(completed, [])

    // ייצור PNG
    const canvas = canvasRef.current!
    onDone(canvas.toDataURL('image/png'))
  }

  const clear = () => {
    const canvas = canvasRef.current!
    canvas.getContext('2d')!.clearRect(0, 0, canvas.width, canvas.height)
    setStrokes([])
    setPoints([])
    setIsEmpty(true)
    onClear()
  }

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={340} height={130}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        style={{
          border: '1.5px solid #e2e8f0', borderRadius: 10,
          background: '#fafbfc', cursor: 'crosshair',
          touchAction: 'none', display: 'block', width: '100%',
        }}
      />
      {isEmpty && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p style={{ color: '#cbd5e1', fontSize: 14 }}>צייר את חתימתך כאן</p>
        </div>
      )}
      {!isEmpty && (
        <button onClick={clear}
          className="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 rounded text-xs"
          style={{ background: '#f1f5f9', color: '#64748b' }}>
          <RotateCcw size={11} /> נקה
        </button>
      )}
    </div>
  )
}

/* ── Main Page ── */
export default function SignPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)

  const [doc,        setDoc]        = useState<DocData | null>(null)
  const [loadErr,    setLoadErr]    = useState<string | null>(null)
  const [loading,    setLoading]    = useState(true)

  const [modalOpen,  setModalOpen]  = useState(false)
  const [activeField, setActiveField] = useState<number | null>(null)

  const [signerName, setSignerName] = useState('')
  const [idNumber,   setIdNumber]   = useState('')
  const [sigPng,     setSigPng]     = useState<string | null>(null)
  const [agreed,     setAgreed]     = useState(false)

  const needsId = doc?.signatureFields.some(f => f.type === 'id_number') ?? false

  const [submitting, setSubmitting] = useState(false)
  const [done,       setDone]       = useState(false)
  const [submitErr,  setSubmitErr]  = useState<string | null>(null)

  const [pdfPages,   setPdfPages]   = useState<string[]>([])  // canvas data-URLs per page
  const [pdfLoading, setPdfLoading] = useState(false)

  // Load doc
  useEffect(() => {
    fetch(`/api/sign/${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setLoadErr(d.error); return }
        setDoc(d)
        renderPdf(d.pdfBase64)
      })
      .catch(() => setLoadErr('שגיאת רשת'))
      .finally(() => setLoading(false))
  }, [token])

  async function renderPdf(base64: string) {
    setPdfLoading(true)
    try {
      const pdfjsLib = await import('pdfjs-dist')
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'
      const bytes  = Uint8Array.from(atob(base64), c => c.charCodeAt(0))
      const pdf    = await pdfjsLib.getDocument({ data: bytes }).promise
      const images: string[] = []
      for (let i = 1; i <= pdf.numPages; i++) {
        const page     = await pdf.getPage(i)
        const viewport = page.getViewport({ scale: 1.8 })
        const canvas   = document.createElement('canvas')
        canvas.width   = viewport.width
        canvas.height  = viewport.height
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await page.render({ canvasContext: canvas.getContext('2d')!, viewport, canvas } as any).promise
        images.push(canvas.toDataURL('image/jpeg', 0.9))
      }
      setPdfPages(images)
    } catch (e) {
      console.error('PDF render error:', e)
    } finally {
      setPdfLoading(false)
    }
  }

  async function handleSubmit() {
    if (!signerName.trim()) { setSubmitErr('נא להזין שם מלא'); return }
    if (!sigPng)             { setSubmitErr('נא לצייר חתימה'); return }
    if (!agreed)             { setSubmitErr('נא לאשר שקראת את המסמך'); return }

    setSubmitting(true)
    setSubmitErr(null)
    try {
      const res = await fetch(`/api/sign/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signerName, signatureImageBase64: sigPng, idNumber: idNumber.trim() }),
      })
      let data: { error?: string; success?: boolean } = {}
      try { data = await res.json() } catch { data = { error: `שגיאת שרת ${res.status}` } }
      if (!res.ok || data.error) { setSubmitErr(data.error ?? `שגיאה ${res.status}`); return }
      setDone(true)
    } catch (e) {
      setSubmitErr(`שגיאת רשת, ${e instanceof Error ? e.message : 'נסה שוב'}`)
    } finally {
      setSubmitting(false)
    }
  }

  const signedFields = new Set<number>() // track which fields signed (simplified: all on one sig)
  const allFieldsSigned = doc ? signedFields.size === 0 || !!sigPng : false
  void allFieldsSigned

  /* ── Render ── */
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" dir="rtl">
      <Loader2 size={32} color="#d97706" className="animate-spin" />
    </div>
  )

  if (loadErr) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50" dir="rtl">
      <div className="text-center p-8">
        <AlertCircle size={48} color="#dc2626" className="mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-800 mb-2">{loadErr}</h2>
        <p className="text-slate-500 text-sm">לשאלות פנה למשרד עו"ד אוהד טבת</p>
      </div>
    </div>
  )

  if (done) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50" dir="rtl">
      <div className="text-center p-8 max-w-sm">
        <CheckCircle2 size={64} color="#16a34a" className="mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-slate-800 mb-2">המסמך נחתם בהצלחה!</h2>
        <p className="text-slate-500">משרד עו"ד אוהד טבת קיבל את חתימתך.</p>
      </div>
    </div>
  )

  if (!doc) return null

  return (
    <div dir="rtl" style={{ fontFamily: "'Assistant',sans-serif", background: '#f8fafc', minHeight: '100vh' }}>

      {/* Header */}
      <div style={{ background: '#0f172a', padding: '16px 20px', position: 'sticky', top: 0, zIndex: 50 }}>
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <p className="font-bold text-white text-sm">משרד עו"ד אוהד טבת</p>
            <p style={{ color: '#94a3b8', fontSize: 12 }}>{doc.documentName}</p>
          </div>
          <span style={{ background: 'rgba(22,163,74,0.15)', color: '#4ade80', fontSize: 11, padding: '3px 10px', borderRadius: 20 }}>
            🔒 מאובטח
          </span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">

        {/* PDF Pages */}
        {pdfLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 size={28} color="#d97706" className="animate-spin" />
          </div>
        ) : pdfPages.length > 0 ? (
          <div className="space-y-3">
            {pdfPages.map((src, pi) => {
              const pageFields = doc.signatureFields.filter(f => f.page === pi)
              return (
                <div key={pi} style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt={`עמוד ${pi + 1}`} style={{ width: '100%', display: 'block' }} />
                  {pageFields.map((field, fi) => {
                    const key   = doc.signatureFields.indexOf(field)
                    const color = FIELD_COLOR[field.type] ?? '#d97706'
                    const isSig = field.type === 'signature' || field.type === 'initials'
                    const today = new Date().toLocaleDateString('he-IL')
                    return (
                      <div
                        key={fi}
                        onClick={() => isSig && (setActiveField(key), setModalOpen(true))}
                        style={{
                          position: 'absolute',
                          left:   `${field.x * 100}%`,
                          top:    `${field.y * 100}%`,
                          width:  `${field.w * 100}%`,
                          height: `${field.h * 100}%`,
                          background: isSig && sigPng ? 'transparent' : `${color}18`,
                          border: `1.5px solid ${isSig && sigPng ? 'transparent' : color}`,
                          borderRadius: 4, cursor: isSig ? 'pointer' : 'default',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        {isSig && sigPng
                          ? <img src={sigPng} alt="חתימה" style={{ width: '90%', height: '90%', objectFit: 'contain' }} />
                          : field.type === 'date'
                            ? <span style={{ fontSize: 11, color, fontWeight: 600 }}>{today}</span>
                            : field.type === 'full_name' && signerName
                              ? <span style={{ fontSize: 11, color, fontWeight: 600 }}>{signerName}</span>
                              : field.type === 'id_number' && idNumber
                                ? <span style={{ fontSize: 11, color, fontWeight: 600 }}>{idNumber}</span>
                                : <span style={{ fontSize: 11, color, fontWeight: 600 }}>{FIELD_LABEL[field.type]}</span>
                        }
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="rounded-xl p-8 text-center" style={{ background: '#fff', border: '1px solid #e2e8f0' }}>
            <p style={{ color: '#64748b' }}>טוען מסמך...</p>
          </div>
        )}

        {/* Sign Button Area */}
        <div className="rounded-xl p-5 space-y-4" style={{ background: '#fff', border: '1px solid #e2e8f0' }}>
          <button
            onClick={() => { setActiveField(0); setModalOpen(true) }}
            className="w-full py-3.5 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all"
            style={{ background: '#d97706', color: '#fff' }}
          >
            <PenLine size={18} />
            {sigPng ? 'עדכן חתימה' : 'חתום על המסמך'}
          </button>

          {sigPng && (
            <>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={e => setAgreed(e.target.checked)}
                  className="mt-0.5"
                />
                <span style={{ fontSize: 13, color: '#475569', lineHeight: 1.5 }}>
                  אני מאשר/ת שקראתי את המסמך וחתמתי מרצוני החופשי
                </span>
              </label>

              {submitErr && (
                <p style={{ color: '#dc2626', fontSize: 13 }}>{submitErr}</p>
              )}

              <button
                onClick={handleSubmit}
                disabled={submitting || !agreed}
                className="w-full py-4 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all"
                style={{
                  background: agreed ? '#16a34a' : '#e2e8f0',
                  color:      agreed ? '#fff'    : '#94a3b8',
                }}
              >
                {submitting
                  ? <><Loader2 size={18} className="animate-spin" /> שולח...</>
                  : <><CheckCircle2 size={18} /> חתום ואשר</>
                }
              </button>
            </>
          )}
        </div>

      </div>

      {/* Signature Modal, iOS-safe: ללא backdropFilter, גלילה מובנית */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50"
          style={{ background: 'rgba(15,23,42,0.6)' }}
          onClick={() => setModalOpen(false)}
        >
          {/* Bottom sheet, position:fixed עם overflow:auto כדי שהמקלדת לא תגרום לרעידה */}
          <div
            className="absolute bottom-0 left-0 right-0 w-full"
            style={{
              background: '#fff',
              borderRadius: '20px 20px 0 0',
              maxHeight: '90vh',
              overflowY: 'auto',
              WebkitOverflowScrolling: 'touch' as never,
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Handle bar */}
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, paddingBottom: 4 }}>
              <div style={{ width: 40, height: 4, borderRadius: 2, background: '#e2e8f0' }} />
            </div>

            <div style={{ padding: '12px 20px 32px' }} className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-800 text-base">חתימה דיגיטלית</h3>
                <button onClick={() => setModalOpen(false)} style={{ padding: 4 }}>
                  <X size={20} color="#94a3b8" />
                </button>
              </div>

              {/* שם מלא, autoComplete=off מונע מ-iOS לחסום קלט */}
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1.5 block">שם מלא (חובה)</label>
                <input
                  type="text"
                  value={signerName}
                  onChange={e => setSignerName(e.target.value)}
                  placeholder="ישראל ישראלי"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="words"
                  className="w-full px-3 rounded-lg text-sm"
                  style={{
                    border: '1.5px solid #e2e8f0',
                    fontFamily: 'inherit',
                    outline: 'none',
                    height: 44,
                    fontSize: 16, // מונע zoom אוטומטי ב-iOS
                  }}
                />
              </div>

              {needsId && (
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1.5 block">מספר תעודת זהות</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={idNumber}
                    onChange={e => setIdNumber(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000000"
                    maxLength={9}
                    autoComplete="off"
                    className="w-full px-3 rounded-lg text-sm"
                    style={{
                      border: '1.5px solid #e2e8f0',
                      fontFamily: 'inherit',
                      outline: 'none',
                      direction: 'ltr',
                      textAlign: 'right',
                      height: 44,
                      fontSize: 16,
                    }}
                  />
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1.5 block">חתימה</label>
                <SignatureCanvas
                  onDone={png => setSigPng(png)}
                  onClear={() => setSigPng(null)}
                />
              </div>

              <button
                onClick={() => {
                  if (!signerName.trim()) { alert('נא להזין שם מלא'); return }
                  if (!sigPng) { alert('נא לצייר חתימה'); return }
                  setModalOpen(false)
                  void activeField
                }}
                className="w-full rounded-xl font-bold text-sm"
                style={{ background: '#d97706', color: '#fff', height: 52, fontSize: 16 }}
              >
                אשר חתימה ✓
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
