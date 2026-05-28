'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutDashboard,
  FolderOpen,
  Users,
  CheckSquare,
  CalendarDays,
  UserPlus,
  Wallet,
  LogOut,
  Scale,
  Search,
  ClockIcon,
  X,
} from 'lucide-react'

const navItems = [
  { href: '/crm/dashboard', label: 'לוח בקרה', icon: LayoutDashboard },
  { href: '/crm/cases', label: 'תיקים', icon: FolderOpen },
  { href: '/crm/clients', label: 'לקוחות', icon: Users },
  { href: '/crm/tasks', label: 'משימות', icon: CheckSquare },
  { href: '/crm/hearings', label: 'דיונים', icon: CalendarDays },
  { href: '/crm/leads', label: 'לידים', icon: UserPlus },
  { href: '/crm/finances', label: 'פיננסים', icon: Wallet },
  { href: '/crm/attendance', label: 'נוכחות', icon: ClockIcon },
]

export default function CrmSidebar({ userEmail, onClose }: { userEmail: string; onClose?: () => void }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="w-60 bg-[#0f172a] min-h-screen flex flex-col border-l border-white/5 shrink-0">
      {/* Logo */}
      <div className="h-16 flex items-center gap-3 px-5 border-b border-white/5">
        <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center shrink-0 shadow-lg shadow-blue-900/40">
          <Scale size={17} className="text-white" />
        </div>
        <div className="flex-1">
          <p className="text-white font-bold text-sm leading-tight tracking-tight">משרד טבת</p>
          <p className="text-slate-500 text-xs">מערכת ניהול</p>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition lg:hidden">
            <X size={16} />
          </button>
        )}
      </div>

      {/* Search */}
      <form action="/crm/search" method="GET" className="px-3 pt-3 pb-1">
        <div className="relative">
          <Search size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            name="q"
            type="search"
            placeholder="חיפוש מהיר..."
            className="w-full pr-7 pl-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-white placeholder:text-slate-500 outline-none focus:border-blue-500/50 focus:bg-white/8 transition"
          />
        </div>
      </form>

      {/* Navigation */}
      <nav className="flex-1 py-2 px-3 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
              }`}
            >
              <Icon size={16} className="shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* User + Logout */}
      <div className="p-3 border-t border-white/5">
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0">
            {userEmail.charAt(0).toUpperCase()}
          </div>
          <p className="text-slate-400 text-xs truncate flex-1">{userEmail}</p>
          <button
            onClick={handleLogout}
            title="התנתק"
            className="text-slate-600 hover:text-slate-300 transition-colors shrink-0"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  )
}
