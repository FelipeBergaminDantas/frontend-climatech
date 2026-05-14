'use client'

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import type { Room, DeviceState } from '@/types'
import { getRooms, createRoom, updateRoom, deleteRoom } from '@/services/roomService'
import { getDeviceState, sendCommand } from '@/services/deviceService'
import type { DeviceCommand } from '@/services/deviceService'
import { OWNER_ID } from '@/config/constants'
import { useAuth } from './AuthContext'
import { getAllClients } from '@/services/clientService'

interface RoomsContextValue {
  rooms: Room[]
  deviceStates: Record<string, DeviceState>
  isLoading: boolean
  addRoom: (data: Omit<Room, 'id' | 'createdAt'>) => Room
  updateRoom: (id: string, data: Partial<Omit<Room, 'id' | 'userId' | 'createdAt'>>) => Room
  deleteRoom: (id: string) => void
  updateDeviceState: (roomId: string, cmd: DeviceCommand) => Promise<DeviceState>
  syncDeviceState: (roomId: string, state: DeviceState) => void
}

export const RoomsContext = createContext<RoomsContextValue | null>(null)

export function RoomsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [allRooms, setAllRooms] = useState<Room[]>([])
  const [deviceStates, setDeviceStates] = useState<Record<string, DeviceState>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [activeClientIds, setActiveClientIds] = useState<string[]>([])
  const [isLoadingClients, setIsLoadingClients] = useState(true)

  // Carregar clientes ativos
  useEffect(() => {
    setIsLoadingClients(true)
    getAllClients().then(clients => {
      const activeIds = clients.filter(c => c.isActive).map(c => c.id)
      setActiveClientIds(activeIds)
      setIsLoadingClients(false)
    })
  }, [])

  // Filtrar salas baseado no cliente do usuário
  const rooms = allRooms.filter(room => {
    if (!user) return false
    
    // Admin Master vê salas baseado no cliente selecionado
    if (user.role === 'admin_master') {
      // Sem cliente selecionado = Visão de todos os clientes - mostra apenas salas de clientes ativos
      if (!user.selectedClientId) {
        // Se ainda está carregando clientes, não mostra nada
        if (isLoadingClients) return false
        return activeClientIds.includes(room.clientId)
      }
      // Cliente específico selecionado - mostra mesmo se inativo (para poder acessar dados históricos)
      return room.clientId === user.selectedClientId
    }
    
    // Admin Cliente e Usuário veem apenas salas do seu cliente
    return room.clientId === user.clientId
  })

  useEffect(() => {
    const initialRooms = getRooms(OWNER_ID)
    setAllRooms(initialRooms)

    const states: Record<string, DeviceState> = {}
    for (const room of initialRooms) {
      try {
        states[room.id] = getDeviceState(room.id)
      } catch {
        // device state not found — skip
      }
    }
    setDeviceStates(states)
    setIsLoading(false)
  }, [])

  const addRoom = useCallback((data: Omit<Room, 'id' | 'createdAt'>): Room => {
    const newRoom = createRoom(data)
    setAllRooms((prev) => [...prev, newRoom])
    return newRoom
  }, [])

  const handleUpdateRoom = useCallback((
    id: string,
    data: Partial<Omit<Room, 'id' | 'userId' | 'createdAt'>>
  ): Room => {
    const updated = updateRoom(id, data)
    setAllRooms((prev) => prev.map((r) => (r.id === id ? updated : r)))
    return updated
  }, [])

  const handleDeleteRoom = useCallback((id: string): void => {
    deleteRoom(id)
    setAllRooms((prev) => prev.filter((r) => r.id !== id))
    setDeviceStates((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }, [])

  const updateDeviceState = useCallback(async (roomId: string, cmd: DeviceCommand): Promise<DeviceState> => {
    const updated = await sendCommand(roomId, cmd)
    setDeviceStates((prev) => ({ ...prev, [roomId]: updated }))
    return updated
  }, [])

  const syncDeviceState = useCallback((roomId: string, state: DeviceState): void => {
    setDeviceStates((prev) => ({ ...prev, [roomId]: state }))
  }, [])

  return (
    <RoomsContext.Provider
      value={{
        rooms,
        deviceStates,
        isLoading: isLoading || (user?.role === 'admin_master' && !user?.selectedClientId && isLoadingClients),
        addRoom,
        updateRoom: handleUpdateRoom,
        deleteRoom: handleDeleteRoom,
        updateDeviceState,
        syncDeviceState,
      }}
    >
      {children}
    </RoomsContext.Provider>
  )
}

export function useRooms(): RoomsContextValue {
  const ctx = useContext(RoomsContext)
  if (!ctx) {
    throw new Error('useRooms must be used within a RoomsProvider')
  }
  return ctx
}
