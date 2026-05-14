'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useRooms } from '@/contexts/RoomsContext'
import { useAuth } from '@/contexts/AuthContext'
import { getNodes } from '@/services/nodeService'
import { getIndicatorStatus } from '@/utils/validators'
import { getClientName } from '@/services/clientService'

const modeLabel: Record<string, string> = {
  cool: 'Refrigerar', fan: 'Ventilador', dry: 'Desumidificar', heat: 'Aquecer', auto: 'Automático',
}

export default function AcTempsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { rooms, deviceStates } = useRooms()
  const nodes = useMemo(() => getNodes(), [])
  const isAdmin = user?.role === 'admin_master' || user?.role === 'admin_client'
  const isOverviewMode = user?.role === 'admin_master' && !user?.selectedClientId
  
  const [filterClient, setFilterClient] = useState<string>('all')

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

  return (
    <main className="min-h-screen px-4 sm:px-6 py-6 sm:py-8 pb-16 bg-white">
      <div className="max-w-4xl mx-auto space-y-6">

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#0f2744' }}>
              {isOverviewMode ? 'Temperatura por AC - Visão Geral' : 'Temperatura por AC'}
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">Estado de cada unidade de ar-condicionado por sala</p>
          </div>
          
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

        {isOverviewMode && filterClient === 'all' ? (
          // Modo overview: agrupar por cliente
          <div className="space-y-6">
            {Object.entries(roomsByClient).map(([clientId, clientRooms]) => (
              <div key={clientId}>
                <h2 className="text-sm font-semibold mb-4" style={{ color: '#1e5fa8' }}>
                  {getClientName(clientId)}
                </h2>
                
                <div className="space-y-4">
                  {clientRooms.map(room => {
                    const state = deviceStates[room.id]
                    const ctncNodes = nodes.filter(n => n.roomId === room.id && n.type === 'CTNC')
                    const status = state ? getIndicatorStatus(state.currentTemp, state.targetTemp) : 'ok'
                    const statusColor = { ok: '#10c98f', warning: '#f59e0b', critical: '#ef4444' }[status]

                    return (
                      <div key={room.id} className="rounded-2xl overflow-hidden" style={{ border: '1px solid #e8edf5' }}>
                        <div className="flex items-center justify-between px-5 py-4" style={{ background: '#f8fafc', borderBottom: '1px solid #e8edf5' }}>
                          <div>
                            <p className="font-semibold text-sm" style={{ color: '#0f2744' }}>{room.name}</p>
                            {room.location && <p className="text-xs text-slate-400 mt-0.5">{room.location}</p>}
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full"
                              style={{ background: `${statusColor}18`, color: statusColor }}>
                              <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusColor }} />
                              {state ? `${state.currentTemp}°C` : '—'}
                            </span>
                            <button
                              onClick={() => router.push(`/rooms/${room.id}`)}
                              className="text-xs px-3 py-1.5 rounded-xl font-medium transition-all"
                              style={{ background: 'white', color: '#1e5fa8', border: '1px solid #e2e8f0' }}
                            >
                              Ver sala
                            </button>
                          </div>
                        </div>

                        <div className="divide-y divide-slate-50">
                          {ctncNodes.map(node => (
                            <div key={node.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-3.5">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0"
                                  style={{ background: 'rgba(30,95,168,0.08)', color: '#1e5fa8' }}>
                                  {node.acIndex}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-medium" style={{ color: '#0f2744' }}>
                                    AC #{node.acIndex}
                                  </p>
                                  <p className="text-xs font-mono text-slate-400 truncate">{node.id}</p>
                                </div>
                              </div>
                              <div className="flex flex-wrap items-center gap-2 text-sm pl-11 sm:pl-0">
                                {state ? (
                                  <>
                                    <div className="text-right">
                                      <p className="font-bold text-base" style={{ color: '#0f2744' }}>{state.currentTemp}°C</p>
                                      <p className="text-xs text-slate-400">atual</p>
                                    </div>
                                    <div className="text-right">
                                      <p className="font-semibold text-base" style={{ color: '#1e5fa8' }}>{state.targetTemp}°C</p>
                                      <p className="text-xs text-slate-400">alvo</p>
                                    </div>
                                    <span className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full"
                                      style={state.isOn
                                        ? { background: 'rgba(16,201,143,0.1)', color: '#10c98f' }
                                        : { background: '#f1f5f9', color: '#94a3b8' }}>
                                      <span className="w-1.5 h-1.5 rounded-full"
                                        style={{ background: state.isOn ? '#10c98f' : '#94a3b8' }} />
                                      {state.isOn ? modeLabel[state.mode] : 'Desligado'}
                                    </span>
                                  </>
                                ) : (
                                  <span className="text-xs text-slate-400">Sem dados</span>
                                )}
                                {isAdmin && (
                                  <button
                                    onClick={() => router.push(`/rooms/${room.id}`)}
                                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl font-medium transition-all"
                                    style={{ background: 'rgba(30,95,168,0.08)', color: '#1e5fa8', border: '1px solid rgba(30,95,168,0.15)' }}
                                    title={`Editar configurações do AC #${node.acIndex}`}
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                    Editar
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}

                          {ctncNodes.length === 0 && (
                            <div className="px-5 py-4 text-xs text-slate-400">
                              Nenhum CTN-C cadastrado para esta sala.
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          // Modo normal ou filtrado: lista simples
          <>
            {filteredRooms.map(room => {
              const state = deviceStates[room.id]
              const ctncNodes = nodes.filter(n => n.roomId === room.id && n.type === 'CTNC')
              const status = state ? getIndicatorStatus(state.currentTemp, state.targetTemp) : 'ok'
              const statusColor = { ok: '#10c98f', warning: '#f59e0b', critical: '#ef4444' }[status]

              return (
                <div key={room.id} className="rounded-2xl overflow-hidden" style={{ border: '1px solid #e8edf5' }}>
                  <div className="flex items-center justify-between px-5 py-4" style={{ background: '#f8fafc', borderBottom: '1px solid #e8edf5' }}>
                    <div>
                      <p className="font-semibold text-sm" style={{ color: '#0f2744' }}>{room.name}</p>
                      {room.location && <p className="text-xs text-slate-400 mt-0.5">{room.location}</p>}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full"
                        style={{ background: `${statusColor}18`, color: statusColor }}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusColor }} />
                        {state ? `${state.currentTemp}°C` : '—'}
                      </span>
                      <button
                        onClick={() => router.push(`/rooms/${room.id}`)}
                        className="text-xs px-3 py-1.5 rounded-xl font-medium transition-all"
                        style={{ background: 'white', color: '#1e5fa8', border: '1px solid #e2e8f0' }}
                      >
                        Ver sala
                      </button>
                    </div>
                  </div>

                  <div className="divide-y divide-slate-50">
                    {ctncNodes.map(node => (
                      <div key={node.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0"
                            style={{ background: 'rgba(30,95,168,0.08)', color: '#1e5fa8' }}>
                            {node.acIndex}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium" style={{ color: '#0f2744' }}>
                              AC #{node.acIndex}
                            </p>
                            <p className="text-xs font-mono text-slate-400 truncate">{node.id}</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-sm pl-11 sm:pl-0">
                          {state ? (
                            <>
                              <div className="text-right">
                                <p className="font-bold text-base" style={{ color: '#0f2744' }}>{state.currentTemp}°C</p>
                                <p className="text-xs text-slate-400">atual</p>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold text-base" style={{ color: '#1e5fa8' }}>{state.targetTemp}°C</p>
                                <p className="text-xs text-slate-400">alvo</p>
                              </div>
                              <span className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full"
                                style={state.isOn
                                  ? { background: 'rgba(16,201,143,0.1)', color: '#10c98f' }
                                  : { background: '#f1f5f9', color: '#94a3b8' }}>
                                <span className="w-1.5 h-1.5 rounded-full"
                                  style={{ background: state.isOn ? '#10c98f' : '#94a3b8' }} />
                                {state.isOn ? modeLabel[state.mode] : 'Desligado'}
                              </span>
                            </>
                          ) : (
                            <span className="text-xs text-slate-400">Sem dados</span>
                          )}
                          {isAdmin && (
                            <button
                              onClick={() => router.push(`/rooms/${room.id}`)}
                              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl font-medium transition-all"
                              style={{ background: 'rgba(30,95,168,0.08)', color: '#1e5fa8', border: '1px solid rgba(30,95,168,0.15)' }}
                              title={`Editar configurações do AC #${node.acIndex}`}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              Editar
                            </button>
                          )}
                        </div>
                      </div>
                    ))}

                    {ctncNodes.length === 0 && (
                      <div className="px-5 py-4 text-xs text-slate-400">
                        Nenhum CTN-C cadastrado para esta sala.
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </>
        )}
      </div>
    </main>
  )
}

