'use client'

import { useState, type ReactNode } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useLoading } from '@/contexts/LoadingContext'
import { useClient } from '@/contexts/ClientContext'

type NavLink = {
  href: string
  label: string
  icon: ReactNode
  showOnlyForAllClients?: boolean
  adminOnly?: boolean
  adminMasterOnly?: boolean
}

const NAV_LINKS: NavLink[] = [
  {
    href: '/clients',
    label: 'Visão Geral',
    showOnlyForAllClients: true, // Só aparece quando está vendo todos os clientes
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
        <rect x="3" y="3" width="7" height="7" rx="1" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="14" y="3" width="7" height="7" rx="1" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="3" y="14" width="7" height="7" rx="1" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="14" y="14" width="7" height="7" rx="1" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: '/rooms',
    label: 'Salas',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 21V12h6v9" />
      </svg>
    ),
  },
  {
    href: '/energy',
    label: 'Energia',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
      </svg>
    ),
  },
  {
    href: '/nodes',
    label: 'Nodes',
    adminOnly: true,
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2v-4M9 21H5a2 2 0 01-2-2v-4m0 0h18" />
      </svg>
    ),
  },
  {
    href: '/users',
    label: 'Usuários',
    adminOnly: true,
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    href: '/admin/mqtt-terminal',
    label: 'Terminal MQTT',
    adminMasterOnly: true,
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} fill="none" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 5h18M7 9h10M7 13h10M7 17h10" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 5v14a2 2 0 002 2h14a2 2 0 002-2V5" />
      </svg>
    ),
  },
  {
    href: '/automations',
    label: 'Automações',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 2a4 4 0 014 4v1h1a2 2 0 012 2v2a2 2 0 01-2 2h-1v1a4 4 0 01-8 0v-1H7a2 2 0 01-2-2V9a2 2 0 012-2h1V6a4 4 0 014-4z" />
        <circle cx="9" cy="10" r="1" fill="currentColor" stroke="none" />
        <circle cx="15" cy="10" r="1" fill="currentColor" stroke="none" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 14s1 1.5 3 1.5 3-1.5 3-1.5" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 20v2M16 20v2M12 18v1" />
      </svg>
    ),
  },
  {
    href: '/ac-temps',
    label: 'Config. ACs',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
        <line x1="12" y1="2" x2="12" y2="22" strokeLinecap="round" />
        <line x1="2" y1="12" x2="22" y2="12" strokeLinecap="round" />
        <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" strokeLinecap="round" />
        <line x1="19.07" y1="4.93" x2="4.93" y2="19.07" strokeLinecap="round" />
        <circle cx="12" cy="12" r="2" />
        <circle cx="12" cy="2" r="1" fill="currentColor" stroke="none" />
        <circle cx="12" cy="22" r="1" fill="currentColor" stroke="none" />
        <circle cx="2" cy="12" r="1" fill="currentColor" stroke="none" />
        <circle cx="22" cy="12" r="1" fill="currentColor" stroke="none" />
        <circle cx="4.93" cy="4.93" r="1" fill="currentColor" stroke="none" />
        <circle cx="19.07" cy="19.07" r="1" fill="currentColor" stroke="none" />
        <circle cx="19.07" cy="4.93" r="1" fill="currentColor" stroke="none" />
        <circle cx="4.93" cy="19.07" r="1" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    href: '/ai',
    label: 'Assistente ClimaTech',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
  },
  {
    href: '/settings',
    label: 'Configurações',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <circle cx="12" cy="12" r="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
]

// Cores da sidebar clara
const SIDEBAR_BG = '#f1f5f9'       // cinza azulado suave
const SIDEBAR_BORDER = '#e2e8f0'   // borda divisória
const TEXT_MUTED = '#64748b'       // texto secundário
const TEXT_ACTIVE = '#0f2744'      // texto ativo / principal

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, isAuthenticated, logout, updateUser } = useAuth()
  const { showLoading } = useLoading()
  const { selectedClient, availableClients } = useClient()
  const [mobileOpen, setMobileOpen] = useState(false)

  // Não mostrar sidebar na página de seleção de cliente ou na tela de login
  if (pathname === '/select-client' || pathname === '/login') return null
  
  if (!isAuthenticated) return null

  // Verifica se está na visão de todos os clientes (admin_master sem cliente selecionado)
  const isAllClientsView = user?.role === 'admin_master' && !user.selectedClientId

  async function handleLogout() {
    showLoading()
    await logout()
    router.replace('/login')
  }

  function handleChangeClient() {
    // Limpa o cliente selecionado e redireciona para seleção
    updateUser({ selectedClientId: undefined })
    router.push('/select-client')
  }

  // Determina qual cliente mostrar
  const displayClient = user?.role === 'admin_master'
    ? availableClients.find(c => c.id === user.selectedClientId)
    : availableClients.find(c => c.id === user?.clientId)

  const SidebarContent = () => (
    <div className="flex flex-col h-full" style={{ background: SIDEBAR_BG }}>

      {/* Logo */}
      <div className="px-5 py-5" style={{ borderBottom: `1px solid ${SIDEBAR_BORDER}` }}>
        <Link href="/dashboard" className="flex items-center gap-2.5" onClick={() => setMobileOpen(false)}>
          <Image
            src="/logo_sem_nome.png"
            alt="ClimaTech"
            width={52}
            height={52}
            className="object-contain w-[52px] h-[52px]"
            style={{ mixBlendMode: 'multiply' }}
          />
          <div>
            <span className="font-bold text-base tracking-tight" style={{ color: TEXT_ACTIVE }}>ClimaTech</span>
            <p className="text-xs leading-none mt-0.5" style={{ color: TEXT_MUTED }}>Controle Climático IoT</p>
          </div>
        </Link>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-4 space-y-0.5" aria-label="Navegação principal">
        {NAV_LINKS.filter(link => {
          // Link "Visão Geral" só aparece quando está vendo todos os clientes
          if (link.showOnlyForAllClients) {
            return isAllClientsView
          }
          // Links apenas para admin_master
          if (link.adminMasterOnly) {
            return user?.role === 'admin_master'
          }
          // Links apenas para admins
          if (link.adminOnly) {
            const isAdmin = user?.role === 'admin_master' || user?.role === 'admin_client'
            return isAdmin
          }
          return true
        }).map(({ href, label, icon, adminOnly, adminMasterOnly }) => {
          const active = pathname === href || (href !== '/dashboard' && href !== '/clients' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={{
                color: active ? '#0f2744' : TEXT_MUTED,
                background: active ? 'rgba(14,165,160,0.1)' : 'transparent',
                borderLeft: active ? '3px solid #0ea5a0' : '3px solid transparent',
              }}
              aria-current={active ? 'page' : undefined}
            >
              <span style={{ color: active ? '#0ea5a0' : TEXT_MUTED }}>{icon}</span>
              {label}
              {/* removed admin-only badges per UX request */}
            </Link>
          )
        })}
      </nav>

      {/* User + logout */}
      <div className="px-3 py-4 space-y-2" style={{ borderTop: `1px solid ${SIDEBAR_BORDER}` }}>
        {/* Cliente selecionado ou indicador de "Todos os Clientes" */}
        {user?.role === 'admin_master' && (
          <div className="px-3 py-2 rounded-xl mb-2" style={{ background: isAllClientsView ? 'rgba(124,58,237,0.08)' : 'rgba(14,165,160,0.08)', border: isAllClientsView ? '1px solid rgba(124,58,237,0.15)' : '1px solid rgba(14,165,160,0.15)' }}>
            {isAllClientsView ? (
              <>
                <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: TEXT_MUTED }}>
                  Visualização Atual
                </p>
                <p className="text-sm font-bold truncate" style={{ color: '#7c3aed' }}>
                  Todos os Clientes
                </p>
                <button
                  onClick={handleChangeClient}
                  className="text-xs mt-1.5 text-slate-500 hover:text-slate-700 transition-colors"
                >
                  Selecionar cliente específico →
                </button>
              </>
            ) : displayClient ? (
              <>
                <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: TEXT_MUTED }}>
                  Cliente Atual
                </p>
                <p className="text-sm font-bold truncate" style={{ color: '#0ea5a0' }}>
                  {displayClient.name}
                </p>
                <button
                  onClick={handleChangeClient}
                  className="text-xs mt-1.5 text-slate-500 hover:text-slate-700 transition-colors"
                >
                  Trocar cliente →
                </button>
              </>
            ) : null}
          </div>
        )}
        
        {/* Cliente para admin_client e user */}
        {user?.role !== 'admin_master' && displayClient && (
          <div className="px-3 py-2 rounded-xl mb-2" style={{ background: 'rgba(14,165,160,0.08)', border: '1px solid rgba(14,165,160,0.15)' }}>
            <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: TEXT_MUTED }}>
              Cliente
            </p>
            <p className="text-sm font-bold truncate" style={{ color: '#0ea5a0' }}>
              {displayClient.name}
            </p>
          </div>
        )}

        <div className="flex items-center gap-3 px-3 py-2 mb-1">
          {user?.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.avatarUrl} alt="Avatar" className="w-8 h-8 rounded-full object-cover" style={{ border: `2px solid ${SIDEBAR_BORDER}` }} />
          ) : (
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
              style={{ background: 'linear-gradient(135deg, #0ea5a0, #10c98f)' }}>
              {user?.name?.[0]?.toUpperCase() ?? '?'}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: TEXT_ACTIVE }}>{user?.name}</p>
            <p className="text-xs truncate" style={{ color: TEXT_MUTED }}>
              {user?.role === 'admin_master' ? 'Administrador Master' : user?.role === 'admin_client' ? 'Administrador' : 'Usuário'}
            </p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all"
          style={{ color: '#ef4444' }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.08)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Sair
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className="hidden lg:flex flex-col fixed left-0 top-0 h-full w-60 z-40"
        style={{ background: SIDEBAR_BG, borderRight: `1px solid ${SIDEBAR_BORDER}` }}
        aria-label="Sidebar"
      >
        <SidebarContent />
      </aside>

      {/* Mobile top bar */}
      <header
        className="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-3"
        style={{ background: SIDEBAR_BG, borderBottom: `1px solid ${SIDEBAR_BORDER}` }}
      >
        <Link href="/dashboard" className="flex items-center gap-2">
          <Image src="/logo_sem_nome.png" alt="ClimaTech" width={28} height={28} className="object-contain" style={{ mixBlendMode: 'multiply' }} />
          <span className="font-bold text-base" style={{ color: TEXT_ACTIVE }}>ClimaTech</span>
        </Link>
        <button
          onClick={() => setMobileOpen(o => !o)}
          className="p-2 rounded-lg transition-colors"
          style={{ color: TEXT_MUTED }}
          aria-label={mobileOpen ? 'Fechar menu' : 'Abrir menu'}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div className="lg:hidden fixed inset-0 z-40 bg-black/30" onClick={() => setMobileOpen(false)} aria-hidden="true" />
          <aside
            className="lg:hidden fixed left-0 top-0 h-full w-64 z-50"
            style={{ background: SIDEBAR_BG, borderRight: `1px solid ${SIDEBAR_BORDER}` }}
          >
            <SidebarContent />
          </aside>
        </>
      )}
    </>
  )
}
