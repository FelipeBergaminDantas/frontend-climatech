'use client'

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import type { AutomationRule, AutomationState } from '@/types'
import * as automationService from '@/services/automationService'

function formatAutomationRuntimeStatus(state: AutomationState): string | undefined {
  // Apply canonical rules (latest event already returned by backend):
  // 1) If latest event has dthFimExecucao null and comandoEnviado == power_off => "POWER OFF PREVENTIVO ENVIADO"
  // 2) If latest event comandoEnviado == power_on => "EM EXECUCAO"
  // 3) If latest event has dthFimExecucao not null and comandoEnviado == power_off => "AUTOMACAO FINALIZADA"
  // 4) Else => "DESLIGADO"

  try {
    const cmd = state.comandoEnviado ? String(state.comandoEnviado).trim().toLowerCase() : undefined
    const hasFim = Boolean(state.dthFimExecucao)

    // Apply user's exact display strings (do not change casing or format)
    if (!hasFim && cmd === 'power_off') return 'PowerOff preventivo enviado'
    if (cmd === 'power_on') return 'Em execução'
    if (hasFim && cmd === 'power_off') return 'Automação finalizada'

    return undefined
  } catch (err) {
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
    setStates(prev => ({
      ...prev,
      ...fetched.reduce((acc, state) => {
        acc[state.idAutomacao] = state
        return acc
      }, {} as Record<string, AutomationState>)
    }))

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
    setRules(prev => prev.map(r => {
      if (r.id !== id) return r
      return {
        ...updated,
        runtimeStatus: r.runtimeStatus,
      }
    }))
    try {
      await loadStates(updated.roomId)
    } catch (error) {
      console.warn('Failed to refresh automation states after toggle:', error)
    }
    return updated
  }, [loadStates])

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
    try {
      await loadStates(created.roomId)
    } catch (error) {
      console.warn('Failed to refresh automation states after create:', error)
    }
    return created
  }, [loadStates])

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
    setRules(prev => prev.map(r => {
      if (r.id !== id) return r
      return {
        ...updated,
        runtimeStatus: r.runtimeStatus,
      }
    }))
    try {
      await loadStates(updated.roomId)
    } catch (error) {
      console.warn('Failed to refresh automation states after update:', error)
    }
    return updated
  }, [loadStates])

  const deleteRule = useCallback(async (id: string, password?: string) => {
    const ruleToDelete = rules.find((rule) => rule.id === id)
    await automationService.deleteRule(id, password)
    setRules(prev => prev.filter(r => r.id !== id))
    if (ruleToDelete) {
      try {
        await loadStates(ruleToDelete.roomId)
      } catch (error) {
        console.warn('Failed to refresh automation states after delete:', error)
      }
    }
  }, [loadStates, rules])

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
