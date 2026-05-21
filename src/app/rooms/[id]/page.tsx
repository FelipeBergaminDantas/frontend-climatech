'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { useRooms } from '@/contexts/RoomsContext'
import { DeviceControls } from '@/components/rooms/DeviceControls'
import { ChartSection } from '@/components/monitoring/ChartSection'
import { ConnectionAlert } from '@/components/monitoring/ConnectionAlert'
import { getIndicatorStatus } from '@/utils/validators'
import type { DeviceState } from '@/types'

interface PageProps {
  params: Promise<{ id: string }>
}

export default function RoomDetailPage({ params }: PageProps) {
  const { id } = use(params)
  const router = useRouter()
  const { isAuthenticated, isLoading: authLoading, user } = useAuth()
  const { rooms, deviceStates, syncDeviceState } = useRooms()

  const room = rooms.find(r => r.id === id)
  const [localState, setLocalState] = useState<DeviceState | undefined>(deviceStates[id])
  const [isConnected] = useState(true)
  const isAdmin = user?.role === 'admin_master' || user?.role === 'admin_client'

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.replace('/login')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isAuthenticated])

  useEffect(() => { setLocalState(deviceStates[id]) }, [deviceStates, id])

  if (!isAuthenticated && !authLoading) return null

  function handleDeviceUpdate(updated: DeviceState) {
    setLocalState(updated)
    // Sync the updated state directly into RoomsContext so dashboard reflects it
    syncDeviceState(id, updated)
  }

  if (!room) {
    return (
      <main className="min-h-screen px-6 py-8" style={{ background: '#f0f4f8' }}>
        <div className="max-w-3xl mx-auto">
          <p className="text-slate-500">Sala não encontrada.</p>
          <Link href="/dashboard" className="text-sm mt-2 inline-block" style={{ color: '#1e5fa8' }}>← Voltar ao Dashboard</Link>
        </div>
      </main>
    )
  }

  const status = localState
    ? getIndicatorStatus(localState.currentTemp, room.idealTempMin, room.idealTempMax)
    : 'ok'
  const statusColor = { ok: '#10c98f', warning: '#f59e0b', critical: '#ef4444' }[status]
  const statusLabel = { ok: 'Normal', warning: 'Atenção', critical: 'Crítico' }[status]

  return (
    <main className="min-h-screen px-6 py-8 bg-white">
      <div className="max-w-3xl mx-auto space-y-5">

        {/* Back */}
        <button
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Voltar
        </button>

        {/* Room header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#0f2744' }}>{room.name}</h1>
            {room.location && <p className="text-sm text-slate-400 mt-0.5">{room.location}</p>}
            <p className="text-xs text-slate-400 mt-1">Ideal: {room.idealTempMin}°C – {room.idealTempMax}°C</p>
            <p className="text-xs text-slate-400 mt-0.5">
              Alvo: {room.targetTemp !== undefined && room.targetTemp !== null ? `${room.targetTemp}°C` : 'Não definido'}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              {room.acCount} AC{room.acCount !== 1 ? 's' : ''} instalado{room.acCount !== 1 ? 's' : ''}
            </p>
          </div>
          <span className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full mt-1"
            style={{ background: `${statusColor}18`, color: statusColor, border: `1px solid ${statusColor}30` }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusColor }} />
            {statusLabel}
          </span>
        </div>

        <ConnectionAlert isConnected={isConnected} />

        {/* Device controls */}
        {localState ? (
          <div className="rounded-2xl p-6" style={{ background: 'white', border: '1px solid #e8edf5' }}>
            <h2 className="font-semibold text-sm mb-4" style={{ color: '#0f2744' }}>Controle do dispositivo</h2>
            <DeviceControls roomId={id} state={localState} onUpdate={handleDeviceUpdate} isAdmin={isAdmin} />
          </div>
        ) : (
          <p className="text-sm text-slate-400">Estado do dispositivo indisponível.</p>
        )}

        {/* Temperature chart */}
        <div className="rounded-2xl p-6" style={{ background: 'white', border: '1px solid #e8edf5' }}>
          <ChartSection
            roomId={id}
            roomName={room.name}
            idealMin={room.idealTempMin}
            idealMax={room.idealTempMax}
          />
        </div>

        {/* Automations link */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href={`/rooms/${id}/automations`}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
            style={{ background: 'white', color: '#1e5fa8', border: '1px solid #e2e8f0' }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 2a4 4 0 014 4v1h1a2 2 0 012 2v2a2 2 0 01-2 2h-1v1a4 4 0 01-8 0v-1H7a2 2 0 01-2-2V9a2 2 0 012-2h1V6a4 4 0 014-4z" />
              <circle cx="9" cy="10" r="1" fill="currentColor" stroke="none" />
              <circle cx="15" cy="10" r="1" fill="currentColor" stroke="none" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 14s1 1.5 3 1.5 3-1.5 3-1.5" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 20v2M16 20v2M12 18v1" />
            </svg>
            Ver automações desta sala
          </Link>
          <Link
            href={`/ac-temps`}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
            style={{ background: 'white', color: '#0ea5a0', border: '1px solid #e2e8f0' }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
              <line x1="12" y1="2" x2="12" y2="22" strokeLinecap="round" />
              <line x1="2" y1="12" x2="22" y2="12" strokeLinecap="round" />
              <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" strokeLinecap="round" />
              <line x1="19.07" y1="4.93" x2="4.93" y2="19.07" strokeLinecap="round" />
              <circle cx="12" cy="12" r="2" />
              <circle cx="12" cy="2" r="1" fill="currentColor" stroke="none" />
              <circle cx="12" cy="22" r="1" fill="currentColor" stroke="none" />
              <circle cx="2" cy="12" r="1" fill="currentColor" stroke="none" />
              <circle cx="22" cy="12" r="1" fill="currentColor" stroke="none" />
              <circle cx="4.93" cy="4.93" r="1" fill="currentColor" stroke="none" />
              <circle cx="19.07" cy="19.07" r="1" fill="currentColor" stroke="none" />
              <circle cx="19.07" cy="4.93" r="1" fill="currentColor" stroke="none" />
              <circle cx="4.93" cy="19.07" r="1" fill="currentColor" stroke="none" />
            </svg>
            Configurações dos ACs
          </Link>
        </div>
      </div>
    </main>
  )
}
