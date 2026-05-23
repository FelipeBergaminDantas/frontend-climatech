'use client'

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import type { AutomationRule, AutomationState } from '@/types'
import * as automationService from '@/services/automationService'

function formatAutomationRuntimeStatus(state: AutomationState): string | undefined {
  if (state.status) {
    return state.status
  }

  if (state.flEmExecucao) {
    return 'EM_EXECUCAO'
  }

  if (state.comandoEnviado) {
    return state.comandoEnviado
  }

  if (state.dthUltimaExecucao) {
    return `Última execução: ${new Date(state.dthUltimaExecucao).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })}`
  }

  return undefined
}

interface AutomationsContextValue {
  rules: AutomationRule[]
  states: Record<string, AutomationState>
  activeCount: number
  totalCount: number
  loadRules: (roomId?: string, clientId?: string) => Promise<void>
  loadStates: (roomId: string) => Promise<void>
  toggleRule: (id: string, password?: string) => Promise<AutomationRule>
  createRule: (data: {
    clientId?: string
    roomId: string
    nomeAutomacao: string
    flSomenteDiaUtil: boolean
    flSegunda: boolean
    flTerca: boolean
    flQuarta: boolean
    flQuinta: boolean
    flSexta: boolean
    flSabado: boolean
    flDomingo: boolean
    horaInicio: string
    horaFim: string
    prioridade: number
  }, password?: string) => Promise<AutomationRule>
  updateRule: (
    id: string,
    data: {
      nomeAutomacao?: string
      flSomenteDiaUtil?: boolean
      flSegunda?: boolean
      flTerca?: boolean
      flQuarta?: boolean
      flQuinta?: boolean
      flSexta?: boolean
      flSabado?: boolean
      flDomingo?: boolean
      horaInicio?: string
      horaFim?: string
      prioridade?: number
      flAtivo?: boolean
    },
    password?: string
  ) => Promise<AutomationRule>
  deleteRule: (id: string, password?: string) => Promise<void>
  getRulesForRoom: (roomId: string) => AutomationRule[]
}

export const AutomationsContext = createContext<AutomationsContextValue | null>(null)

export function AutomationsProvider({ children }: { children: ReactNode }) {
  const [rules, setRules] = useState<AutomationRule[]>([])
  const [states, setStates] = useState<Record<string, AutomationState>>({})

  const loadRules = useCallback(async (roomId?: string, clientId?: string) => {
    const fetched = await automationService.fetchAutomations(clientId, roomId)
    setRules(fetched)
  }, [])

  const loadStates = useCallback(async (roomId: string) => {
    const fetched = await automationService.fetchAutomationStates(roomId)
    setStates(
      fetched.reduce((acc, state) => {
        acc[state.idAutomacao] = state
        return acc
      }, {} as Record<string, AutomationState>)
    )

    setRules(prev => prev.map(rule => {
      const state = fetched.find((item) => item.idAutomacao === rule.id)
      if (!state) return rule
      return {
        ...rule,
        runtimeStatus: formatAutomationRuntimeStatus(state),
      }
    }))
  }, [])

  const toggleRule = useCallback(async (id: string, password?: string) => {
    const updated = await automationService.toggleRule(id, password)
    setRules(prev => prev.map(r => (r.id === id ? updated : r)))
    return updated
  }, [])

  const createRule = useCallback(async (data: {
    clientId?: string
    roomId: string
    nomeAutomacao: string
    flSomenteDiaUtil: boolean
    flSegunda: boolean
    flTerca: boolean
    flQuarta: boolean
    flQuinta: boolean
    flSexta: boolean
    flSabado: boolean
    flDomingo: boolean
    horaInicio: string
    horaFim: string
    prioridade: number
  }, password?: string) => {
    const created = await automationService.createRule(data, password)
    setRules(prev => [...prev, created])
    return created
  }, [])

  const updateRule = useCallback(async (
    id: string,
    data: {
      nomeAutomacao?: string
      flSomenteDiaUtil?: boolean
      flSegunda?: boolean
      flTerca?: boolean
      flQuarta?: boolean
      flQuinta?: boolean
      flSexta?: boolean
      flSabado?: boolean
      flDomingo?: boolean
      horaInicio?: string
      horaFim?: string
      prioridade?: number
      flAtivo?: boolean
    },
    password?: string
  ) => {
    const updated = await automationService.updateRule(id, data, password)
    setRules(prev => prev.map(r => (r.id === id ? updated : r)))
    return updated
  }, [])

  const deleteRule = useCallback(async (id: string, password?: string) => {
    await automationService.deleteRule(id, password)
    setRules(prev => prev.filter(r => r.id !== id))
  }, [])

  const getRulesForRoom = useCallback((roomId: string) => {
    return rules.filter(r => r.roomId === roomId)
  }, [rules])

  return (
    <AutomationsContext.Provider value={{
      rules,
      states,
      activeCount: rules.filter(r => r.flAtivo).length,
      totalCount: rules.length,
      loadRules,
      loadStates,
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
