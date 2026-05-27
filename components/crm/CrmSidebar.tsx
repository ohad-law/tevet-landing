'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const navItems = [
  { href: '/crm/dashboard', label: 'לוח בקרה', icon: '📊' },
  { href: '/crm/cases', label: 'תיקים', icon: '⚖️' },
  { href: '/crm/clients', label: 'לקוחות', icon: '👥' },
  { href: '/crm/tasks', label: 'משימות', icon: '✅' },
  { href: '/crm/hearings', label: 'דיונים', icon: '📅' },
  { href: '/crm/leads', label: 'לידים', icon: '🎯' },
  { href: '/crm/finances', label: 'פיננסים', icon: '💰' },
]

export default function CrmSidebar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="w-64 bg-slate-900 min-h-screen flex flex-col border-l border-slate-800 shrink-0">
      {/* Logo */}
      <div className="h-16 flex items-center gap-3 px-5 border-b border-slate-800">
        <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-lg shadow-lg shadow-blue-900/30">
          ⚖️
        </div>
        <div>
          <p className="text-white font-bold text-sm leading-none">משרד טבת</p>
          <p className="text-slate-400 text-xs mt-0.5">מערכת ניהול</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1">
        {navItems.map(item => {
          const isActive = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-slate-800">
        <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-800/50">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0">
            {userEmail.charAt(0).toUpperCase()}
          </div>
          <p className="text-slate-300 text-xs truncate flex-1">{userEmail}</p>
          <button
            onClick={handleLogout}
            className="text-slate-500 hover:text-red-400 transition text-xs shrink-0"
            title="התנתק"
          >
            ↩
          </button>
        </div>
      </div>
    </aside>
  )
}
