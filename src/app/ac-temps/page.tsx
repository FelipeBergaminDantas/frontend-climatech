'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useRooms } from '@/contexts/RoomsContext'
import { useAuth } from '@/contexts/AuthContext'
import { getClientName } from '@/services/clientService'
import { getAcs, getAcsBySala, updateAc, deleteAc } from '@/services/acService'
import { verifyCurrentPassword } from '@/services/userService'
import { PasswordConfirmModal } from '@/components/ui/PasswordConfirmModal'
import type { Ac } from '@/types'

export default function AcTempsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { rooms } = useRooms()
  const [acs, setAcs] = useState<Ac[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedSalaId, setSelectedSalaId] = useState<string>('all')
  const [editingAc, setEditingAc] = useState<Ac | null>(null)
  const [novoNomeAc, setNovoNomeAc] = useState<string>('')
  const [actionLoading, setActionLoading] = useState(false)
  const [pendingDeleteAcId, setPendingDeleteAcId] = useState<string | null>(null)

  const roomMap = useMemo(() => {
    return new Map(rooms.map((room) => [room.id, room.name]))
  }, [rooms])

  const salaOptions = useMemo(() => {
    return rooms.map((room) => ({ id: room.id, name: room.name }))
  }, [rooms])

  const clientIds = useMemo(() => {
    return Array.from(new Set(acs.map((ac) => ac.clientId)))
  }, [acs])

  const filteredAcs = useMemo(() => {
    if (selectedSalaId === 'all') return acs
    return acs.filter((ac) => ac.salaId === selectedSalaId)
  }, [acs, selectedSalaId])

  const isAdmin = user?.role === 'admin_master' || user?.role === 'admin_client'

  useEffect(() => {
    async function loadAcs() {
      setIsLoading(true)
      setError(null)

      try {
        const fetched = selectedSalaId === 'all'
          // Only pass clientId for admin_master users; regular users use auth context
          ? await getAcs(user?.role === 'admin_master' ? user?.clientId : undefined)
          : await getAcsBySala(selectedSalaId)

        setAcs(fetched)
      } catch (err) {
        console.error('Failed to load ACs:', err)
        setError('Não foi possível carregar os ACs. Tente novamente.')
      } finally {
        setIsLoading(false)
      }
    }

    loadAcs()
  }, [selectedSalaId, user?.clientId, user?.role])

  async function handleSaveEdit() {
    if (!editingAc) return
    if (!novoNomeAc.trim()) {
      setError('Informe um nome válido para o AC.')
      return
    }

    setActionLoading(true)
    setError(null)

    try {
      const updated = await updateAc(editingAc.id, novoNomeAc, user?.clientId, editingAc.salaId)
      setAcs((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
      setEditingAc(null)
      setNovoNomeAc('')
    } catch (err) {
      console.error('Failed to update AC:', err)
      setError('Falha ao atualizar o nome do AC. Verifique se o nome é único.')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleDelete(acId: string) {
    setError(null)
    setPendingDeleteAcId(acId)
  }

  async function confirmDeleteAc(password: string) {
    if (!pendingDeleteAcId) return

    setActionLoading(true)
    setError(null)

    try {
      await verifyCurrentPassword(password)
      const acToDelete = acs.find((ac) => ac.id === pendingDeleteAcId)
      await deleteAc(pendingDeleteAcId, user?.clientId, acToDelete?.salaId)
      setAcs((prev) => prev.filter((item) => item.id !== pendingDeleteAcId))
      setPendingDeleteAcId(null)
    } catch (err) {
      console.error('Failed to delete AC:', err)
      setError(err instanceof Error ? err.message : 'Falha ao excluir o AC. Tente novamente.')
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <main className="min-h-screen px-4 sm:px-6 py-6 sm:py-8 pb-16 bg-white">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#0f2744' }}>
              Configuração de ACs
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Gerencie os ACs cadastrados, edite apenas o nome amigável e exclua registros quando necessário.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm text-slate-600">
              Sala
              <select
                value={selectedSalaId}
                onChange={(e) => setSelectedSalaId(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-400"
              >
                <option value="all">Todas as salas</option>
                {salaOptions.map((room) => (
                  <option key={room.id} value={room.id}>{room.name}</option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-6 py-8 text-center text-slate-500">
            Carregando ACs...
          </div>
        ) : filteredAcs.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-6 py-8 text-center text-slate-500">
            Nenhum AC encontrado para a sala selecionada.
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAcs.map((ac) => (
              <div key={ac.id} className="rounded-3xl border border-slate-200 bg-white px-5 py-5 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <p className="text-base font-semibold text-slate-900 truncate">{ac.nomeAc}</p>
                    <p className="mt-1 text-sm text-slate-500">Node: <span className="font-mono text-slate-700">{ac.nodeId}</span></p>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-3 text-sm">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Sala</p>
                      <p className="mt-1 text-sm text-slate-700">{ac.salaName ?? roomMap.get(ac.salaId) ?? ac.salaId}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Cliente</p>
                      <p className="mt-1 text-sm text-slate-700">{getClientName(ac.clientId)}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Criado em</p>
                      <p className="mt-1 text-sm text-slate-700">{ac.createdAt ? new Date(ac.createdAt).toLocaleString('pt-BR') : '—'}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-700">
                    Status node: {ac.nodeStatus ?? 'indefinido'}
                  </span>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-700">
                    Tipo node: {ac.nodeType ?? 'CTN-C'}
                  </span>
                  {ac.nodeLastSeen && (
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-700">
                      Último sinal: {new Date(ac.nodeLastSeen).toLocaleString('pt-BR')}
                    </span>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingAc(ac)
                      setNovoNomeAc(ac.nomeAc)
                      setError(null)
                    }}
                    disabled={!isAdmin}
                    className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Editar nome do AC
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(ac.id)}
                    disabled={actionLoading || !isAdmin}
                    className="inline-flex items-center justify-center rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Excluir AC
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {pendingDeleteAcId && (
        <PasswordConfirmModal
          title="Confirmar exclusão de AC"
          message="Digite sua senha para confirmar a exclusão permanente deste AC. Esta ação não pode ser desfeita."
          onConfirm={confirmDeleteAc}
          onClose={() => setPendingDeleteAcId(null)}
          confirmButtonText="Excluir"
          isDangerous
        />
      )}

      {editingAc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 py-6">
          <div className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Editar nome do AC</h2>
                <p className="mt-1 text-sm text-slate-500">Somente o nome amigável pode ser alterado.</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingAc(null)}
                className="text-slate-400 transition hover:text-slate-600"
              >
                Fechar
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">Nome do AC</label>
                <input
                  value={novoNomeAc}
                  onChange={(event) => setNovoNomeAc(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  disabled={actionLoading}
                  className="inline-flex items-center justify-center rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {actionLoading ? 'Salvando...' : 'Salvar alterações'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingAc(null)}
                  className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

