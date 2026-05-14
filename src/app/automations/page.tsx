'use client'

import { useMemo, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useRooms } from '@/contexts/RoomsContext'
import { useAutomations } from '@/contexts/AutomationsContext'
import { useClientStatus } from '@/hooks/useClientStatus'
import { getClientName, getAllClients } from '@/services/clientService'
import { Modal } from '@/components/ui/Modal'
import { RuleForm } from '@/components/automation/RuleForm'
import type { AutomationRule, Client } from '@/types'

const ACTION_LABEL: Record<string, string> = {
  turn_on: 'Ligar AC',
  turn_off: 'Desligar AC',
  set_temp: 'Ajustar temperatura',
}

const CONDITION_LABEL: Record<string, string> = {
  schedule: 'Agendamento',
  temperature: 'Temperatura',
}

export default function AutomationsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { rooms } = useRooms()
  const { getRulesForRoom, activeCount, totalCount, createRule } = useAutomations()
  const { canCreate } = useClientStatus()
  
  const isOverviewMode = user?.role === 'admin_master' && !user?.selectedClientId
  const isAdmin = user?.role === 'admin_master' || user?.role === 'admin_client'
  
  const [filterClient, setFilterClient] = useState<string>('all')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [selectedClientForRule, setSelectedClientForRule] = useState<string>('')
  const [clients, setClients] = useState<Client[]>([])
  
  // Carregar clientes se estiver em modo overview
  useEffect(() => {
    if (isOverviewMode) {
      getAllClients().then(setClients)
    }
  }, [isOverviewMode])

  // Filtrar salas por cliente no modo overview
  const filteredRooms = isOverviewMode && filterClient !== 'all'
    ? rooms.filter(r => r.clientId === filterClient)
    : rooms

  // Obter lista única de clientIds
  const clientIds = useMemo(() => {
    return Array.from(new Set(rooms.map(r => r.clientId)))
  }, [rooms])

  // Agrupar salas por cliente
  const roomsByClient = useMemo(() => {
    if (!isOverviewMode) return {}
    
    const grouped: Record<string, typeof rooms> = {}
    rooms.forEach(room => {
      if (!grouped[room.clientId]) {
        grouped[room.clientId] = []
      }
      grouped[room.clientId].push(room)
    })
    return grouped
  }, [isOverviewMode, rooms])
  
  // Salas disponíveis para criar automação (filtradas por cliente se em overview)
  const availableRoomsForCreation = isOverviewMode && selectedClientForRule
    ? rooms.filter(r => r.clientId === selectedClientForRule)
    : rooms
  
  function handleSaveRule(rule: AutomationRule) {
    createRule(rule)
    setIsFormOpen(false)
    setSelectedClientForRule('')
  }

  return (
    <main className="min-h-screen px-4 sm:px-6 py-6 sm:py-8 pb-16 bg-white">
      <div className="max-w-4xl mx-auto space-y-6">

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#0f2744' }}>
              {isOverviewMode ? 'Automações - Visão Geral' : 'Automações'}
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">{activeCount}/{totalCount} regras ativas</p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Botão Nova Automação (apenas para admins) */}
            {isAdmin && (
              <button
                onClick={() => {
                  setSelectedClientForRule('')
                  setIsFormOpen(true)
                }}
                disabled={!canCreate && !isOverviewMode}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: 'linear-gradient(135deg, #1e5fa8, #2d7dd2)' }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Nova Automação
              </button>
            )}
            
            {/* Filtro de cliente (apenas no modo overview) */}
            {isOverviewMode && clientIds.length > 0 && (
              <select
                value={filterClient}
                onChange={e => setFilterClient(e.target.value)}
                className="px-4 py-2 rounded-xl text-sm outline-none"
                style={{ background: 'white', border: '1px solid #e2e8f0', color: '#0f2744' }}
              >
                <option value="all">Todos os clientes</option>
                {clientIds.map(clientId => (
                  <option key={clientId} value={clientId}>
                    {getClientName(clientId)}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Warning banner for inactive clients */}
        {!canCreate && !isOverviewMode && (
          <div className="rounded-xl p-4 flex items-start gap-3" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#f59e0b' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-medium" style={{ color: '#f59e0b' }}>Cliente Inativo</p>
              <p className="text-xs mt-1" style={{ color: '#92400e' }}>
                Não é possível criar novas automações para clientes inativos. Você pode visualizar as automações existentes.
              </p>
            </div>
          </div>
        )}

        {isOverviewMode && filterClient === 'all' ? (
          // Modo overview: agrupar por cliente
          <div className="space-y-6">
            {Object.entries(roomsByClient).map(([clientId, clientRooms]) => {
              const clientRoomsWithRules = clientRooms.filter(room => getRulesForRoom(room.id).length > 0)
              if (clientRoomsWithRules.length === 0) return null
              
              const clientActiveRules = clientRoomsWithRules.reduce((sum, room) => {
                return sum + getRulesForRoom(room.id).filter(r => r.isActive).length
              }, 0)
              const clientTotalRules = clientRoomsWithRules.reduce((sum, room) => {
                return sum + getRulesForRoom(room.id).length
              }, 0)
              
              return (
                <div key={clientId}>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-semibold" style={{ color: '#1e5fa8' }}>
                      {getClientName(clientId)}
                    </h2>
                    <span className="text-xs text-slate-400">
                      {clientActiveRules}/{clientTotalRules} regras ativas
                    </span>
                  </div>
                  
                  <div className="space-y-4">
                    {clientRoomsWithRules.map(room => {
                      const rules = getRulesForRoom(room.id)
                      const active = rules.filter(r => r.isActive).length
                      return (
                        <div key={room.id} className="rounded-2xl overflow-hidden" style={{ border: '1px solid #e8edf5' }}>
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-4" style={{ background: '#f8fafc', borderBottom: '1px solid #e8edf5' }}>
                            <div>
                              <p className="font-semibold text-sm" style={{ color: '#0f2744' }}>{room.name}</p>
                              {room.location && <p className="text-xs text-slate-400 mt-0.5">{room.location}</p>}
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-xs px-2.5 py-1 rounded-full font-medium"
                                style={{ background: 'rgba(14,165,160,0.1)', color: '#0ea5a0' }}>
                                {active}/{rules.length} ativas
                              </span>
                              <button
                                onClick={() => router.push(`/rooms/${room.id}/automations`)}
                                className="text-xs px-3 py-1.5 rounded-xl font-medium transition-all"
                                style={{ background: 'white', color: '#1e5fa8', border: '1px solid #e2e8f0' }}
                              >
                                Gerenciar
                              </button>
                            </div>
                          </div>
                          <div className="divide-y divide-slate-50">
                            {rules.map(rule => (
                              <div key={rule.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-5 py-3.5">
                                <div className="flex items-center gap-3 min-w-0">
                                  <span className="w-2 h-2 rounded-full shrink-0"
                                    style={{ background: rule.isActive ? '#10c98f' : '#cbd5e1' }} />
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium truncate" style={{ color: '#0f2744' }}>{rule.name}</p>
                                    <p className="text-xs text-slate-400 mt-0.5">
                                      {CONDITION_LABEL[rule.conditionType]}
                                      {rule.conditionType === 'schedule' && ` · ${rule.scheduleStart} – ${rule.scheduleEnd}`}
                                      {rule.conditionType === 'temperature' && ` · ${rule.tempMin}°C – ${rule.tempMax}°C`}
                                    </p>
                                  </div>
                                </div>
                                <span className="shrink-0 self-start sm:self-auto text-xs px-2.5 py-1 rounded-full ml-5 sm:ml-4"
                                  style={rule.isActive
                                    ? { background: 'rgba(16,201,143,0.1)', color: '#10c98f' }
                                    : { background: '#f1f5f9', color: '#94a3b8' }}>
                                  {ACTION_LABEL[rule.action]}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          // Modo normal ou filtrado: lista simples
          <>
            {filteredRooms.map(room => {
              const rules = getRulesForRoom(room.id)
              if (rules.length === 0) return null
              const active = rules.filter(r => r.isActive).length
              return (
                <div key={room.id} className="rounded-2xl overflow-hidden" style={{ border: '1px solid #e8edf5' }}>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-4" style={{ background: '#f8fafc', borderBottom: '1px solid #e8edf5' }}>
                    <div>
                      <p className="font-semibold text-sm" style={{ color: '#0f2744' }}>{room.name}</p>
                      {room.location && <p className="text-xs text-slate-400 mt-0.5">{room.location}</p>}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs px-2.5 py-1 rounded-full font-medium"
                        style={{ background: 'rgba(14,165,160,0.1)', color: '#0ea5a0' }}>
                        {active}/{rules.length} ativas
                      </span>
                      <button
                        onClick={() => router.push(`/rooms/${room.id}/automations`)}
                        className="text-xs px-3 py-1.5 rounded-xl font-medium transition-all"
                        style={{ background: 'white', color: '#1e5fa8', border: '1px solid #e2e8f0' }}
                      >
                        Gerenciar
                      </button>
                    </div>
                  </div>
                  <div className="divide-y divide-slate-50">
                    {rules.map(rule => (
                      <div key={rule.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-5 py-3.5">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="w-2 h-2 rounded-full shrink-0"
                            style={{ background: rule.isActive ? '#10c98f' : '#cbd5e1' }} />
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate" style={{ color: '#0f2744' }}>{rule.name}</p>
                            <p className="text-xs text-slate-400 mt-0.5">
                              {CONDITION_LABEL[rule.conditionType]}
                              {rule.conditionType === 'schedule' && ` · ${rule.scheduleStart} – ${rule.scheduleEnd}`}
                              {rule.conditionType === 'temperature' && ` · ${rule.tempMin}°C – ${rule.tempMax}°C`}
                            </p>
                          </div>
                        </div>
                        <span className="shrink-0 self-start sm:self-auto text-xs px-2.5 py-1 rounded-full ml-5 sm:ml-4"
                          style={rule.isActive
                            ? { background: 'rgba(16,201,143,0.1)', color: '#10c98f' }
                            : { background: '#f1f5f9', color: '#94a3b8' }}>
                          {ACTION_LABEL[rule.action]}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </>
        )}

        {totalCount === 0 && (
          <p className="text-sm text-slate-400 text-center py-12">Nenhuma automação configurada.</p>
        )}
        
        {/* Modal de criação de automação */}
        {isAdmin && (
          <Modal
            isOpen={isFormOpen}
            onClose={() => {
              setIsFormOpen(false)
              setSelectedClientForRule('')
            }}
            title="Nova Automação"
          >
            {/* Filtro de cliente (apenas no modo overview) */}
            {isOverviewMode && (
              <div className="mb-4 rounded-xl p-4" style={{ background: 'rgba(30,95,168,0.05)', border: '1px solid rgba(30,95,168,0.15)' }}>
                <label className="block text-sm font-semibold mb-2" style={{ color: '#1e5fa8' }}>
                  Selecione o Cliente *
                </label>
                <select
                  value={selectedClientForRule}
                  onChange={e => setSelectedClientForRule(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: 'white', border: '1.5px solid #e2e8f0', color: '#0f2744' }}
                  required
                >
                  <option value="">Selecione um cliente...</option>
                  {clients.filter(c => c.isActive).map(client => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 mt-1.5">
                  A automação será criada para uma sala deste cliente
                </p>
              </div>
            )}
            
            {/* Formulário de automação */}
            {(!isOverviewMode || selectedClientForRule) && (
              <RuleForm
                roomId="" // Será selecionado no formulário
                rooms={availableRoomsForCreation}
                onSave={handleSaveRule}
                onCancel={() => {
                  setIsFormOpen(false)
                  setSelectedClientForRule('')
                }}
              />
            )}
            
            {/* Mensagem quando cliente não selecionado */}
            {isOverviewMode && !selectedClientForRule && (
              <p className="text-sm font-medium text-center py-8" style={{ color: '#1e5fa8' }}>
                Selecione um cliente para continuar
              </p>
            )}
          </Modal>
        )}
      </div>
    </main>
  )
}

