'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import type { Room, DeviceState } from '@/types'

interface RoomListProps {
  rooms: Room[]
  deviceStates: Record<string, DeviceState>
  onEdit: (room: Room) => void
  onDelete: (id: string) => void
  isAdmin?: boolean
}

type SortKey = 'name' | 'temperature'

export function RoomList({ rooms, deviceStates, onEdit, onDelete, isAdmin = false }: RoomListProps) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [locationFilter, setLocationFilter] = useState('')

  const locations = useMemo(() => {
    const locs = rooms.map(r => r.location).filter(Boolean) as string[]
    return [...new Set(locs)].sort()
  }, [rooms])

  const filtered = useMemo(
    () =>
      rooms
        .filter(r => r.name.toLowerCase().includes(search.toLowerCase()))
        .filter(r => !locationFilter || r.location === locationFilter)
        .sort((a, b) => {
          if (sortKey === 'name') return a.name.localeCompare(b.name)
          const tA = deviceStates[a.id]?.currentTemp ?? -Infinity
          const tB = deviceStates[b.id]?.currentTemp ?? -Infinity
          return tA - tB
        }),
    [rooms, deviceStates, search, sortKey, locationFilter]
  )

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="Buscar por nome..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 px-4 py-2.5 rounded-xl text-sm outline-none"
          style={{ background: 'white', border: '1px solid #e2e8f0', color: '#0f2744' }}
          aria-label="Buscar sala por nome"
        />
        {locations.length > 0 && (
          <select
            value={locationFilter}
            onChange={e => setLocationFilter(e.target.value)}
            aria-label="Filtrar por localização"
            className="px-3 py-2.5 rounded-xl text-sm outline-none cursor-pointer"
            style={{ background: 'white', border: '1px solid #e2e8f0', color: '#64748b' }}
          >
            <option value="">Todos os andares</option>
            {locations.map(loc => (
              <option key={loc} value={loc}>{loc}</option>
            ))}
          </select>
        )}
        <select
          value={sortKey}
          onChange={e => setSortKey(e.target.value as SortKey)}
          aria-label="Ordenar salas"
          className="px-3 py-2.5 rounded-xl text-sm outline-none cursor-pointer"
          style={{ background: 'white', border: '1px solid #e2e8f0', color: '#64748b' }}
        >
          <option value="name">Nome (A–Z)</option>
          <option value="temperature">Temperatura atual</option>
        </select>
      </div>

      {filtered.length === 0 && (
        <div className="rounded-2xl p-8 text-center" style={{ background: 'white', border: '1px solid #e8edf5' }}>
          <p className="text-sm text-slate-400">
            {rooms.length === 0 ? 'Nenhuma sala cadastrada.' : 'Nenhuma sala encontrada.'}
          </p>
        </div>
      )}

      <ul className="space-y-3">
        {filtered.map(room => {
          const state = deviceStates[room.id]
          return (
            <li key={room.id}>
              <div
                className="rounded-2xl p-5 flex items-center justify-between gap-4 cursor-pointer transition-all hover:shadow-sm"
                style={{ background: 'white', border: '1px solid #e8edf5' }}
                onClick={() => router.push(`/rooms/${room.id}`)}
                role="button"
                tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && router.push(`/rooms/${room.id}`)}
              >
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm truncate" style={{ color: '#0f2744' }}>{room.name}</p>
                  {room.location && <p className="text-xs text-slate-400 mt-0.5">{room.location}</p>}
                  <div className="flex flex-wrap gap-4 mt-2 text-xs text-slate-500">
                    <span>
                      Temp:{' '}
                      <span className="font-semibold" style={{ color: '#1e5fa8' }}>
                        {state ? `${state.currentTemp}°C` : '—'}
                      </span>
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: state?.isOn ? '#10c98f' : '#94a3b8' }} />
                      {state ? (state.isOn ? 'Ligado' : 'Desligado') : '—'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                  {isAdmin && (
                    <>
                      <button
                        onClick={() => onEdit(room)}
                        aria-label={`Editar sala ${room.name}`}
                        className="p-2 rounded-lg transition-all hover:bg-slate-50"
                        style={{ color: '#64748b' }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => onDelete(room.id)}
                        aria-label={`Excluir sala ${room.name}`}
                        className="p-2 rounded-lg transition-all hover:bg-red-50"
                        style={{ color: '#ef4444' }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
