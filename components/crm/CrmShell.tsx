'use client'
import { useState } from 'react'
import { Menu, Scale } from 'lucide-react'
import CrmSidebar from './CrmSidebar'

type Props = {
  userEmail: string
  children: React.ReactNode
  badges?: Record<string, number>
}

export default function CrmShell({ userEmail, children, badges = {} }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <div className="min-h-screen bg-[#f8fafc] flex" dir="rtl">

      {/* Mobile overlay backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar — always visible on desktop, drawer on mobile, hidden on print */}
      <div className={`
        fixed right-0 top-0 h-full z-30 transition-transform duration-300 print:hidden
        lg:static lg:translate-x-0 lg:h-auto lg:z-auto
        ${open ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
      `}>
        <CrmSidebar userEmail={userEmail} onClose={() => setOpen(false)} badges={badges} />
      </div>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        <div className="lg:hidden print:hidden flex items-center justify-between px-4 h-14 bg-[#0f172a] border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
              <Scale size={14} className="text-white" />
            </div>
            <span className="text-white font-bold text-sm">משרד טבת</span>
          </div>
          <button
            onClick={() => setOpen(true)}
            className="text-slate-400 hover:text-white transition p-1"
          >
            <Menu size={20} />
          </button>
        </div>

        <div className="flex-1 p-4 lg:p-7 overflow-auto">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}
