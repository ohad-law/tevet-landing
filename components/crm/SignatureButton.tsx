'use client'

import { useState } from 'react'
import { PenLine } from 'lucide-react'
import dynamic from 'next/dynamic'

const SendSignatureModal = dynamic(() => import('./SendSignatureModal'), { ssr: false })

interface Props {
  caseId:     string
  clientId:   string
  clientName: string
}

export default function SignatureButton({ caseId, clientId, clientName }: Props) {
  const [open, setOpen] = useState(false)

  if (!clientId) return null

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs border px-3 py-1.5 rounded-lg font-medium transition-colors"
        style={{ borderColor: '#d97706', color: '#d97706', background: 'rgba(217,119,6,0.06)' }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(217,119,6,0.12)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(217,119,6,0.06)' }}
      >
        <PenLine size={13} />
        שלח לחתימה
      </button>

      {open && (
        <SendSignatureModal
          caseId={caseId}
          clientId={clientId}
          clientName={clientName}
          onClose={() => setOpen(false)}
          onSent={() => setOpen(false)}
        />
      )}
    </>
  )
}
