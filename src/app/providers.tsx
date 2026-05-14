'use client'

import { useEffect, type ReactNode } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { ClientProvider } from '@/contexts/ClientContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { RoomsProvider } from '@/contexts/RoomsContext'
import { AutomationsProvider } from '@/contexts/AutomationsContext'
import { LoadingProvider } from '@/contexts/LoadingContext'
import { Sidebar } from '@/components/ui/Sidebar'

const PUBLIC_ROUTES = ['/login', '/register', '/2fa', '/select-client']

function RouteGuard({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  const isPublic = PUBLIC_ROUTES.some(r => pathname.startsWith(r))

  useEffect(() => {
    if (isLoading) return

    // Redireciona para login se não autenticado
    if (!isAuthenticated && !isPublic) {
      router.replace('/login')
      return
    }

    // Admin_master pode acessar todas as páginas mesmo sem cliente selecionado
    // (visão de todos os clientes)
    // Outros usuários (admin_client, user) sempre precisam ter clientId
    if (
      isAuthenticated &&
      user?.role !== 'admin_master' &&
      !user?.clientId &&
      !isPublic
    ) {
      router.replace('/login')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, isAuthenticated, isPublic, user, pathname])

  if (isLoading) return null
  if (!isAuthenticated && !isPublic) return null

  return <>{children}</>
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <ClientProvider>
        <ThemeProvider>
          <LoadingProvider>
            <RoomsProvider>
              <AutomationsProvider>
                <RouteGuard>
                  <Sidebar />
                  {/* pt-14 only on authenticated routes — public pages (login/register) have no topbar */}
                  <PublicAwareWrapper>{children}</PublicAwareWrapper>
                </RouteGuard>
              </AutomationsProvider>
            </RoomsProvider>
          </LoadingProvider>
        </ThemeProvider>
      </ClientProvider>
    </AuthProvider>
  )
}

function PublicAwareWrapper({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const isPublic = PUBLIC_ROUTES.some(r => pathname.startsWith(r))
  const isSelectClient = pathname === '/select-client'
  
  // Apenas páginas públicas e seleção de cliente não têm padding
  if (isPublic || isSelectClient) {
    return <>{children}</>
  }
  
  return (
    <div className="lg:pl-60 pt-14 lg:pt-0 min-h-screen">
      {children}
    </div>
  )
}
