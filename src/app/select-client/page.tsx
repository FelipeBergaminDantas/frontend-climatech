'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import type { Client } from '@/types'
import { getAllClients, toggleClientStatus, deleteClient } from '@/services/clientService'
import { getClienteById } from '@/services/apiService'
import AddClientModal from '@/components/clients/AddClientModal'
import type { ClienteResponse } from '@/services/apiService'

export default function SelectClientPage() {
  const router = useRouter()
  const { user, updateUser, isLoading: authLoading, logout } = useAuth()
  const [clients, setClients] = useState<Client[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingCliente, setEditingCliente] = useState<ClienteResponse | null>(null)
  const [error, setError] = useState('')
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [pendingToggleClientId, setPendingToggleClientId] = useState<string | null>(null)
  const [pendingDeleteClientId, setPendingDeleteClientId] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [isActionLoading, setIsActionLoading] = useState(false)

  useEffect(() => {
    // Apenas admin_master pode acessar esta página
    if (!authLoading && (!user || user.role !== 'admin_master')) {
      router.push('/dashboard')
      return
    }

    // Se já tem cliente selecionado, redireciona
    if (user?.selectedClientId) {
      router.push('/dashboard')
      return
    }

    const loadClients = async () => {
      try {
        setIsLoading(true)
        const data = await getAllClients()
        setClients(data)
      } catch (error) {
        console.error('Erro ao carregar clientes:', error)
        setError('Erro ao carregar clientes. Tente novamente.')
      } finally {
        setIsLoading(false)
      }
    }

    loadClients()
  }, [user, authLoading, router])

  const handleSelectClient = (clientId: string) => {
    updateUser({ selectedClientId: clientId })
    router.push('/dashboard')
  }

  const handleViewAllClients = () => {
    router.push('/clients')
  }

  const handleReturnToLogin = () => {
    logout()
    router.replace('/login')
  }

  const handleCreateSuccess = async () => {
    try {
      const data = await getAllClients()
      setClients(data)
    } catch (error) {
      console.error('Erro ao recarregar clientes:', error)
      setError('Erro ao recarregar clientes depois da criação.')
    }
  }

  const handleEditClick = async (e: React.MouseEvent, clientId: string) => {
    e.stopPropagation()
    try {
      const clienteData = await getClienteById(clientId)
      if (!clienteData) {
        setError('Cliente não encontrado para edição.')
        return
      }
      setEditingCliente(clienteData)
      setShowEditModal(true)
    } catch (error) {
      console.error('Erro ao carregar cliente para edição:', error)
      setError('Erro ao carregar cliente para edição.')
    }
  }

  const handleToggleStatus = (e: React.MouseEvent, clientId: string) => {
    e.stopPropagation()
    setPendingToggleClientId(clientId)
    setShowPasswordModal(true)
  }

  const handleDeleteClick = async (e: React.MouseEvent, clientId: string) => {
    e.stopPropagation()
    setPendingDeleteClientId(clientId)
    setShowPasswordModal(true)
  }

  const handleConfirmAction = async () => {
    if (!user?.email || isActionLoading) return

    setIsActionLoading(true)
    setError('')

    try {
      if (pendingToggleClientId) {
        const updated = await toggleClientStatus(pendingToggleClientId, user.email, password)
        setClients(clients.map(c => c.id === pendingToggleClientId ? updated : c))
      } else if (pendingDeleteClientId) {
        await deleteClient(pendingDeleteClientId)
        setClients(clients.filter(c => c.id !== pendingDeleteClientId))
      }

      setShowPasswordModal(false)
      setPendingToggleClientId(null)
      setPendingDeleteClientId(null)
      setPassword('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao executar ação')
    } finally {
      setIsActionLoading(false)
    }
  }

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1e5fa8] to-[#0ea5a0]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent" />
      </div>
    )
  }

  const activeClients = clients.filter(c => c.isActive)

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[#1e5fa8] to-[#0ea5a0]">
      <div className="w-full max-w-3xl">
        <div className="text-center mb-8 relative">
          <button
            onClick={handleReturnToLogin}
            className="absolute right-0 top-0 mt-2 mr-2 px-3 py-1.5 rounded-md text-sm text-white/90 hover:text-white"
          >
            Voltar ao Login
          </button>
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Selecione um Cliente</h1>
          <p className="text-white/80">Olá, {user?.name}. Escolha qual cliente você deseja acessar</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 rounded-xl px-4 py-3 text-sm bg-red-500/10 text-white border border-red-500/20">
            {error}
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden mb-4">
          {/* Ver Todos os Clientes - Sempre no topo */}
          <button
            onClick={handleViewAllClients}
            className="w-full px-6 py-5 text-left transition-all hover:bg-gradient-to-r hover:from-purple-50 hover:to-blue-50 active:bg-slate-100 flex items-center justify-between gap-4 group border-b-2 border-purple-200"
          >
            <div className="flex items-center gap-4 flex-1">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 text-white font-bold text-lg shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-bold text-lg truncate" style={{ color: '#0f2744' }}>
                  Ver Todos os Clientes Ativos
                </h2>
                <p className="text-sm text-slate-400 mt-0.5">
                  Visão geral com estatísticas de todos os clientes ativos
                </p>
              </div>
            </div>
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="w-6 h-6 text-slate-300 group-hover:text-purple-500 transition-colors" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor" 
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* Lista de Clientes */}
          {activeClients.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-slate-500 mb-4">Nenhum cliente ativo cadastrado.</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-white transition-all"
                style={{ background: 'linear-gradient(135deg, #1e5fa8, #2d7dd2)' }}
              >
                + Criar Primeiro Cliente
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {activeClients.map((client) => (
                <div
                  key={client.id}
                  className="w-full px-6 py-5 transition-all hover:bg-slate-50 active:bg-slate-100 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between group cursor-pointer"
                  onClick={() => handleSelectClient(client.id)}
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-[#1e5fa8] to-[#0ea5a0] text-white font-bold text-lg shrink-0">
                      {client.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="font-bold text-lg truncate" style={{ color: '#0f2744' }}>
                        {client.name}
                      </h2>
                      <p className="text-sm text-slate-400 mt-0.5">
                        Cliente desde {new Date(client.createdAt).toLocaleDateString('pt-BR', { 
                          day: '2-digit', 
                          month: 'long', 
                          year: 'numeric' 
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <button
                      onClick={(e) => handleToggleStatus(e, client.id)}
                      disabled={isActionLoading}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}
                      title="Desativar cliente"
                    >
                      Desativar
                    </button>
                    <button
                      onClick={(e) => handleEditClick(e, client.id)}
                      disabled={isActionLoading}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ background: 'rgba(59,130,246,0.1)', color: '#2563eb' }}
                      title="Editar cliente"
                    >
                      Editar
                    </button>
                    <button
                      onClick={(e) => handleDeleteClick(e, client.id)}
                      disabled={isActionLoading}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ background: 'rgba(248,113,113,0.12)', color: '#dc2626' }}
                      title="Excluir cliente"
                    >
                      Excluir
                    </button>
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      className="w-6 h-6 text-slate-300 group-hover:text-[#0ea5a0] transition-colors" 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor" 
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Botão Criar Cliente */}
        <div className="text-center">
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 rounded-xl text-sm font-medium bg-white/10 backdrop-blur-sm text-white border border-white/20 hover:bg-white/20 transition-all"
          >
            + Criar Novo Cliente
          </button>
        </div>

        {/* Clientes Inativos - Agora podem ser acessados */}
        {clients.some(c => !c.isActive) && (
          <div className="mt-4 bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
              <p className="text-sm font-semibold" style={{ color: '#0f2744' }}>Clientes Inativos</p>
              <p className="text-xs text-slate-500 mt-0.5">Você pode acessar os dados, mas não ativar o modo ao vivo</p>
            </div>
            <div className="divide-y divide-slate-100">
              {clients.filter(c => !c.isActive).map(client => (
                <div
                  key={client.id}
                  className="w-full px-6 py-5 transition-all hover:bg-slate-50 active:bg-slate-100 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between group cursor-pointer"
                  onClick={() => handleSelectClient(client.id)}
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-slate-400 to-slate-500 text-white font-bold text-lg shrink-0">
                      {client.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h2 className="font-bold text-lg truncate" style={{ color: '#0f2744' }}>
                          {client.name}
                        </h2>
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">
                          Inativo
                        </span>
                      </div>
                      <p className="text-sm text-slate-400 mt-0.5">
                        Acesso somente leitura • Modo ao vivo desabilitado
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <button
                      onClick={(e) => handleToggleStatus(e, client.id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all hover:shadow-md"
                      style={{ background: 'rgba(16,201,143,0.1)', color: '#10c98f' }}
                      title="Reativar cliente"
                    >
                      Reativar
                    </button>
                    <button
                      onClick={(e) => handleEditClick(e, client.id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all hover:shadow-md"
                      style={{ background: 'rgba(59,130,246,0.1)', color: '#2563eb' }}
                      title="Editar cliente"
                    >
                      Editar
                    </button>
                    <button
                      onClick={(e) => handleDeleteClick(e, client.id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all hover:shadow-md"
                      style={{ background: 'rgba(248,113,113,0.12)', color: '#dc2626' }}
                      title="Excluir cliente"
                    >
                      Excluir
                    </button>
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      className="w-6 h-6 text-slate-300 group-hover:text-slate-500 transition-colors" 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor" 
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="text-center mt-6">
          <p className="text-white/60 text-sm">
            Você está logado como <span className="font-semibold text-white">Administrador Master</span>
          </p>
        </div>
      </div>

      <AddClientModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleCreateSuccess}
      />

      <AddClientModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false)
          setEditingCliente(null)
        }}
        onSuccess={async () => {
          await handleCreateSuccess()
          setShowEditModal(false)
          setEditingCliente(null)
        }}
        mode="edit"
        initialData={editingCliente}
      />

      {/* Password Confirmation Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => !isActionLoading && setShowPasswordModal(false)}>
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-sm"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold mb-4" style={{ color: '#0f2744' }}>
              {pendingDeleteClientId ? 'Confirmar Exclusão' : 'Confirmar Ação'}
            </h2>
            <p className="text-sm text-slate-500 mb-4">
              {pendingDeleteClientId
                ? 'Digite sua senha para confirmar a exclusão permanente do cliente. Esta ação é irreversível.'
                : 'Digite sua senha para confirmar a alteração de status do cliente.'
              }
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#0f2744' }}>
                  Senha
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Digite sua senha"
                  disabled={isActionLoading}
                  className="w-full px-4 py-2.5 rounded-xl text-sm outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', color: '#0f2744' }}
                  autoFocus
                  onKeyDown={e => e.key === 'Enter' && !isActionLoading && handleConfirmAction()}
                />
              </div>
              
              {error && (
                <p className="text-sm text-red-500">{error}</p>
              )}
              
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordModal(false)
                    setPendingToggleClientId(null)
                    setPendingDeleteClientId(null)
                    setPassword('')
                    setError('')
                  }}
                  disabled={isActionLoading}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: '#f1f5f9', color: '#64748b' }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmAction}
                  disabled={isActionLoading}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg, #1e5fa8, #2d7dd2)' }}
                >
                  {isActionLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                      Processando...
                    </>
                  ) : (
                    'Confirmar'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
