'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useRooms } from '@/contexts/RoomsContext'
import { useAutomations } from '@/contexts/AutomationsContext'
import { getTemperatureHistory, getLiveReadings } from '@/services/deviceService'
import { getIndicatorStatus } from '@/utils/validators'
import { TemperatureChart } from '@/components/monitoring/TemperatureChart'
import { ChartSection } from '@/components/monitoring/ChartSection'
import { EmptyState } from '@/components/dashboard/EmptyState'
import { getClientName, getAllClients } from '@/services/clientService'
import { LiveModeNotification } from '@/components/dashboard/LiveModeNotification'
import {
  activateLiveMode,
  deactivateLiveMode,
  getLiveModeState,
  canControlLiveMode,
  addLiveModeListener,
} from '@/services/liveModeService'
import type { TemperatureReading } from '@/types'

function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="rounded-2xl p-5 flex flex-col gap-1" style={{ background: 'white', border: '1px solid #e8edf5' }}>
      <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold" style={{ color: color ?? '#0f2744' }}>{value}</p>
      {sub && <p className="text-xs text-slate-400">{sub}</p>}
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl p-5 animate-pulse" style={{ background: 'white', border: '1px solid #e8edf5' }}>
      <div className="h-3 bg-slate-100 rounded w-1/2 mb-3" />
      <div className="h-7 bg-slate-100 rounded w-1/3 mb-2" />
      <div className="h-3 bg-slate-100 rounded w-2/3" />
    </div>
  )
}

function SkeletonChart() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="h-4 bg-slate-100 rounded w-1/3" />
      <div className="h-[300px] bg-slate-50 rounded-xl" />
    </div>
  )
}

const modeLabel: Record<string, string> = {
  cool: 'Refrigerar', fan: 'Ventilador', dry: 'Desumidificar', heat: 'Aquecer', auto: 'Automático',
}

export default function DashboardPage() {
  const router = useRouter()
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  const { rooms, deviceStates, isLoading: roomsLoading, syncDeviceState } = useRooms()
  const { activeCount: autoActive, totalCount: autoTotal } = useAutomations()

  const [selectedRoomId, setSelectedRoomId] = useState<string>('')
  
  // Filtro de cliente para visão de todos os clientes (admin_master sem cliente selecionado)
  const [dashboardClientFilter, setDashboardClientFilter] = useState<string>('')
  const [activeClients, setActiveClients] = useState<Array<{id: string, name: string, isActive: boolean}>>([])
  const [isLoadingClients, setIsLoadingClients] = useState(false)
  const isAllClientsView = user?.role === 'admin_master' && !user?.selectedClientId
  
  // Determinar o clientId atual
  const currentClientId = isAllClientsView 
    ? dashboardClientFilter 
    : user?.selectedClientId || user?.clientId || ''

  // Verificar se o cliente está ativo
  const [isClientActive, setIsClientActive] = useState(true)

  useEffect(() => {
    if (currentClientId) {
      getAllClients().then(clients => {
        const client = clients.find(c => c.id === currentClientId)
        setIsClientActive(client?.isActive ?? true)
      })
    }
  }, [currentClientId])

  // Estado do modo ao vivo do serviço
  const [liveModeState, setLiveModeState] = useState(() => 
    currentClientId ? getLiveModeState(currentClientId) : {
      isActive: false,
      activatedBy: null,
      activatedByName: null,
      activatedAt: null,
      clientId: '',
    }
  )

  // Sincronizar com o serviço de modo ao vivo
  useEffect(() => {
    if (!currentClientId) return
    
    // Atualizar estado inicial
    setLiveModeState(getLiveModeState(currentClientId))
    
    // Registrar listener para mudanças
    const unsubscribe = addLiveModeListener(currentClientId, (state) => {
      setLiveModeState(state)
    })
    
    return unsubscribe
  }, [currentClientId])

  // Função para alternar modo ao vivo
  const toggleLiveMode = () => {
    if (!user || !currentClientId) return
    
    // Usuários comuns não podem ativar
    if (user.role === 'user') {
      alert('Apenas administradores podem ativar o modo ao vivo')
      return
    }
    
    // Cliente inativo não pode ativar modo ao vivo
    if (!isClientActive && !liveModeState.isActive) {
      alert('Não é possível ativar o modo ao vivo para clientes inativos')
      return
    }
    
    if (liveModeState.isActive) {
      // Tentar desativar
      const result = deactivateLiveMode(currentClientId, user.id)
      if (!result.success) {
        alert(result.message)
      }
    } else {
      // Tentar ativar
      const result = activateLiveMode(currentClientId, user.id, user.name)
      if (!result.success) {
        alert(result.message)
      }
    }
  }

  // Carregar clientes ativos
  useEffect(() => {
    if (isAllClientsView) {
      setIsLoadingClients(true)
      getAllClients().then(clients => {
        const active = clients.filter(c => c.isActive)
        setActiveClients(active)
        setIsLoadingClients(false)
      })
    }
  }, [isAllClientsView])

  // Redirecionar admin_master sem cliente selecionado para tela de seleção
  // REMOVIDO - agora permitimos acesso à visão de todos os clientes
  // useEffect(() => {
  //   if (!authLoading && user?.role === 'admin_master' && !user?.selectedClientId) {
  //     router.push('/select-client')
  //   }
  // }, [user, authLoading, router])

  // Filtrar salas por cliente quando estiver na visão de todos os clientes
  const filteredRooms = useMemo(() => {
    if (!isAllClientsView || !dashboardClientFilter) {
      return rooms
    }
    return rooms.filter(r => r.clientId === dashboardClientFilter)
  }, [rooms, isAllClientsView, dashboardClientFilter])
  
  // Lista de clientes únicos para o filtro (apenas clientes ativos)
  const clientIds = useMemo(() => {
    const uniqueClientIds = Array.from(new Set(rooms.map(r => r.clientId)))
    // Filtrar apenas clientes ativos
    const activeClientIds = activeClients.map(c => c.id)
    return uniqueClientIds.filter(id => activeClientIds.includes(id))
  }, [rooms, activeClients])
  
  // Auto-selecionar primeiro cliente quando estiver na visão de todos os clientes
  useEffect(() => {
    if (isAllClientsView && !dashboardClientFilter && clientIds.length > 0) {
      setDashboardClientFilter(clientIds[0])
    }
  }, [isAllClientsView, dashboardClientFilter, clientIds])

  // Auto-select first room
  useEffect(() => {
    if (filteredRooms.length > 0 && !selectedRoomId) {
      setSelectedRoomId(filteredRooms[0].id)
    }
  }, [filteredRooms, selectedRoomId])
  
  // Reset room selection when filter changes
  useEffect(() => {
    if (isAllClientsView && dashboardClientFilter) {
      const firstRoom = filteredRooms[0]
      if (firstRoom) {
        setSelectedRoomId(firstRoom.id)
      }
    }
  }, [dashboardClientFilter, isAllClientsView, filteredRooms])

  // Polling para modo ao vivo - atualiza cards a cada 2 segundos
  useEffect(() => {
    if (!liveModeState.isActive) return

    const interval = setInterval(() => {
      // Simula atualização dos estados dos dispositivos
      filteredRooms.forEach(room => {
        const currentState = deviceStates[room.id]
        if (currentState) {
          // Simula pequenas variações de temperatura
          const variation = (Math.random() - 0.5) * 0.5
          const newTemp = Math.round((currentState.currentTemp + variation) * 10) / 10
          
          syncDeviceState(room.id, {
            ...currentState,
            currentTemp: newTemp,
            lastUpdated: new Date().toISOString(),
          })
        }
      })
    }, 2000) // 2 segundos

    return () => clearInterval(interval)
  }, [liveModeState.isActive, filteredRooms, deviceStates, syncDeviceState])

  const selectedRoom = useMemo(() => filteredRooms.find(r => r.id === selectedRoomId), [filteredRooms, selectedRoomId])
  const selectedState = selectedRoomId ? deviceStates[selectedRoomId] : undefined

  const isLoading = roomsLoading || (isAllClientsView && isLoadingClients)
  if (!isAuthenticated && !authLoading) return null

  // Summary stats
  const onlineCount = filteredRooms.filter(r => deviceStates[r.id]?.isOn).length
  const avgTemp = filteredRooms.length > 0
    ? (filteredRooms.map(r => deviceStates[r.id]).filter(Boolean).reduce((sum, s) => sum + s.currentTemp, 0) / filteredRooms.length).toFixed(1)
    : '—'
  const totalRooms = filteredRooms.length

  const status = selectedRoom && selectedState
    ? getIndicatorStatus(selectedState.currentTemp, selectedState.targetTemp)
    : 'ok'

  const statusColor = { ok: '#10c98f', warning: '#f59e0b', critical: '#ef4444' }[status]
  const statusLabel = { ok: 'Normal', warning: 'Atenção', critical: 'Crítico' }[status]

  return (
    <main className="min-h-screen px-4 sm:px-6 py-6 sm:py-8 pb-16 bg-white">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#0f2744' }}>
              Dashboard
            </h1>
            {user && <p className="text-sm text-slate-500 mt-0.5">Bem-vindo(a), {user.name}</p>}
          </div>
          <div className="flex items-center gap-3">
            {/* Filtro de cliente - apenas para visão de todos os clientes */}
            {isAllClientsView && clientIds.length > 0 && (
              <select
                value={dashboardClientFilter}
                onChange={e => setDashboardClientFilter(e.target.value)}
                className="px-4 py-2 rounded-xl text-sm outline-none cursor-pointer"
                style={{ background: 'white', border: '1px solid #e2e8f0', color: '#0f2744' }}
                aria-label="Filtrar por cliente"
              >
                {clientIds.map(clientId => (
                  <option key={clientId} value={clientId}>
                    {getClientName(clientId)}
                  </option>
                ))}
              </select>
            )}
            <button
              onClick={toggleLiveMode}
              disabled={user?.role === 'user' || (!isClientActive && !liveModeState.isActive)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              style={liveModeState.isActive
                ? { background: '#10c98f', color: 'white' }
                : { background: 'white', color: '#64748b', border: '1px solid #e2e8f0' }}
              title={
                user?.role === 'user' 
                  ? 'Apenas administradores podem ativar o modo ao vivo'
                  : !isClientActive && !liveModeState.isActive
                  ? 'Cliente inativo não pode ativar modo ao vivo'
                  : liveModeState.isActive && liveModeState.activatedBy !== user?.id
                  ? `Ativado por ${liveModeState.activatedByName}`
                  : ''
              }
            >
              <span className={`w-2 h-2 rounded-full ${liveModeState.isActive ? 'bg-white animate-pulse' : 'bg-slate-400'}`} />
              {liveModeState.isActive 
                ? `Modo Ao Vivo${liveModeState.activatedByName && liveModeState.activatedBy !== user?.id ? ` (${liveModeState.activatedByName})` : ''}`
                : 'Ativar Modo Ao Vivo'}
            </button>
          </div>
        </div>

        {isLoading && (
          <div className="space-y-6">
            {isLoadingClients && (
              <div className="flex flex-col items-center justify-center py-12 gap-4">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-200 border-t-[#1e5fa8]" />
                <p className="text-sm text-slate-500">Carregando clientes ativos...</p>
              </div>
            )}
            {!isLoadingClients && (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="lg:col-span-2 rounded-2xl p-6" style={{ background: 'white', border: '1px solid #e8edf5' }}>
                    <SkeletonChart />
                  </div>
                  <div className="rounded-2xl p-6 animate-pulse space-y-4" style={{ background: 'white', border: '1px solid #e8edf5' }}>
                    <div className="h-4 bg-slate-100 rounded w-1/2" />
                    <div className="h-20 bg-slate-50 rounded-xl" />
                    <div className="h-4 bg-slate-100 rounded w-2/3" />
                    <div className="h-4 bg-slate-100 rounded w-1/2" />
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {!isLoading && filteredRooms.length === 0 && (
          <div className="rounded-2xl p-12 text-center" style={{ background: 'white', border: '1px solid #e8edf5' }}>
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4" style={{ background: 'rgba(30,95,168,0.08)' }}>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" style={{ color: '#1e5fa8' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2" style={{ color: '#0f2744' }}>
              Nenhuma sala cadastrada
            </h3>
            <p className="text-sm text-slate-500">
              Este cliente ainda não possui salas cadastradas
            </p>
          </div>
        )}

        {!isLoading && filteredRooms.length > 0 && (
          <>
            {/* Summary stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard label="Total de salas" value={String(totalRooms)} sub="cadastradas" />
              <StatCard label="ACs ligados" value={String(onlineCount)} sub={`de ${totalRooms}`} color="#10c98f" />
              <StatCard label="Temp. média" value={`${avgTemp}°C`} sub="todas as salas" color="#1e5fa8" />
              <StatCard label="Automações" value={`${autoActive}/${autoTotal}`} sub="ativas" color="#0ea5a0" />
            </div>

            {/* Main chart section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

              {/* Chart — 2/3 width */}
              <div className="lg:col-span-2 rounded-2xl p-4 sm:p-6" style={{ background: 'white', border: '1px solid #e8edf5' }}>
                <ChartSection
                  roomId={selectedRoomId}
                  roomName={selectedRoom?.name}
                  idealMin={selectedRoom?.idealTempMin}
                  idealMax={selectedRoom?.idealTempMax}
                  showClientFilter={false}
                  allRooms={filteredRooms}
                  onRoomChange={setSelectedRoomId}
                />
              </div>

              {/* Room detail card — 1/3 width */}
              <div className="rounded-2xl p-4 sm:p-6 flex flex-col gap-4" style={{ background: 'white', border: '1px solid #e8edf5' }}>
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-sm" style={{ color: '#0f2744' }}>
                    {selectedRoom?.name ?? 'Sala'}
                  </h2>
                  <span className="flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full"
                    style={{ background: `${statusColor}18`, color: statusColor }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusColor }} />
                    {statusLabel}
                  </span>
                </div>

                {/* Big temperature */}
                <div className="flex-1 flex flex-col items-center justify-center py-4">
                  <p className="text-6xl font-bold" style={{ color: '#0f2744' }}>
                    {selectedState ? `${selectedState.currentTemp}°` : '—'}
                  </p>
                  <p className="text-sm text-slate-400 mt-1">Celsius</p>
                  {selectedRoom && (
                    <p className="text-xs text-slate-400 mt-2">
                      Ideal: {selectedRoom.idealTempMin}°C – {selectedRoom.idealTempMax}°C
                    </p>
                  )}
                </div>

                {/* AC status */}
                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Ar-condicionado</span>
                    <span className="font-medium flex items-center gap-1.5"
                      style={{ color: selectedState?.isOn ? '#10c98f' : '#94a3b8' }}>
                      <span className="w-2 h-2 rounded-full" style={{ background: selectedState?.isOn ? '#10c98f' : '#94a3b8' }} />
                      {selectedState?.isOn ? 'Ligado' : 'Desligado'}
                    </span>
                  </div>
                  {selectedState?.isOn && (
                    <>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500">Modo</span>
                        <span className="font-medium" style={{ color: '#0f2744' }}>{modeLabel[selectedState.mode] ?? selectedState.mode}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500">Alvo</span>
                        <span className="font-medium" style={{ color: '#1e5fa8' }}>{selectedState.targetTemp}°C</span>
                      </div>
                    </>
                  )}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Consumo est.</span>
                    <span className="font-medium" style={{ color: '#0f2744' }}>
                      {selectedState?.isOn ? '1.2 kWh' : '0 kWh'}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => router.push(`/rooms/${selectedRoomId}`)}
                  className="w-full py-2.5 rounded-xl text-sm font-medium text-white transition-all"
                  style={{ background: 'linear-gradient(135deg, #1e5fa8, #2d7dd2)' }}
                >
                  Ver detalhes
                </button>
              </div>
            </div>

            {/* Room cards grid */}
            <div>
              <h2 className="text-sm font-semibold mb-3" style={{ color: '#0f2744' }}>
                Todas as salas
              </h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredRooms.map(room => {
                  const state = deviceStates[room.id]
                  const s = state ? getIndicatorStatus(state.currentTemp, state.targetTemp) : 'ok'
                  const sc = { ok: '#10c98f', warning: '#f59e0b', critical: '#ef4444' }[s]
                  return (
                    <button
                      key={room.id}
                      onClick={() => router.push(`/rooms/${room.id}`)}
                      className="text-left rounded-2xl p-4 sm:p-5 transition-all hover:shadow-md"
                      style={{ background: 'white', border: selectedRoomId === room.id ? '1.5px solid #1e5fa8' : '1px solid #e8edf5' }}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-semibold text-sm" style={{ color: '#0f2744' }}>{room.name}</p>
                          {room.location && <p className="text-xs text-slate-400 mt-0.5">{room.location}</p>}
                        </div>
                        <span className="w-2.5 h-2.5 rounded-full mt-1 shrink-0" style={{ background: sc }} />
                      </div>
                      <p className="text-3xl font-bold mb-2" style={{ color: '#0f2744' }}>
                        {state ? `${state.currentTemp}°C` : '—'}
                      </p>
                      <div className="flex items-center justify-between text-xs mt-1">
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1" style={{ color: state?.isOn ? '#10c98f' : '#94a3b8' }}>
                            <span className="w-1.5 h-1.5 rounded-full" style={{ background: state?.isOn ? '#10c98f' : '#94a3b8' }} />
                            {state?.isOn ? 'Ligado' : 'Desligado'}
                          </span>
                          {state?.isOn && <span className="text-slate-300">·</span>}
                          {state?.isOn && <span className="text-slate-400">{modeLabel[state.mode]}</span>}
                        </div>
                        <span className="text-slate-400">{room.acCount} AC{room.acCount !== 1 ? 's' : ''}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </>
        )}
      </div>
      
      {/* Notificação de modo ao vivo */}
      {currentClientId && user && (
        <LiveModeNotification 
          clientId={currentClientId} 
          currentUserId={user.id} 
        />
      )}
    </main>
  )
}

