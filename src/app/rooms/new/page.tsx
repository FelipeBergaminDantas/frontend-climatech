'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useRooms } from '@/contexts/RoomsContext'
import { RoomForm } from '@/components/rooms/RoomForm'
import { getAllClients } from '@/services/clientService'
import type { Room, Client } from '@/types'

export default function NewRoomPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading: authLoading, user } = useAuth()
  const { addRoom } = useRooms()
  const [selectedClientId, setSelectedClientId] = useState<string>('')
  const [clients, setClients] = useState<Client[]>([])

  const isAdmin = user?.role === 'admin_master' || user?.role === 'admin_client'
  const isAllClientsView = user?.role === 'admin_master' && !user?.selectedClientId
  
  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.replace('/login')
    if (!authLoading && isAuthenticated && !isAdmin) router.replace('/rooms')
    
    // Carregar clientes se estiver em modo overview
    if (isAllClientsView) {
      getAllClients().then(setClients)
    } else if (user?.role === 'admin_master' && user.selectedClientId) {
      setSelectedClientId(user.selectedClientId)
    } else if (user?.clientId) {
      setSelectedClientId(user.clientId)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isAuthenticated, isAdmin, isAllClientsView])

  if (!isAuthenticated && !authLoading) return null
  if (isAuthenticated && !isAdmin) return null

  const userId = user?.id || ''

  async function handleSave(roomData: Room) {
    const clientId = isAllClientsView ? selectedClientId : (user?.role === 'admin_master'
      ? user.selectedClientId || ''
      : user?.clientId || '')

    if (!clientId) {
      alert('Por favor, selecione um cliente antes de criar a sala.')
      return
    }

    try {
      await addRoom({
        userId,
        clientId,
        name: roomData.name,
        deviceId: roomData.deviceId,
        acCount: roomData.acCount,
        sizeM2: roomData.sizeM2,
        location: roomData.location,
        idealTempMin: roomData.idealTempMin,
        idealTempMax: roomData.idealTempMax,
        targetTemp: roomData.targetTemp,
      })
      router.replace('/rooms')
    } catch (error) {
      console.error('Failed to create room:', error)
      alert('Falha ao criar sala. Verifique os dados e tente novamente.')
    }
  }

  return (
    <main className="min-h-screen bg-white px-6 py-8">
      <div className="max-w-lg mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#0f2744' }}>Nova Sala</h1>
          <p className="text-sm text-slate-500 mt-0.5">Cadastre uma nova sala para monitoramento</p>
        </div>
        
        {/* Filtro de cliente (apenas na visão de todos os clientes) */}
        {isAllClientsView && (
          <div className="rounded-2xl p-4" style={{ background: 'rgba(30,95,168,0.05)', border: '1px solid rgba(30,95,168,0.15)' }}>
            <label className="block text-sm font-semibold mb-2" style={{ color: '#1e5fa8' }}>
              Selecione o Cliente *
            </label>
            <select
              value={selectedClientId}
              onChange={e => setSelectedClientId(e.target.value)}
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
              A sala será criada para o cliente selecionado
            </p>
          </div>
        )}
        
        <div className="rounded-2xl p-6" style={{ background: 'white', border: '1px solid #e8edf5' }}>
          <RoomForm
            userId={userId}
            onSave={handleSave}
            onCancel={() => router.push('/rooms')}
          />
        </div>
      </div>
    </main>
  )
}
