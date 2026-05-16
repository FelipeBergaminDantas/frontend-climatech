'use client'

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import type { User } from '@/types'
import * as authService from '@/services/authService'
import { SESSION_KEY } from '@/config/constants'

interface AuthContextValue {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string, rememberMe?: boolean) => Promise<User>
  logout: () => Promise<void>
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
  const [useLocalStorage, setUseLocalStorage] = useState(false)

  // Restore session from localStorage or sessionStorage on mount
  useEffect(() => {
    try {
      const localRaw = localStorage.getItem(SESSION_KEY)
      const sessionRaw = sessionStorage.getItem(SESSION_KEY)
      const raw = localRaw ?? sessionRaw

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
        setUseLocalStorage(!!localRaw)
      }
    } catch {
      localStorage.removeItem(SESSION_KEY)
      sessionStorage.removeItem(SESSION_KEY)
    } finally {
      setIsLoading(false)
    }
  }, [])

  function persistUser(u: User, rememberMe = false) {
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

    localStorage.removeItem(SESSION_KEY)
    sessionStorage.removeItem(SESSION_KEY)

    if (rememberMe) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(persisted))
    } else {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(persisted))
    }
  }

  async function login(email: string, password: string, rememberMe = false): Promise<User> {
    setIsLoading(true)
    try {
      const loggedIn = await authService.login(email, password, rememberMe)
      setUser(loggedIn)
      setUseLocalStorage(rememberMe)
      persistUser(loggedIn, rememberMe)
      return loggedIn
    } finally {
      setIsLoading(false)
    }
  }

  async function logout() {
    await authService.logout()
    setUser(null)
    localStorage.removeItem(SESSION_KEY)
    sessionStorage.removeItem(SESSION_KEY)
    setUseLocalStorage(false)
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
      persistUser(updated, useLocalStorage)
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
