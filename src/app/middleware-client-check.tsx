'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

export function ClientCheckMiddleware({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, isLoading } = useAuth()

  useEffect(() => {
    if (isLoading) return

    // Páginas públicas não precisam de verificação
    const publicPaths = ['/login', '/register', '/2fa', '/select-client', '/clients']
    if (publicPaths.some(path => pathname.startsWith(path))) return

    // Admin_master pode acessar tudo mesmo sem cliente selecionado (visão de todos os clientes)
    if (user?.role === 'admin_master') return

    // Outros usuários (admin_client, user) sempre precisam ter clientId
    if (user && !user.clientId) {
      router.push('/login')
    }
  }, [user, isLoading, pathname, router])

  return <>{children}</>
}
