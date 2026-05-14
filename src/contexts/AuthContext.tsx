'use client'

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import type { User } from '@/types'
import * as authService from '@/services/authService'
import { SESSION_KEY } from '@/config/constants'

interface AuthContextValue {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<User>
  logout: () => void
  register: (name: string, email: string, password: string) => Promise<void>
  verify2FA: (token: string) => Promise<boolean>
  updateUser: (data: Partial<User>) => void
}

type PersistedUser = Pick<User, 'id' | 'name' | 'email' | 'twoFactorEnabled' | 'role' | 'clientId' | 'selectedClientId'> & {
  avatarUrl?: string
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Restore session from sessionStorage on mount
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY)
      if (raw) {
        const persisted: PersistedUser = JSON.parse(raw)
        setUser({
          id: persisted.id,
          name: persisted.name,
          email: persisted.email,
          avatarUrl: persisted.avatarUrl,
          twoFactorEnabled: persisted.twoFactorEnabled,
          role: persisted.role,
          clientId: persisted.clientId,
          selectedClientId: persisted.selectedClientId,
        })
      }
    } catch {
      sessionStorage.removeItem(SESSION_KEY)
    } finally {
      setIsLoading(false)
    }
  }, [])

  function persistUser(u: User) {
    const persisted: PersistedUser = {
      id: u.id,
      name: u.name,
      email: u.email,
      avatarUrl: u.avatarUrl,
      twoFactorEnabled: u.twoFactorEnabled,
      role: u.role,
      clientId: u.clientId,
      selectedClientId: u.selectedClientId,
    }
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(persisted))
  }

  async function login(email: string, password: string): Promise<User> {
    setIsLoading(true)
    try {
      const loggedIn = authService.login(email, password)
      setUser(loggedIn)
      persistUser(loggedIn)
      return loggedIn
    } finally {
      setIsLoading(false)
    }
  }

  function logout() {
    authService.logout()
    setUser(null)
    sessionStorage.removeItem(SESSION_KEY)
  }

  async function register(name: string, email: string, password: string) {
    setIsLoading(true)
    try {
      authService.register(name, email, password)
    } finally {
      setIsLoading(false)
    }
  }

  async function verify2FA(token: string): Promise<boolean> {
    return authService.verify2FA(token)
  }

  function updateUser(data: Partial<User>) {
    setUser((prev) => {
      if (!prev) return prev
      const updated = { ...prev, ...data }
      persistUser(updated)
      return updated
    })
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: user !== null,
        isLoading,
        login,
        logout,
        register,
        verify2FA,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return ctx
}
