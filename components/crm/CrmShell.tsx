'use client'
import { useState } from 'react'
import { Menu, Scale, Bell } from 'lucide-react'
import CrmSidebar from './CrmSidebar'

type Props = {
  userEmail: string
  children: React.ReactNode
  badges?: Record<string, number>
}

export default function CrmShell({ userEmail, children, badges = {} }: Props) {
  const [open, setOpen] = useState(false)

  const initial = userEmail.charAt(0).toUpperCase()
  const today = new Date().toLocaleDateString('he-IL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  return (
    <div
      dir="rtl"
      className="min-h-screen flex"
      style={{ fontFamily: "'Assistant', 'Heebo', sans-serif", background: '#f1f5f9' }}
    >
      {/* ── Desktop sidebar (icon-only, sticky) ── */}
      <div className="hidden lg:block shrink-0 print:hidden" style={{ position: 'sticky', top: 0, height: '100vh', alignSelf: 'flex-start', overflow: 'visible', zIndex: 30 }}>
        <CrmSidebar userEmail={userEmail} badges={badges} />
      </div>

      {/* ── Mobile backdrop ── */}
      {open && (
        <div
          className="fixed inset-0 z-30 lg:hidden"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)' }}
          onClick={() => setOpen(false)}
        />
      )}

      {/* ── Mobile drawer ── */}
      <div
        className={`fixed top-0 right-0 h-full z-40 transition-transform duration-300 lg:hidden print:hidden ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <CrmSidebar userEmail={userEmail} onClose={() => setOpen(false)} badges={badges} />
      </div>

      {/* ── Main area ── */}
      <main className="flex-1 flex flex-col min-w-0">

        {/* Sticky header */}
        <header
          className="sticky top-0 z-20 shrink-0 print:hidden"
          style={{
            height: 56,
            background: 'rgba(255,255,255,0.88)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            borderBottom: '1px solid rgba(226,232,240,0.7)',
            display: 'flex',
            alignItems: 'center',
            padding: '0 20px',
            gap: 10,
          }}
        >
          {/* Mobile: menu button */}
          <button
            className="lg:hidden p-1.5 rounded-lg"
            style={{ color: '#64748b' }}
            onClick={() => setOpen(true)}
          >
            <Menu size={20} />
          </button>

          {/* Mobile: logo */}
          <div className="lg:hidden flex items-center gap-2">
            <div
              className="rounded-xl flex items-center justify-center"
              style={{
                width: 28, height: 28,
                background: 'linear-gradient(135deg, #d97706, #f59e0b)',
                boxShadow: '0 2px 8px rgba(217,119,6,0.3)',
              }}
            >
              <Scale size={13} color="white" />
            </div>
            <span className="font-bold text-sm" style={{ color: '#0f172a' }}>משרד טבת</span>
          </div>

          <div className="flex-1" />

          {/* Date — desktop only */}
          <p className="hidden lg:block text-sm font-medium" style={{ color: '#94a3b8' }}>
            {today}
          </p>

          {/* Notification bell */}
          <button
            className="p-2 rounded-lg transition-colors"
            style={{ color: '#94a3b8' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#f1f5f9'; (e.currentTarget as HTMLButtonElement).style.color = '#475569' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = '#94a3b8' }}
          >
            <Bell size={17} />
          </button>

          {/* Divider */}
          <div style={{ width: 1, height: 24, background: '#e2e8f0' }} />

          {/* User avatar */}
          <div
            className="flex items-center gap-2 px-2 py-1 rounded-lg cursor-default select-none"
            style={{ fontSize: 13 }}
          >
            <div
              className="flex items-center justify-center rounded-full font-bold text-sm shrink-0"
              style={{
                width: 32, height: 32,
                background: 'linear-gradient(135deg, rgba(217,119,6,0.2), rgba(245,158,11,0.15))',
                color: '#d97706',
                border: '1.5px solid rgba(217,119,6,0.25)',
              }}
            >
              {initial}
            </div>
          </div>
        </header>

        {/* Page scroll area */}
        <div className="flex-1 p-4 lg:p-8 overflow-y-auto">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}
