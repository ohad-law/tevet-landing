'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X } from 'lucide-react'

type Case = { id: string; case_name: string; case_number: string | null }
type Client = { id: string; full_name: string }

type Props = {
  cases: Case[]
  clients: Client[]
}

export default function FinanceAdder({ cases, clients }: Props) {
  const [show, setShow] = useState(false)
  const [type, setType] = useState<'income' | 'expense'>('income')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState('ממתין')
  const [caseId, setCaseId] = useState('')
  const [clientId, setClientId] = useState('')
  const [category, setCategory] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function submit() {
    if (!amount || !date) return
    setSubmitting(true)
    setError('')

    const endpoint = type === 'income' ? '/api/crm/income' : '/api/crm/expenses'
    const body = type === 'income'
      ? { amount: Number(amount), date, description, status, case_id: caseId || null, client_id: clientId || null }
      : { amount: Number(amount), date, description, category }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (res.ok) {
      setAmount('')
      setDescription('')
      setStatus('ממתין')
      setCaseId('')
      setClientId('')
      setCategory('')
      setShow(false)
      router.refresh()
    } else {
      const data = await res.json()
      setError(data.error || 'שגיאה בשמירה')
    }
    setSubmitting(false)
  }

  return (
    <div>
      <button
        onClick={() => setShow(!show)}
        className="flex items-center gap-2 bg-blue-600 text-white text-sm px-4 py-2 rounded-xl font-medium hover:bg-blue-700 transition"
      >
        <Plus size={15} />
        הוסף רשומה
      </button>

      {show && (
        <div className="mt-4 bg-blue-50/40 border border-blue-100 rounded-2xl p-5 space-y-4">
          {/* Type tabs */}
          <div className="flex gap-1 bg-white border border-slate-200 rounded-lg p-1 w-fit">
            <button
              onClick={() => setType('income')}
              className={`text-sm px-4 py-1.5 rounded-md font-medium transition ${type === 'income' ? 'bg-emerald-500 text-white' : 'text-slate-500 hover:text-slate-700'}`}
            >
              הכנסה
            </button>
            <button
              onClick={() => setType('expense')}
              className={`text-sm px-4 py-1.5 rounded-md font-medium transition ${type === 'expense' ? 'bg-red-500 text-white' : 'text-slate-500 hover:text-slate-700'}`}
            >
              הוצאה
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500 font-medium block mb-1">סכום (₪)*</label>
              <input
                type="number"
                placeholder="1000"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-400 transition bg-white"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 font-medium block mb-1">תאריך*</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-400 transition bg-white"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-500 font-medium block mb-1">תיאור</label>
            <input
              type="text"
              placeholder={type === 'income' ? 'שכ"ט, פיצויים...' : 'שכירות, ציוד משרדי...'}
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-400 transition bg-white text-right"
            />
          </div>

          {type === 'income' && (
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-slate-500 font-medium block mb-1">סטטוס</label>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value)}
                  className="w-full px-2.5 py-2 text-sm border border-slate-200 rounded-lg bg-white outline-none focus:border-blue-400"
                >
                  <option value="ממתין">ממתין</option>
                  <option value="שולם">שולם</option>
                  <option value="בוטל">בוטל</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500 font-medium block mb-1">תיק</label>
                <select
                  value={caseId}
                  onChange={e => setCaseId(e.target.value)}
                  className="w-full px-2.5 py-2 text-sm border border-slate-200 rounded-lg bg-white outline-none focus:border-blue-400"
                >
                  <option value="">ללא תיק</option>
                  {cases.map(c => (
                    <option key={c.id} value={c.id}>{c.case_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500 font-medium block mb-1">לקוח</label>
                <select
                  value={clientId}
                  onChange={e => setClientId(e.target.value)}
                  className="w-full px-2.5 py-2 text-sm border border-slate-200 rounded-lg bg-white outline-none focus:border-blue-400"
                >
                  <option value="">ללא לקוח</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.full_name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {type === 'expense' && (
            <div>
              <label className="text-xs text-slate-500 font-medium block mb-1">קטגוריה</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full px-2.5 py-2 text-sm border border-slate-200 rounded-lg bg-white outline-none focus:border-blue-400"
              >
                <option value="">כללי</option>
                <option value="שכירות">שכירות</option>
                <option value="תקשורת">תקשורת</option>
                <option value="ציוד">ציוד</option>
                <option value="שיווק">שיווק</option>
                <option value="שכר">שכר</option>
                <option value="אחר">אחר</option>
              </select>
            </div>
          )}

          {error && <p className="text-xs text-red-600">{error}</p>}

          <div className="flex gap-2 justify-end">
            <button
              onClick={submit}
              disabled={submitting || !amount || !date}
              className="bg-blue-600 text-white text-sm px-4 py-2 rounded-xl font-medium hover:bg-blue-700 transition disabled:opacity-50"
            >
              {submitting ? '...' : 'שמור'}
            </button>
            <button
              onClick={() => setShow(false)}
              className="text-slate-400 hover:text-slate-600 p-2 rounded-lg hover:bg-slate-100 transition"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
