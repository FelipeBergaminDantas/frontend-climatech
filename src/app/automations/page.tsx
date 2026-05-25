'use client'

import { useMemo, useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRooms } from '@/contexts/RoomsContext'
import { useAutomations } from '@/contexts/AutomationsContext'
import { useClientStatus } from '@/hooks/useClientStatus'
import { getClientName, getAllClients } from '@/services/clientService'
import { Modal } from '@/components/ui/Modal'
import { PasswordConfirmModal } from '@/components/ui/PasswordConfirmModal'
import { RuleForm } from '@/components/automation/RuleForm'
import { RuleList } from '@/components/automation/RuleList'
import type { AutomationRule, Client } from '@/types'

export default function AutomationsPage() {
  const { user } = useAuth()
  const { rooms } = useRooms()
  const { getRulesForRoom, activeCount, totalCount, createRule, updateRule, deleteRule, toggleRule, loadRules, loadStates } = useAutomations()
  const { canCreate } = useClientStatus()
  
  const isOverviewMode = user?.role === 'admin_master' && !user?.selectedClientId
  const isAdmin = user?.role === 'admin_master' || user?.role === 'admin_client'
  
  const [filterClient, setFilterClient] = useState<string>('all')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<AutomationRule | undefined>()
  const [selectedClientForRule, setSelectedClientForRule] = useState<string>('')
  const [clients, setClients] = useState<Client[]>([])

  type PasswordActionType = 'toggle' | 'delete' | 'save'
  interface PasswordAction {
    type: PasswordActionType
    ruleId?: string
    rule?: AutomationRule
    payload?: Omit<AutomationRule, 'id' | 'createdAt' | 'updatedAt' | 'runtimeStatus'>
    isEdit?: boolean
  }

  const [pendingPasswordAction, setPendingPasswordAction] = useState<PasswordAction | null>(null)
  const [pendingSaveResolver, setPendingSaveResolver] = useState<{
    resolve: () => void
    reject: (error: unknown) => void
  } | null>(null)
  
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

  const roomsToDisplay = isOverviewMode ? filteredRooms : rooms

  // Obter lista única de clientIds
  const clientIds = useMemo(() => {
    return Array.from(new Set(rooms.map(r => r.clientId)))
  }, [rooms])

  // Agrupar salas por cliente para exibir diretamente na visão geral
  const roomsByClient = useMemo(() => {
    if (!isOverviewMode) return {}

    const grouped: Record<string, typeof rooms> = {}
    roomsToDisplay.forEach(room => {
      if (!grouped[room.clientId]) {
        grouped[room.clientId] = []
      }
      grouped[room.clientId].push(room)
    })
    return grouped
  }, [isOverviewMode, roomsToDisplay])
  
  useEffect(() => {
    if (!user) return

    // Don't pass clientId to backend - it uses authenticated context
    // backend will handle filtering based on user role
    loadRules(undefined)
  }, [loadRules, user])

  useEffect(() => {
    const roomsWithRules = roomsToDisplay.filter(room => getRulesForRoom(room.id).length > 0)
    roomsWithRules.forEach(room => loadStates(room.id))
  }, [roomsToDisplay, getRulesForRoom, loadStates])

  // Poll automation states every 10 seconds to show real-time status
  useEffect(() => {
    const roomsWithRules = roomsToDisplay.filter(room => getRulesForRoom(room.id).length > 0)
    if (roomsWithRules.length === 0) return

    const interval = setInterval(() => {
      roomsWithRules.forEach(room => {
        loadStates(room.id).catch(err => console.error('Failed to load states for room', room.id, err))
      })
    }, 10000)

    return () => clearInterval(interval)
  }, [roomsToDisplay, getRulesForRoom, loadStates])

  // Salas disponíveis para criar automação (filtradas por cliente se em overview)
  const availableRoomsForCreation = isOverviewMode && selectedClientForRule
    ? rooms.filter(r => r.clientId === selectedClientForRule)
    : rooms
  
  async function handleSaveRule(
    rule: Omit<AutomationRule, 'id' | 'createdAt' | 'updatedAt' | 'runtimeStatus'>
  ) {
    return new Promise<void>((resolve, reject) => {
      setPendingPasswordAction({
        type: 'save',
        rule: editingRule,
        payload: rule,
        isEdit: Boolean(editingRule),
      })
      setPendingSaveResolver({ resolve, reject })
    })
  }

  function handleEditRule(rule: AutomationRule) {
    setEditingRule(rule)
    setIsFormOpen(true)
    setSelectedClientForRule(rule.clientId)
  }

  function handleDeleteRule(ruleId: string) {
    setPendingPasswordAction({ type: 'delete', ruleId })
  }

  function handleToggleRule(ruleId: string) {
    setPendingPasswordAction({ type: 'toggle', ruleId })
  }

  function closePasswordModal() {
    if (pendingSaveResolver) {
      pendingSaveResolver.reject(new Error('Ação cancelada.'))
    }
    setPendingPasswordAction(null)
    setPendingSaveResolver(null)
  }

  async function handleConfirmPassword(password: string) {
    if (!pendingPasswordAction) return

    try {
      if (pendingPasswordAction.type === 'toggle' && pendingPasswordAction.ruleId) {
        await toggleRule(pendingPasswordAction.ruleId, password)
      }

      if (pendingPasswordAction.type === 'delete' && pendingPasswordAction.ruleId) {
        await deleteRule(pendingPasswordAction.ruleId, password)
      }

      if (pendingPasswordAction.type === 'save' && pendingPasswordAction.payload) {
        if (pendingPasswordAction.isEdit && pendingPasswordAction.rule) {
          await updateRule(pendingPasswordAction.rule.id, pendingPasswordAction.payload, password)
          setEditingRule(undefined)
        } else {
          await createRule(pendingPasswordAction.payload, password)
        }
        setIsFormOpen(false)
        setSelectedClientForRule('')
      }

      if (pendingSaveResolver) {
        pendingSaveResolver.resolve()
      }
    } catch (error) {
      if (pendingSaveResolver) {
        pendingSaveResolver.reject(error)
      }
      throw error
    } finally {
      setPendingPasswordAction(null)
      setPendingSaveResolver(null)
    }
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

        {isOverviewMode ? (
          // Modo overview: agrupar por cliente
          <div className="space-y-6">
            {Object.entries(roomsByClient).map(([clientId, clientRooms]) => {
              const clientRoomsWithRules = clientRooms.filter(room => getRulesForRoom(room.id).length > 0)
              if (clientRoomsWithRules.length === 0) return null
              
              const clientActiveRules = clientRoomsWithRules.reduce((sum, room) => {
                return sum + getRulesForRoom(room.id).filter(r => r.flAtivo).length
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
                      const active = rules.filter(r => r.flAtivo).length
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
                            </div>
                          </div>
                          <div className="divide-y divide-slate-50">
                            <RuleList
                              rules={rules}
                              onToggle={isAdmin ? handleToggleRule : () => {}}
                              onEdit={isAdmin ? handleEditRule : () => {}}
                              onDelete={isAdmin ? handleDeleteRule : () => {}}
                            />
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
              const active = rules.filter(r => r.flAtivo).length
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
                    </div>
                  </div>
                  <div className="divide-y divide-slate-50">
                    <RuleList
                      rules={rules}
                      onToggle={handleToggleRule}
                      onEdit={handleEditRule}
                      onDelete={handleDeleteRule}
                      isAdmin={isAdmin}
                    />
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
              setEditingRule(undefined)
            }}
            title={editingRule ? 'Editar Automação' : 'Nova Automação'}
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
                  setEditingRule(undefined)
                }}
                initialRule={editingRule}
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

        {pendingPasswordAction && (
          <PasswordConfirmModal
            title={
              pendingPasswordAction.type === 'toggle'
                ? 'Confirmar alteração de estado'
                : pendingPasswordAction.type === 'delete'
                ? 'Confirmar exclusão'
                : 'Confirmar automação'
            }
            message={
              pendingPasswordAction.type === 'toggle'
                ? 'Digite sua senha para ativar ou desativar esta automação.'
                : pendingPasswordAction.type === 'delete'
                ? 'Digite sua senha para excluir esta automação permanentemente.'
                : 'Digite sua senha para salvar a automação.'
            }
            confirmButtonText={
              pendingPasswordAction.type === 'delete' ? 'Excluir' : 'Confirmar'
            }
            isDangerous={pendingPasswordAction.type === 'delete'}
            onConfirm={handleConfirmPassword}
            onClose={closePasswordModal}
          />
        )}
      </div>
    </main>
  )
}

