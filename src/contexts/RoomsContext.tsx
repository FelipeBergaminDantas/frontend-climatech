'use client'

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import type { Room, DeviceState } from '@/types'
import {
  getRooms as fetchRoomsByClient,
  createRoom as createRoomBackend,
  updateRoom as updateRoomBackend,
  deleteRoom as deleteRoomBackend,
} from '@/services/salaService'
import { getDeviceState, sendCommand } from '@/services/deviceService'
import type { DeviceCommand } from '@/services/deviceService'
import { useAuth } from './AuthContext'
import { getAllClients } from '@/services/clientService'

interface RoomsContextValue {
  rooms: Room[]
  deviceStates: Record<string, DeviceState>
  isLoading: boolean
  addRoom: (data: Omit<Room, 'id' | 'createdAt'>) => Promise<Room>
  updateRoom: (id: string, data: Partial<Omit<Room, 'id' | 'userId' | 'createdAt'>>) => Promise<Room>
  patchRoomLocally: (id: string, data: Partial<Omit<Room, 'id' | 'userId' | 'createdAt'>>) => void
  deleteRoom: (id: string) => Promise<void>
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

  useEffect(() => {
    async function loadActiveClientIds() {
      setIsLoadingClients(true)
      try {
        const clients = await getAllClients()
        setActiveClientIds(clients.filter((client) => client.isActive).map((client) => client.id))
      } catch (error) {
        console.error('Failed to load active clients:', error)
      } finally {
        setIsLoadingClients(false)
      }
    }

    loadActiveClientIds()
  }, [])

  useEffect(() => {
    async function loadRooms() {
      if (!user) {
        setAllRooms([])
        setIsLoading(false)
        return
      }

      setIsLoading(true)

      try {
        let clientIds: string[] = []

        if (user.role === 'admin_master') {
          clientIds = user.selectedClientId ? [user.selectedClientId] : activeClientIds
        } else if (user.clientId) {
          clientIds = [user.clientId]
        }

        if (clientIds.length === 0) {
          setAllRooms([])
          return
        }

        const roomsByClient = await Promise.all(clientIds.map((clientId) => fetchRoomsByClient(clientId)))
        setAllRooms(roomsByClient.flat())
      } catch (error) {
        console.error('Failed to load salas:', error)
        setAllRooms([])
      } finally {
        setIsLoading(false)
      }
    }

    loadRooms()
  }, [user, activeClientIds])

  useEffect(() => {
    const states: Record<string, DeviceState> = {}
    for (const room of allRooms) {
      try {
        states[room.id] = getDeviceState(room.id)
      } catch {
        // device state not found — skip
      }
    }
    setDeviceStates(states)
  }, [allRooms])

  const addRoom = useCallback(async (data: Omit<Room, 'id' | 'createdAt'>): Promise<Room> => {
    const created = await createRoomBackend(data)
    setAllRooms((prev) => [...prev, created])
    return created
  }, [])

  const handleUpdateRoom = useCallback(async (
    id: string,
    data: Partial<Omit<Room, 'id' | 'userId' | 'createdAt'>>
  ): Promise<Room> => {
    const updated = await updateRoomBackend(id, data)
    setAllRooms((prev) => prev.map((room) => (room.id === id ? updated : room)))
    return updated
  }, [])

  const handleDeleteRoom = useCallback(async (id: string): Promise<void> => {
    await deleteRoomBackend(id)
    setAllRooms((prev) => prev.filter((room) => room.id !== id))
    setDeviceStates((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }, [])

  const patchRoomLocally = useCallback(
    (id: string, data: Partial<Omit<Room, 'id' | 'userId' | 'createdAt'>>) => {
      setAllRooms((prev) => prev.map((room) => (room.id === id ? { ...room, ...data } : room)))
    },
    []
  )

  const updateDeviceState = useCallback(async (roomId: string, cmd: DeviceCommand): Promise<DeviceState> => {
    const updated = await sendCommand(roomId, cmd)
    setDeviceStates((prev) => ({ ...prev, [roomId]: updated }))
    return updated
  }, [])

  const syncDeviceState = useCallback((roomId: string, state: DeviceState): void => {
    setDeviceStates((prev) => ({ ...prev, [roomId]: state }))
  }, [])

  const visibleRooms = allRooms.filter((room) => {
    if (!user) return false

    if (user.role === 'admin_master') {
      if (!user.selectedClientId) {
        if (isLoadingClients) return false
        return activeClientIds.includes(room.clientId)
      }
      return room.clientId === user.selectedClientId
    }

    return room.clientId === user.clientId
  })

  return (
    <RoomsContext.Provider
      value={{
        rooms: visibleRooms,
        deviceStates,
        isLoading: isLoading || (user?.role === 'admin_master' && !user?.selectedClientId && isLoadingClients),
        addRoom,
        updateRoom: handleUpdateRoom,
        patchRoomLocally,
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
