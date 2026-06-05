'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRooms } from '@/contexts/RoomsContext'
import { getAllClients, getClientName } from '@/services/clientService'
import { getNodesByClientFromBackend, getAllNodesStatusFromBackend, type NodeResponse, type NodeStatusResponse } from '@/services/apiService'
import { useTemperatureTelemetryBatch } from '@/hooks/useTemperatureTelemetry'
import { getIndicatorStatus } from '@/utils/validators'
import { useRouter } from 'next/navigation'

function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="rounded-2xl p-5 flex flex-col gap-1" style={{ background: 'white', border: '1px solid #e8edf5' }}>
      <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold" style={{ color: color ?? '#0f2744' }}>{value}</p>
      {sub && <p className="text-xs text-slate-400">{sub}</p>}
    </div>
  )
}

export default function OverviewPage() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const { rooms, deviceStates } = useRooms()
  
  // Filtro de cliente para visão geral
  const [selectedClientId, setSelectedClientId] = useState<string>('all')
  const [clients, setClients] = useState<Array<{id: string, name: string, isActive: boolean}>>([])
  const [clientNodes, setClientNodes] = useState<Record<string, NodeResponse[]>>({})
  const [nodeStatuses, setNodeStatuses] = useState<Record<string, { online: boolean; mqtt: boolean; lastHeartbeat: string | null; secondsSinceLastHeartbeat: number | null }>>({})
  const [isLoadingClients, setIsLoadingClients] = useState(true)
  const [isLoadingNodeCounts, setIsLoadingNodeCounts] = useState(false)
  
  // Filtro de mês/ano para consumo de energia
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })

  // Redirecionar se não for admin_master
  useEffect(() => {
    if (!authLoading && user && user.role !== 'admin_master') {
      router.push('/dashboard')
    }
  }, [user, authLoading, router])

  // Carregar clientes
  useEffect(() => {
    if (user?.role === 'admin_master') {
      setIsLoadingClients(true)
      getAllClients().then(allClients => {
        // Filtrar apenas clientes ativos
        const activeOnly = allClients.filter(c => c.isActive)
        setClients(activeOnly)
        setIsLoadingClients(false)
      })
    }
  }, [user?.role])

  // Carregar nodes para contagem no overview
  useEffect(() => {
    let mounted = true

    async function loadClientNodes() {
      if (user?.role !== 'admin_master' || clients.length === 0) {
        if (mounted) setClientNodes({})
        return
      }

      setIsLoadingNodeCounts(true)
      try {
        const entries = await Promise.all(clients.map(async (client) => {
          const nodes = await getNodesByClientFromBackend(client.id)
          return [client.id, nodes] as const
        }))
        if (mounted) {
          setClientNodes(Object.fromEntries(entries))
        }
        // fetch statuses for all nodes once
        try {
          const statuses = await getAllNodesStatusFromBackend()
          if (mounted) {
            const map: Record<string, NodeStatusResponse> = {}
            statuses.forEach(s => { map[s.nodeId] = s })
            setNodeStatuses(map)
          }
        } catch (err) {
          console.error('[clientsPage] failed to load node statuses', err)
        }
      } catch (error) {
        console.error('[clientsPage] Error loading client nodes:', error)
        if (mounted) setClientNodes({})
      } finally {
        if (mounted) setIsLoadingNodeCounts(false)
      }
    }

    loadClientNodes()
    return () => {
      mounted = false
    }
  }, [user?.role, clients])

  const activeClients = clients
  const filteredRooms = selectedClientId === 'all'
    ? rooms
    : rooms.filter(r => r.clientId === selectedClientId)
  const ctnrNodeIds = filteredRooms.map((room) => room.deviceId).filter(Boolean)
  const telemetryNodeIds = !authLoading && user?.role === 'admin_master' && !isLoadingClients
    ? ctnrNodeIds
    : []
  const { temperatures: temperaturesByNode } = useTemperatureTelemetryBatch(telemetryNodeIds)

  // Tela de carregamento enquanto verifica clientes ativos
  if (authLoading || !user || user.role !== 'admin_master' || isLoadingClients) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-200 border-t-[#1e5fa8]" />
        <p className="text-sm text-slate-500">Carregando clientes ativos...</p>
      </div>
    )
  }

  // Estatísticas gerais
  const nodes = Object.values(clientNodes).flat()
  const filteredNodes = selectedClientId === 'all'
    ? nodes
    : clientNodes[selectedClientId] ?? []

  const totalClients = activeClients.length
  const totalDevices = filteredNodes.length
  const totalCTNC = filteredNodes.filter(n => n.node_type === 'CTN-C').length
  const totalCTNR = filteredNodes.filter(n => n.node_type === 'CTN-R').length
  
  // Contar ACs das salas filtradas
  const totalACs = filteredRooms.reduce((sum, room) => sum + room.acCount, 0)
  const totalRooms = filteredRooms.length

  // Dispositivos online/offline/never connected based on heartbeat status
  const nodesOnline = filteredNodes.filter((n) => {
    const s = nodeStatuses[n.node_id]
    if (!s || s.lastHeartbeat === null) return false
    return s.online && (s.secondsSinceLastHeartbeat == null || s.secondsSinceLastHeartbeat <= 120)
  }).length
  const nodesOffline = filteredNodes.length - nodesOnline

  // Temperaturas por estado (crítico, atenção, correto)
  const roomsCritical = filteredRooms.filter(r => {
    const temp = temperaturesByNode[r.deviceId]?.temperatura ?? deviceStates[r.id]?.currentTemp
    if (temp === undefined || temp === null) return false
    return getIndicatorStatus(temp, r.idealTempMin, r.idealTempMax) === 'critical'
  }).length

  const roomsWarning = filteredRooms.filter(r => {
    const temp = temperaturesByNode[r.deviceId]?.temperatura ?? deviceStates[r.id]?.currentTemp
    if (temp === undefined || temp === null) return false
    return getIndicatorStatus(temp, r.idealTempMin, r.idealTempMax) === 'warning'
  }).length

  const roomsCorrect = filteredRooms.filter(r => {
    const temp = temperaturesByNode[r.deviceId]?.temperatura ?? deviceStates[r.id]?.currentTemp
    if (temp === undefined || temp === null) return false
    return getIndicatorStatus(temp, r.idealTempMin, r.idealTempMax) === 'ok'
  }).length

  // Consumo de energia - SOMA do consumo de todos os clientes/salas filtrados
  // Cálculo baseado em: número de ACs * consumo médio por AC * dias do mês * horas por dia
  const [year, month] = selectedMonth.split('-').map(Number)
  
  const daysInMonth = new Date(year, month, 0).getDate()
  
  // Consumo estimado: 1.2 kWh por AC por hora
  const currentMonthConsumption = totalACs * 1.2 * daysInMonth * 24 // kWh total do mês
  
  // Calcular mês anterior
  const lastMonthDate = new Date(year, month - 2, 1) // -2 porque month é 1-indexed
  const lastMonthYear = lastMonthDate.getFullYear()
  const lastMonthMonth = lastMonthDate.getMonth() + 1
  const daysInLastMonth = new Date(lastMonthYear, lastMonthMonth, 0).getDate()
  
  // Consumo do mês anterior (mesmo cálculo, mas com dias do mês anterior)
  const lastMonthConsumption = totalACs * 1.2 * daysInLastMonth * 24
  
  const consumptionDiff = lastMonthConsumption > 0 
    ? ((currentMonthConsumption - lastMonthConsumption) / lastMonthConsumption) * 100 
    : 0
  const isConsumptionDown = consumptionDiff < 0
  
  // Lista de clientes para o filtro
  const clientIds = activeClients.map((client) => client.id)

  return (
    <main className="min-h-screen px-4 sm:px-6 py-6 sm:py-8 pb-16 bg-white">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#0f2744' }}>
              Visão Geral
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">Estatísticas de todos os clientes ativos</p>
          </div>
          
          {/* Filtro de Cliente */}
          {clientIds.length > 0 && (
            <select
              value={selectedClientId}
              onChange={e => setSelectedClientId(e.target.value)}
              className="px-4 py-2 rounded-xl text-sm outline-none cursor-pointer"
              style={{ background: 'white', border: '1px solid #e2e8f0', color: '#0f2744' }}
              aria-label="Filtrar por cliente"
            >
              <option value="all">Todos os clientes ativos</option>
              {clientIds.map(clientId => (
                <option key={clientId} value={clientId}>
                  {getClientName(clientId)}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Cards superiores */}
        <div className={selectedClientId === 'all' ? 'grid grid-cols-2 sm:grid-cols-4 gap-4' : 'grid grid-cols-1 sm:grid-cols-3 gap-4'}>
          {selectedClientId === 'all' && (
            <StatCard 
              label="Clientes Ativos" 
              value={String(totalClients)} 
              sub="cadastrados" 
              color="#7c3aed"
            />
          )}
          <StatCard 
            label="Dispositivos" 
            value={String(totalDevices)} 
            sub={`${totalCTNC} CTNC · ${totalCTNR} CTNR`}
            color="#1e5fa8"
          />
          <StatCard 
            label="Ares Condicionados" 
            value={String(totalACs)} 
            sub="no sistema"
            color="#0ea5a0"
          />
          <StatCard 
            label="Salas" 
            value={String(totalRooms)} 
            sub="cadastradas"
            color="#10c98f"
          />
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Gráfico Online/Offline */}
          <div className="rounded-2xl p-6" style={{ background: 'white', border: '1px solid #e8edf5' }}>
            <h2 className="font-semibold mb-4" style={{ color: '#0f2744' }}>
              Status dos Dispositivos
            </h2>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium" style={{ color: '#10c98f' }}>Online</span>
                  <span className="text-sm font-bold" style={{ color: '#10c98f' }}>{nodesOnline}</span>
                </div>
                <div className="h-8 rounded-lg overflow-hidden" style={{ background: '#f1f5f9' }}>
                  <div 
                    className="h-full transition-all duration-500"
                    style={{ 
                      width: `${totalDevices > 0 ? (nodesOnline / totalDevices) * 100 : 0}%`,
                      background: 'linear-gradient(90deg, #10c98f, #0ea5a0)'
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium" style={{ color: '#ef4444' }}>Offline</span>
                  <span className="text-sm font-bold" style={{ color: '#ef4444' }}>{nodesOffline}</span>
                </div>
                <div className="h-8 rounded-lg overflow-hidden" style={{ background: '#f1f5f9' }}>
                  <div 
                    className="h-full transition-all duration-500"
                    style={{ 
                      width: `${totalDevices > 0 ? (nodesOffline / totalDevices) * 100 : 0}%`,
                      background: 'linear-gradient(90deg, #ef4444, #dc2626)'
                    }}
                  />
                </div>
              </div>

            </div>
          </div>

          {/* Gráfico Temperaturas */}
          <div className="rounded-2xl p-6" style={{ background: 'white', border: '1px solid #e8edf5' }}>
            <h2 className="font-semibold mb-4" style={{ color: '#0f2744' }}>
              Temperaturas das Salas
            </h2>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium" style={{ color: '#ef4444' }}>Crítico</span>
                  <span className="text-sm font-bold" style={{ color: '#ef4444' }}>{roomsCritical}</span>
                </div>
                <div className="h-8 rounded-lg overflow-hidden" style={{ background: '#f1f5f9' }}>
                  <div 
                    className="h-full transition-all duration-500"
                    style={{ 
                      width: `${totalRooms > 0 ? (roomsCritical / totalRooms) * 100 : 0}%`,
                      background: 'linear-gradient(90deg, #ef4444, #dc2626)'
                    }}
                  />
                </div>
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium" style={{ color: '#f59e0b' }}>Atenção</span>
                  <span className="text-sm font-bold" style={{ color: '#f59e0b' }}>{roomsWarning}</span>
                </div>
                <div className="h-8 rounded-lg overflow-hidden" style={{ background: '#f1f5f9' }}>
                  <div 
                    className="h-full transition-all duration-500"
                    style={{ 
                      width: `${totalRooms > 0 ? (roomsWarning / totalRooms) * 100 : 0}%`,
                      background: 'linear-gradient(90deg, #f59e0b, #d97706)'
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium" style={{ color: '#10c98f' }}>Correto</span>
                  <span className="text-sm font-bold" style={{ color: '#10c98f' }}>{roomsCorrect}</span>
                </div>
                <div className="h-8 rounded-lg overflow-hidden" style={{ background: '#f1f5f9' }}>
                  <div 
                    className="h-full transition-all duration-500"
                    style={{ 
                      width: `${totalRooms > 0 ? (roomsCorrect / totalRooms) * 100 : 0}%`,
                      background: 'linear-gradient(90deg, #10c98f, #0ea5a0)'
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card de Consumo de Energia */}
        <div className="rounded-2xl p-6" style={{ background: 'white', border: '1px solid #e8edf5' }}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <h2 className="font-semibold" style={{ color: '#0f2744' }}>
              Consumo de Energia
            </h2>
            <input
              type="month"
              value={selectedMonth}
              max={new Date().toISOString().slice(0, 7)}
              onChange={e => setSelectedMonth(e.target.value)}
              className="px-4 py-2 rounded-xl text-sm outline-none cursor-pointer"
              style={{ background: '#f0f4f8', border: '1px solid #e2e8f0', color: '#0f2744' }}
              aria-label="Selecionar mês"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-slate-400 mb-2">Consumo total do mês</p>
              <p className="text-4xl font-bold mb-1" style={{ color: '#0f2744' }}>
                {currentMonthConsumption.toFixed(0)} kWh
              </p>
              <div className="flex items-center gap-2 mt-3">
                <div 
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
                  style={{ 
                    background: isConsumptionDown ? 'rgba(16,201,143,0.1)' : 'rgba(239,68,68,0.1)',
                    color: isConsumptionDown ? '#10c98f' : '#ef4444'
                  }}
                >
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    className="w-3 h-3" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor" 
                    strokeWidth={2}
                    style={{ transform: isConsumptionDown ? 'rotate(0deg)' : 'rotate(180deg)' }}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                  {Math.abs(consumptionDiff).toFixed(1)}%
                </div>
                <span className="text-xs text-slate-400">vs. mês anterior</span>
              </div>
            </div>

            <div className="flex items-center justify-center">
              <div className="text-center">
                <p className="text-sm text-slate-400 mb-2">Mês anterior</p>
                <p className="text-2xl font-bold" style={{ color: '#64748b' }}>
                  {lastMonthConsumption.toFixed(0)} kWh
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </main>
  )
}
