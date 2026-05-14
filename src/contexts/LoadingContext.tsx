'use client'

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'

interface LoadingContextValue {
  showLoading: () => void
}

const LoadingContext = createContext<LoadingContextValue | null>(null)

export function LoadingProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(false)
  const pathname = usePathname()

  // Hide loading whenever the route changes (navigation completed)
  useEffect(() => {
    setIsLoading(false)
  }, [pathname])

  const showLoading = useCallback(() => setIsLoading(true), [])

  return (
    <LoadingContext.Provider value={{ showLoading }}>
      {isLoading && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white/90 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4">
            <div className="relative w-12 h-12">
              <div className="absolute inset-0 rounded-full border-4 border-slate-100" />
              <div
                className="absolute inset-0 rounded-full border-4 border-transparent"
                style={{
                  borderTopColor: '#1e5fa8',
                  borderRightColor: '#0ea5a0',
                  animation: 'spin 0.9s linear infinite',
                }}
              />
            </div>
            <p className="text-sm font-medium" style={{ color: '#64748b' }}>Carregando…</p>
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}
      {children}
    </LoadingContext.Provider>
  )
}

export function useLoading(): LoadingContextValue {
  const ctx = useContext(LoadingContext)
  if (!ctx) throw new Error('useLoading must be used within LoadingProvider')
  return ctx
}
