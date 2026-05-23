'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useRooms } from '@/contexts/RoomsContext'
import { RoomList } from '@/components/rooms/RoomList'
import { RoomForm } from '@/components/rooms/RoomForm'
import { DeleteRoomModal } from '@/components/rooms/DeleteRoomModal'
import { Modal } from '@/components/ui/Modal'
import { PasswordConfirmModal } from '@/components/ui/PasswordConfirmModal'
import { getClientName } from '@/services/clientService'
import { verifyCurrentPassword } from '@/services/userService'
import { useClientStatus } from '@/hooks/useClientStatus'
import type { Room } from '@/types'

export default function RoomsPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading: authLoading, user } = useAuth()
  const { rooms, deviceStates, deleteRoom, updateRoom, isLoading: roomsLoading } = useRooms()
  const { isClientActive, canCreate } = useClientStatus()

  const [pendingDelete, setPendingDelete] = useState<Room | null>(null)
  const [editingRoom, setEditingRoom] = useState<Room | null>(null)
  const [roomActionPayload, setRoomActionPayload] = useState<{
    type: 'edit' | 'delete'
    room: Room
    draft?: Room
  } | null>(null)
  const [roomSaveError, setRoomSaveError] = useState<string | null>(null)
  const [filterClient, setFilterClient] = useState<string>('all')

  const isAdmin = user?.role === 'admin_master' || user?.role === 'admin_client'
  const isAllClientsView = user?.role === 'admin_master' && !user?.selectedClientId

  // Filtrar salas por cliente quando há filtro ativo
  const filteredRooms = isAllClientsView && filterClient !== 'all'
    ? rooms.filter(r => r.clientId === filterClient)
    : rooms

  // Obter lista única de clientIds
  const clientIds = useMemo(() => {
    return Array.from(new Set(rooms.map(r => r.clientId)))
  }, [rooms])

  // Agrupar salas por cliente
  const roomsByClient = useMemo(() => {
    if (!isAllClientsView) return {}
    
    const grouped: Record<string, typeof rooms> = {}
    rooms.forEach(room => {
      if (!grouped[room.clientId]) {
        grouped[room.clientId] = []
      }
      grouped[room.clientId].push(room)
    })
    return grouped
  }, [isAllClientsView, rooms])

  if (!isAuthenticated && !authLoading) return null

  if (authLoading || roomsLoading) {
    return (
      <main className="min-h-screen px-4 sm:px-6 py-6 sm:py-8 pb-16 bg-white">
        <div className="max-w-4xl mx-auto py-12">
          <p className="text-sm text-slate-500">Carregando salas...</p>
        </div>
      </main>
    )
  }

  async function handleEditSave(roomData: Room) {
    if (!editingRoom) return
    setRoomSaveError(null)
    setRoomActionPayload({ type: 'edit', room: editingRoom, draft: roomData })
  }

  async function handleDeleteConfirm() {
    if (!pendingDelete) return
    setRoomActionPayload({ type: 'delete', room: pendingDelete })
    setPendingDelete(null)
  }

  async function confirmRoomAction(password: string) {
    if (!roomActionPayload) return

    await verifyCurrentPassword(password)

    const payload = roomActionPayload

    try {
      if (payload.type === 'edit' && payload.draft) {
        const roomData = payload.draft
        await updateRoom(payload.room.id, {
          name: roomData.name,
          deviceId: roomData.deviceId,
          location: roomData.location,
          idealTempMin: roomData.idealTempMin,
          idealTempMax: roomData.idealTempMax,
          targetTemp: roomData.targetTemp,
        })
        setRoomSaveError(null)
        setEditingRoom(null)
        setRoomActionPayload(null)
        return
      }

      if (payload.type === 'delete') {
        await deleteRoom(payload.room.id)
        setRoomActionPayload(null)
        return
      }
    } catch (error) {
      console.error('Falha na ação da sala:', error)
      const message = error instanceof Error
        ? error.message
        : 'Falha ao confirmar a ação. Tente novamente.'

      if (payload.type === 'edit') {
        setRoomSaveError(message)
        setRoomActionPayload(null)
        return
      }

      throw error instanceof Error ? error : new Error(message)
    }
  }

  return (
    <main className="min-h-screen px-4 sm:px-6 py-6 sm:py-8 pb-16 bg-white">
      <div className="max-w-4xl mx-auto space-y-6">

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#0f2744' }}>
              Salas
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">{filteredRooms.length} sala{filteredRooms.length !== 1 ? 's' : ''} cadastrada{filteredRooms.length !== 1 ? 's' : ''}</p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Filtro de cliente (apenas na visão de todos os clientes) */}
            {isAllClientsView && clientIds.length > 0 && (
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
            
            {isAdmin && (
              <button
                onClick={() => router.push('/rooms/new')}
                disabled={!canCreate}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: canCreate ? 'linear-gradient(135deg, #1e5fa8, #2d7dd2)' : '#94a3b8' }}
                title={!canCreate ? 'Cliente inativo não pode criar novas salas' : ''}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Nova sala
              </button>
            )}
          </div>
        </div>

        {/* Aviso de cliente inativo */}
        {!isClientActive && !isAllClientsView && (
          <div className="rounded-xl p-4 flex items-start gap-3" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#f59e0b' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-medium" style={{ color: '#f59e0b' }}>Cliente Inativo - Modo Somente Leitura</p>
              <p className="text-xs mt-1" style={{ color: '#92400e' }}>
                Este cliente está inativo. Você pode visualizar os dados, mas não pode criar, editar ou excluir salas.
              </p>
            </div>
          </div>
        )}

        {isAllClientsView && filterClient === 'all' ? (
          // Visão de todos os clientes: agrupar por cliente
          <div className="space-y-6">
            {Object.entries(roomsByClient).map(([clientId, clientRooms]) => {
              const clientOnline = clientRooms.filter(r => deviceStates[r.id]?.isOn).length
              
              return (
                <div key={clientId}>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-semibold" style={{ color: '#1e5fa8' }}>
                      {getClientName(clientId)}
                    </h2>
                    <span className="text-xs text-slate-400">
                      {clientOnline} de {clientRooms.length} ACs ligados
                    </span>
                  </div>
                  
                  <RoomList
                    rooms={clientRooms}
                    deviceStates={deviceStates}
                    onEdit={isAdmin && canCreate ? r => setEditingRoom(r) : () => {}}
                    onDelete={isAdmin && canCreate ? id => { const r = clientRooms.find(x => x.id === id); if (r) setPendingDelete(r) } : () => {}}
                    isAdmin={isAdmin && canCreate}
                  />
                </div>
              )
            })}
          </div>
        ) : (
          // Modo normal ou filtrado: lista simples
          <RoomList
            rooms={filteredRooms}
            deviceStates={deviceStates}
            onEdit={isAdmin && canCreate ? r => setEditingRoom(r) : () => {}}
            onDelete={isAdmin && canCreate ? id => { const r = filteredRooms.find(x => x.id === id); if (r) setPendingDelete(r) } : () => {}}
            isAdmin={isAdmin && canCreate}
          />
        )}

        {editingRoom && (
          <Modal
            isOpen={!!editingRoom}
            onClose={() => {
              setEditingRoom(null)
              setRoomSaveError(null)
            }}
            title="Editar sala"
          >
            <RoomForm
              userId={user?.id ?? editingRoom.userId}
              initialRoom={editingRoom}
              serverError={roomSaveError}
              onSave={handleEditSave}
              onCancel={() => {
                setEditingRoom(null)
                setRoomSaveError(null)
              }}
            />
          </Modal>
        )}

        {pendingDelete && (
          <DeleteRoomModal
            isOpen={!!pendingDelete}
            roomName={pendingDelete.name}
            onConfirm={handleDeleteConfirm}
            onCancel={() => setPendingDelete(null)}
          />
        )}

        {roomActionPayload && (
          <PasswordConfirmModal
            title={roomActionPayload.type === 'delete' ? 'Confirmar exclusão de sala' : 'Confirmar edição de sala'}
            message={roomActionPayload.type === 'delete'
              ? `Digite sua senha para confirmar a exclusão permanente da sala "${roomActionPayload.room.name}".`
              : `Digite sua senha para confirmar as alterações da sala "${roomActionPayload.room.name}".`}
            onConfirm={confirmRoomAction}
            onClose={() => setRoomActionPayload(null)}
            confirmButtonText={roomActionPayload.type === 'delete' ? 'Excluir' : 'Salvar'}
            isDangerous={roomActionPayload.type === 'delete'}
          />
        )}
      </div>
    </main>
  )
}

