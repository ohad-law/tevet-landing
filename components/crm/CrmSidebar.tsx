'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutDashboard, FolderOpen, Users, CheckSquare, CalendarDays,
  UserPlus, Wallet, LogOut, Scale, ClockIcon, X, Sun, ExternalLink, BookOpen, PenLine,
} from 'lucide-react'

const navItems = [
  { href: '/crm/dashboard',  label: 'לוח בקרה',      icon: LayoutDashboard },
  { href: '/crm/my-day',     label: 'יום שלי',         icon: Sun },
  { href: '/crm/cases',      label: 'תיקים',            icon: FolderOpen },
  { href: '/crm/clients',    label: 'לקוחות',           icon: Users },
  { href: '/crm/tasks',      label: 'משימות',            icon: CheckSquare },
  { href: '/crm/hearings',   label: 'דיונים',            icon: CalendarDays },
  { href: '/crm/leads',      label: 'לידים',             icon: UserPlus },
  { href: '/crm/finances',   label: 'פיננסים',           icon: Wallet },
  { href: '/crm/attendance', label: 'נוכחות',            icon: ClockIcon },
  { href: '/crm/signatures', label: 'חתימות',            icon: PenLine },
  { href: '/crm/library',    label: 'ספריית ידע',        icon: BookOpen },
]

const extLinks = [
  { href: 'https://www.nethamishpat.court.gov.il', label: 'נט-המשפט', icon: ExternalLink },
]

export default function CrmSidebar({
  userEmail,
  onClose,
  badges = {},
  compact = false,
}: {
  userEmail: string
  onClose?: () => void
  badges?: Record<string, number>
  compact?: boolean
}) {
  const pathname = usePathname()
  const router  = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  /* ─── COMPACT (desktop, icon-only) ─── */
  if (compact) {
    return (
      <aside
        style={{
          width: 56,
          height: '100vh',
          background: '#0f172a',
          borderLeft: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: "'Assistant', sans-serif",
          overflow: 'visible',
          zIndex: 30,
        }}
      >
        {/* Logo icon */}
        <div style={{
          height: 56, width: '100%', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div style={{
            width: 32, height: 32,
            background: 'linear-gradient(135deg, #d97706, #f59e0b)',
            borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(217,119,6,0.3)',
          }}>
            <Scale size={15} color="white" />
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, width: '100%', padding: '6px 0', display: 'flex', flexDirection: 'column', gap: 1, overflow: 'visible' }}>
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href || pathname.startsWith(href + '/')
            const badge = badges[href] ?? 0
            return (
              <div key={href} className="crm-sidebar-item" style={{ width: '100%' }}>
                <Link
                  href={href}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    height: 40, margin: '0 6px', borderRadius: 8,
                    background: isActive ? 'rgba(217,119,6,0.15)' : 'transparent',
                    color: isActive ? '#fbbf24' : '#475569',
                    borderRight: isActive ? '2px solid #d97706' : '2px solid transparent',
                    transition: 'all 0.12s',
                    position: 'relative',
                  }}
                  onMouseEnter={e => {
                    if (!isActive) {
                      (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,0.06)'
                      ;(e.currentTarget as HTMLAnchorElement).style.color = '#94a3b8'
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isActive) {
                      (e.currentTarget as HTMLAnchorElement).style.background = 'transparent'
                      ;(e.currentTarget as HTMLAnchorElement).style.color = '#475569'
                    }
                  }}
                >
                  <Icon size={17} />
                  {badge > 0 && (
                    <span style={{
                      position: 'absolute', top: 4, right: 4,
                      background: '#ef4444', color: '#fff',
                      fontSize: 9, width: 14, height: 14, borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 700, lineHeight: 1,
                    }}>
                      {badge > 9 ? '9+' : badge}
                    </span>
                  )}
                </Link>
                <span className="crm-sidebar-tooltip">{label}</span>
              </div>
            )
          })}

          {/* Divider */}
          <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '4px 10px' }} />

          {extLinks.map(({ href, label, icon: Icon }) => (
            <div key={href} className="crm-sidebar-item" style={{ width: '100%' }}>
              <a
                href={href} target="_blank" rel="noopener noreferrer"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  height: 40, margin: '0 6px', borderRadius: 8,
                  color: '#334155', background: 'transparent', transition: 'all 0.12s',
                  borderRight: '2px solid transparent',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,0.06)'; (e.currentTarget as HTMLAnchorElement).style.color = '#64748b' }}
                onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'transparent'; (e.currentTarget as HTMLAnchorElement).style.color = '#334155' }}
              >
                <Icon size={15} />
              </a>
              <span className="crm-sidebar-tooltip">{label}</span>
            </div>
          ))}
        </nav>

        {/* User footer */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '4px 0', flexShrink: 0, overflow: 'visible' }}>
          <div className="crm-sidebar-item" style={{ width: '100%' }}>
            <div style={{
              height: 36, margin: '0 6px', borderRadius: 8,
              background: 'rgba(217,119,6,0.12)', color: '#fbbf24',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 700, cursor: 'default',
            }}>
              {userEmail.charAt(0).toUpperCase()}
            </div>
            <span className="crm-sidebar-tooltip">{userEmail}</span>
          </div>
          <div className="crm-sidebar-item" style={{ width: '100%', marginTop: 1 }}>
            <button
              onClick={handleLogout}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                height: 36, width: 'calc(100% - 12px)', margin: '0 6px', borderRadius: 8,
                color: '#334155', background: 'transparent', border: 'none', cursor: 'pointer',
                transition: 'all 0.12s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)'; (e.currentTarget as HTMLButtonElement).style.color = '#64748b' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = '#334155' }}
            >
              <LogOut size={15} />
            </button>
            <span className="crm-sidebar-tooltip">התנתק</span>
          </div>
        </div>
      </aside>
    )
  }

  /* ─── FULL (mobile drawer) ─── */
  return (
    <aside
      style={{
        width: 232, height: '100vh',
        background: '#0f172a',
        borderLeft: '1px solid rgba(255,255,255,0.06)',
        fontFamily: "'Assistant', sans-serif",
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Logo */}
      <div style={{
        height: 56, flexShrink: 0, padding: '0 14px',
        display: 'flex', alignItems: 'center', gap: 10,
        borderBottom: '1px solid rgba(255,255,255,0.07)',
      }}>
        <div style={{
          width: 30, height: 30, flexShrink: 0,
          background: 'linear-gradient(135deg, #d97706, #f59e0b)', borderRadius: 8,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(217,119,6,0.3)',
        }}>
          <Scale size={14} color="white" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontWeight: 700, fontSize: 13, color: '#f1f5f9', lineHeight: 1.3 }}>משרד טבת</p>
          <p style={{ fontSize: 10, color: '#334155', marginTop: 1 }}>מערכת ניהול</p>
        </div>
        {onClose && (
          <button onClick={onClose} style={{ color: '#475569', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <X size={15} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '6px 8px', display: 'flex', flexDirection: 'column', gap: 1 }}>
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/')
          const badge = badges[href] ?? 0
          return (
            <Link
              key={href} href={href} onClick={onClose}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 12px', borderRadius: 7,
                background: isActive ? 'rgba(217,119,6,0.14)' : 'transparent',
                color: isActive ? '#fbbf24' : '#64748b',
                fontSize: 13, fontWeight: 500,
                borderRight: isActive ? '2px solid #d97706' : '2px solid transparent',
                paddingRight: isActive ? '10px' : '12px',
                transition: 'all 0.12s',
                textDecoration: 'none',
              }}
              onMouseEnter={e => {
                if (!isActive) {
                  (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,0.05)'
                  ;(e.currentTarget as HTMLAnchorElement).style.color = '#cbd5e1'
                }
              }}
              onMouseLeave={e => {
                if (!isActive) {
                  (e.currentTarget as HTMLAnchorElement).style.background = 'transparent'
                  ;(e.currentTarget as HTMLAnchorElement).style.color = '#64748b'
                }
              }}
            >
              <Icon size={15} style={{ color: isActive ? '#fbbf24' : '#475569', flexShrink: 0 }} />
              <span style={{ flex: 1 }}>{label}</span>
              {badge > 0 && (
                <span style={{
                  background: isActive ? 'rgba(251,191,36,0.2)' : '#ef4444',
                  color: isActive ? '#fbbf24' : '#fff',
                  fontSize: 10, fontWeight: 700, padding: '1px 5px', borderRadius: 9,
                }}>
                  {badge > 99 ? '99+' : badge}
                </span>
              )}
            </Link>
          )
        })}

        <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '6px 4px' }} />

        {extLinks.map(({ href, label, icon: Icon }) => (
          <a
            key={href} href={href} target="_blank" rel="noopener noreferrer"
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '7px 12px', borderRadius: 7,
              color: '#475569', fontSize: 12,
              textDecoration: 'none', transition: 'all 0.12s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,0.05)'; (e.currentTarget as HTMLAnchorElement).style.color = '#94a3b8' }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'transparent'; (e.currentTarget as HTMLAnchorElement).style.color = '#475569' }}
          >
            <Icon size={13} style={{ flexShrink: 0 }} />
            <span style={{ flex: 1 }}>{label}</span>
          </a>
        ))}
      </nav>

      {/* User footer */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', padding: '10px', flexShrink: 0 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '6px 8px', borderRadius: 8,
          background: 'rgba(255,255,255,0.03)',
        }}>
          <div style={{
            width: 26, height: 26, flexShrink: 0, borderRadius: 7,
            background: 'rgba(217,119,6,0.2)', color: '#fbbf24',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 700,
          }}>
            {userEmail.charAt(0).toUpperCase()}
          </div>
          <p style={{ fontSize: 11, color: '#334155', fontWeight: 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {userEmail}
          </p>
          <button
            onClick={handleLogout}
            style={{ color: '#334155', background: 'none', border: 'none', cursor: 'pointer', padding: 4, flexShrink: 0 }}
            onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.color = '#94a3b8')}
            onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.color = '#334155')}
          >
            <LogOut size={13} />
          </button>
        </div>
      </div>
    </aside>
  )
}
