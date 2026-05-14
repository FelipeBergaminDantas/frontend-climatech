'use client'

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import type { AutomationRule } from '@/types'
import * as automationService from '@/services/automationService'
import { useRooms } from './RoomsContext'

interface AutomationsContextValue {
  rules: AutomationRule[]
  activeCount: number
  totalCount: number
  toggleRule: (id: string) => void
  createRule: (data: Omit<AutomationRule, 'id' | 'createdAt'>) => AutomationRule
  updateRule: (id: string, data: Partial<Omit<AutomationRule, 'id' | 'createdAt'>>) => AutomationRule
  deleteRule: (id: string) => void
  getRulesForRoom: (roomId: string) => AutomationRule[]
}

export const AutomationsContext = createContext<AutomationsContextValue | null>(null)

export function AutomationsProvider({ children }: { children: ReactNode }) {
  const { rooms } = useRooms()
  const [rules, setRules] = useState<AutomationRule[]>([])

  useEffect(() => {
    if (rooms.length === 0) return
    const all: AutomationRule[] = []
    for (const room of rooms) {
      all.push(...automationService.getRules(room.id))
    }
    setRules(all)
  }, [rooms])

  const toggleRule = useCallback((id: string) => {
    automationService.toggleRule(id)
    setRules(prev => prev.map(r => r.id === id ? { ...r, isActive: !r.isActive } : r))
  }, [])

  const createRule = useCallback((data: Omit<AutomationRule, 'id' | 'createdAt'>): AutomationRule => {
    const { rule } = automationService.createRule(data)
    setRules(prev => [...prev, rule])
    return rule
  }, [])

  const updateRule = useCallback((id: string, data: Partial<Omit<AutomationRule, 'id' | 'createdAt'>>): AutomationRule => {
    const updated = automationService.updateRule(id, data)
    setRules(prev => prev.map(r => r.id === id ? updated : r))
    return updated
  }, [])

  const deleteRule = useCallback((id: string) => {
    automationService.deleteRule(id)
    setRules(prev => prev.filter(r => r.id !== id))
  }, [])

  const getRulesForRoom = useCallback((roomId: string) => {
    return rules.filter(r => r.roomId === roomId)
  }, [rules])

  return (
    <AutomationsContext.Provider value={{
      rules,
      activeCount: rules.filter(r => r.isActive).length,
      totalCount: rules.length,
      toggleRule,
      createRule,
      updateRule,
      deleteRule,
      getRulesForRoom,
    }}>
      {children}
    </AutomationsContext.Provider>
  )
}

export function useAutomations(): AutomationsContextValue {
  const ctx = useContext(AutomationsContext)
  if (!ctx) throw new Error('useAutomations must be used within an AutomationsProvider')
  return ctx
}
