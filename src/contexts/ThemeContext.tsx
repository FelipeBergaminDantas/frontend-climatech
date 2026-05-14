'use client'

import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react'
import type { ThemePreferences } from '@/types'
import { STORAGE_KEY } from '@/config/constants'

interface ThemeContextValue {
  preferences: ThemePreferences
  setMode: (mode: 'light' | 'dark') => void
  setBackgroundColor: (color: string) => void
  setOpacity: (opacity: number) => void
  savePreferences: (prefs: ThemePreferences) => void
  loadPreferences: () => ThemePreferences
}

const DEFAULT_PREFERENCES: ThemePreferences = {
  mode: 'light',
  backgroundColor: '#f0f4f8',
  backgroundOpacity: 100,
}

export const ThemeContext = createContext<ThemeContextValue | null>(null)

function applyToDocument(prefs: ThemePreferences) {
  const root = document.documentElement
  // Toggle dark/light class
  root.classList.remove('dark', 'light')
  root.classList.add(prefs.mode)
  // CSS custom properties
  root.style.setProperty('--bg-color', prefs.backgroundColor)
  root.style.setProperty('--bg-opacity', String(prefs.backgroundOpacity / 100))
}

function readFromStorage(): ThemePreferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      return JSON.parse(raw) as ThemePreferences
    }
  } catch {
    // ignore
  }
  return { ...DEFAULT_PREFERENCES }
}

function writeToStorage(prefs: ThemePreferences) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
  } catch {
    // ignore
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<ThemePreferences>({ ...DEFAULT_PREFERENCES })
  const prefsRef = useRef(preferences)

  // Keep ref in sync
  useEffect(() => {
    prefsRef.current = preferences
  }, [preferences])

  // Load from localStorage on mount and apply to document
  useEffect(() => {
    const stored = readFromStorage()
    setPreferences(stored)
    applyToDocument(stored)
  }, [])

  const update = useCallback((next: ThemePreferences) => {
    setPreferences(next)
    applyToDocument(next)
  }, [])

  const setMode = useCallback((mode: 'light' | 'dark') => {
    update({ ...prefsRef.current, mode })
  }, [update])

  const setBackgroundColor = useCallback((backgroundColor: string) => {
    update({ ...prefsRef.current, backgroundColor })
  }, [update])

  const setOpacity = useCallback((backgroundOpacity: number) => {
    update({ ...prefsRef.current, backgroundOpacity })
  }, [update])

  const savePreferences = useCallback((prefs: ThemePreferences) => {
    writeToStorage(prefs)
    update(prefs)
  }, [update])

  const loadPreferences = useCallback((): ThemePreferences => {
    return readFromStorage()
  }, [])

  return (
    <ThemeContext.Provider
      value={{
        preferences,
        setMode,
        setBackgroundColor,
        setOpacity,
        savePreferences,
        loadPreferences,
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return ctx
}
