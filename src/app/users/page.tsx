'use client'

import { useState, useMemo, useEffect, type ReactNode } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useClient } from '@/contexts/ClientContext'
import { useClientStatus } from '@/hooks/useClientStatus'
import * as userService from '@/services/userService'
import { validateEmail } from '@/utils/validators'
import { getClientName } from '@/services/clientService'
import type { User, UserRole } from '@/types'

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl p-5 sm:p-6 space-y-4" style={{ background: 'white', border: '1px solid #e8edf5' }}>
      <h2 className="font-semibold" style={{ color: '#0f2744' }}>{title}</h2>
      {children}
    </section>
  )
}

interface PasswordConfirmModalProps {
  title: string
  message: string
  onConfirm: (password: string) => Promise<void>
  onClose: () => void
  confirmButtonText?: string
  isDangerous?: boolean
}

function PasswordConfirmModal({
  title,
  message,
  onConfirm,
  onClose,
  confirmButtonText = 'Confirmar',
  isDangerous = false,
}: PasswordConfirmModalProps) {
  const [pwd, setPwd] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)
    try {
      await onConfirm(pwd)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao verificar senha.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-sm rounded-2xl p-6 space-y-4" style={{ background: 'white' }}>
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg" style={{ color: '#0f2744' }}>{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600" aria-label="Fechar">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p className="text-sm text-slate-500">{message}</p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium" style={{ color: '#0f2744' }}>Sua senha</label>
            <input
              type="password"
              value={pwd}
              onChange={e => setPwd(e.target.value)}
              placeholder="Digite sua senha"
              autoFocus
              className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: '#f8fafc', border: error ? '1.5px solid #fca5a5' : '1.5px solid #e2e8f0', color: '#0f2744' }}
              required
            />
            {error && <p className="text-xs text-red-500">{error}</p>}
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={{ background: '#f0f4f8', color: '#64748b', border: '1px solid #e2e8f0' }}>
              Cancelar
            </button>
            <button type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white transition-all disabled:opacity-50"
              style={{ background: isDangerous ? 'linear-gradient(135deg, #ef4444, #dc2626)' : 'linear-gradient(135deg, #1e5fa8, #2d7dd2)' }}>
              {isSubmitting ? 'Confirmando…' : confirmButtonText}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

interface RoleConfirmModalProps {
  target: User
  onConfirm: (password: string) => Promise<void>
  onClose: () => void
}

function RoleConfirmModal({ target, onConfirm, onClose }: RoleConfirmModalProps) {
  const [pwd, setPwd] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)
    try {
      await onConfirm(pwd)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao verificar senha.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-sm rounded-2xl p-6 space-y-4" style={{ background: 'white' }}>
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg" style={{ color: '#0f2744' }}>Confirmar alteração de perfil</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600" aria-label="Fechar">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p className="text-sm text-slate-500">Digite sua senha para confirmar a mudança de perfil de <strong>{target.name}</strong>.</p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium" style={{ color: '#0f2744' }}>Sua senha</label>
            <input
              type="password"
              value={pwd}
              onChange={e => setPwd(e.target.value)}
              placeholder="Digite sua senha"
              autoFocus
              className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: '#f8fafc', border: error ? '1.5px solid #fca5a5' : '1.5px solid #e2e8f0', color: '#0f2744' }}
              required
            />
            {error && <p className="text-xs text-red-500">{error}</p>}
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={{ background: '#f0f4f8', color: '#64748b', border: '1px solid #e2e8f0' }}>
              Cancelar
            </button>
            <button type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white transition-all disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #1e5fa8, #2d7dd2)' }}>
              {isSubmitting ? 'Confirmando…' : 'Confirmar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function UsersPage() {
  const { user: currentUser } = useAuth()
  const { availableClients } = useClient()
  const { isClientActive, canCreate } = useClientStatus()
  const isAdmin = currentUser?.role === 'admin_master' || currentUser?.role === 'admin_client'
  const isOverviewMode = currentUser?.role === 'admin_master' && !currentUser?.selectedClientId

  const [allUsers, setAllUsers] = useState<User[]>([])
  const [roleTarget, setRoleTarget] = useState<User | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [filterClient, setFilterClient] = useState<string>('all')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<UserRole>('user')
  const [selectedClientId, setSelectedClientId] = useState<string>('')
  const [formError, setFormError] = useState('')
  const [formSuccess, setFormSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingUsers, setLoadingUsers] = useState(false)

  useEffect(() => {
    async function loadUsers() {
      setLoadingUsers(true)
      try {
        const users = await userService.getUsers()
        setAllUsers(users)
      } catch (err) {
        console.error(err)
      } finally {
        setLoadingUsers(false)
      }
    }

    if (isAdmin) {
      loadUsers()
    }
  }, [isAdmin])

  useEffect(() => {
    if (role === 'admin_master') {
      setSelectedClientId('')
    } else if (currentUser?.role === 'admin_master' && availableClients.length > 0 && !selectedClientId) {
      setSelectedClientId(availableClients[0].id)
    }
  }, [role, currentUser?.role, availableClients, selectedClientId])

  const users = allUsers.filter(u => {
    if (currentUser?.role === 'admin_master') {
      if (!currentUser.selectedClientId) {
        return true
      }
      return u.clientId === currentUser.selectedClientId || u.role === 'admin_master'
    }
    if (currentUser?.role === 'admin_client') {
      return u.clientId === currentUser.clientId && u.role !== 'admin_master'
    }
    return u.id === currentUser?.id
  })

  const filteredUsers = isOverviewMode && filterClient !== 'all'
    ? users.filter(u => u.clientId === filterClient || u.role === 'admin_master')
    : users

  const clientIds = useMemo(() => {
    return Array.from(new Set(users.filter(u => u.clientId).map(u => u.clientId!)))
  }, [users])

  const usersByClient = useMemo(() => {
    if (!isOverviewMode) return {}

    const grouped: Record<string, typeof users> = {}
    const adminMasters = users.filter(u => u.role === 'admin_master')
    if (adminMasters.length > 0) {
      grouped['admin_masters'] = adminMasters
    }
    users.filter(u => u.clientId).forEach(user => {
      if (!grouped[user.clientId!]) {
        grouped[user.clientId!] = []
      }
      grouped[user.clientId!].push(user)
    })
    return grouped
  }, [isOverviewMode, users])

  async function refreshUsers() {
    setLoadingUsers(true)
    try {
      const users = await userService.getUsers()
      setAllUsers(users)
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingUsers(false)
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setFormError(''); setFormSuccess('')
    try { validateEmail(email) } catch { setFormError('E-mail inválido.'); return }
    if (password.length < 8) { setFormError('Senha deve ter no mínimo 8 caracteres.'); return }
    if (currentUser?.role === 'admin_master' && role !== 'admin_master' && !selectedClientId) {
      setFormError('Selecione um cliente para este usuário.')
      return
    }

    setLoading(true)
    try {
      const clientId = role !== 'admin_master'
        ? currentUser?.role === 'admin_master'
          ? selectedClientId
          : currentUser?.clientId
        : undefined

      await userService.createUser({
        name: name.trim(),
        email: email.trim(),
        password,
        role,
        clientId,
      })
      await refreshUsers()
      setName(''); setEmail(''); setPassword(''); setRole('user')
      setFormSuccess('Usuário criado com sucesso.')
      setTimeout(() => setFormSuccess(''), 3000)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erro ao criar usuário.')
    } finally {
      setLoading(false)
    }
  }

  async function handleDeleteConfirmed(password: string) {
    if (!deleteTarget) return
    setLoading(true)
    try {
      await userService.verifyCurrentPassword(password)
      await userService.deleteUser(deleteTarget.id)
      await refreshUsers()
      setDeleteTarget(null)
      setShowPasswordModal(false)
    } finally {
      setLoading(false)
    }
  }

  async function handleRoleConfirmed(password: string) {
    if (!roleTarget) return
    setLoading(true)
    try {
      await userService.verifyCurrentPassword(password)
      const newRole = roleTarget.role === 'admin_client' ? 'user' : 'admin_client'
      await userService.changeUserRole(roleTarget.id, { role: newRole })
      await refreshUsers()
      setRoleTarget(null)
    } finally {
      setLoading(false)
    }
  }

  if (!isAdmin) {
    return (
      <main className="min-h-screen px-4 sm:px-6 py-6 sm:py-8 pb-16 bg-white flex items-center justify-center">
        <div className="max-w-sm text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="#ef4444" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m0 0v2m0-2h2m-2 0H10m2-6V7m0 0a5 5 0 00-5 5v1H5a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2h-2v-1a5 5 0 00-5-5z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold" style={{ color: '#0f2744' }}>Acesso restrito</h1>
          <p className="text-sm text-slate-500">Apenas administradores podem gerenciar usuários.</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen px-4 sm:px-6 py-6 sm:py-8 pb-16 bg-white">
      {roleTarget && (
        <RoleConfirmModal
          target={roleTarget}
          onConfirm={handleRoleConfirmed}
          onClose={() => setRoleTarget(null)}
        />
      )}
      {showPasswordModal && (
        <PasswordConfirmModal
          title="Confirmar Exclusão"
          message="Digite sua senha para confirmar a exclusão permanente deste usuário. Esta ação é irreversível."
          onConfirm={handleDeleteConfirmed}
          onClose={() => setShowPasswordModal(false)}
          confirmButtonText="Excluir"
          isDangerous
        />
      )}

      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#0f2744' }}>
            {isOverviewMode ? 'Gerenciar Usuários - Visão Geral' : 'Gerenciar Usuários'}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-sm text-slate-500">{filteredUsers.length} usuário{filteredUsers.length !== 1 ? 's' : ''} cadastrado{filteredUsers.length !== 1 ? 's' : ''}</p>
            {currentUser?.role === 'admin_master' && currentUser.selectedClientId && currentUser.selectedClientId !== 'all' && (
              <>
                <span className="text-slate-300">•</span>
                <p className="text-sm font-medium" style={{ color: '#0ea5a0' }}>
                  {availableClients.find(c => c.id === currentUser.selectedClientId)?.name}
                </p>
              </>
            )}
          </div>
        </div>

        {isOverviewMode && clientIds.length > 0 && (
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium" style={{ color: '#0f2744' }}>Filtrar por cliente:</label>
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
          </div>
        )}

        <Section title="Usuários cadastrados">
          {loadingUsers ? (
            <p className="text-sm text-slate-500">Carregando usuários...</p>
          ) : isOverviewMode && filterClient === 'all' ? (
            <div className="space-y-6">
              {Object.entries(usersByClient).map(([groupKey, groupUsers]) => {
                const isAdminMasterGroup = groupKey === 'admin_masters'
                const groupName = isAdminMasterGroup
                  ? 'Administradores Master'
                  : getClientName(groupKey)

                return (
                  <div key={groupKey}>
                    <h3 className="text-sm font-semibold mb-3" style={{ color: isAdminMasterGroup ? '#7c3aed' : '#1e5fa8' }}>
                      {groupName}
                    </h3>
                    <div className="divide-y divide-slate-50">
                      {groupUsers.map(u => (
                        <div key={u.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-3 first:pt-0 last:pb-0">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
                              style={{
                                background: u.role === 'admin_master'
                                  ? 'linear-gradient(135deg, #7c3aed, #a855f7)'
                                  : u.role === 'admin_client'
                                  ? 'linear-gradient(135deg, #1e5fa8, #2d7dd2)'
                                  : 'linear-gradient(135deg, #0ea5a0, #10c98f)'
                              }}>
                              {u.name?.[0]?.toUpperCase() ?? '?'}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate" style={{ color: '#0f2744' }}>
                                {u.name}
                                {u.id === currentUser?.id && <span className="ml-2 text-xs text-slate-400">(você)</span>}
                              </p>
                              <p className="text-xs text-slate-400 truncate">{u.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 pl-12 sm:pl-0">
                            <span className="text-xs px-2.5 py-1 rounded-full font-medium"
                              style={
                                u.role === 'admin_master'
                                  ? { background: 'rgba(124,58,237,0.1)', color: '#7c3aed' }
                                  : u.role === 'admin_client'
                                  ? { background: 'rgba(30,95,168,0.1)', color: '#1e5fa8' }
                                  : { background: '#f1f5f9', color: '#64748b' }
                              }>
                              {u.role === 'admin_master' ? 'Administrador Master' : u.role === 'admin_client' ? 'Admin' : 'Usuário'}
                            </span>
                            {u.id !== currentUser?.id && !(u.role === 'admin_master' && currentUser?.role !== 'admin_master') && (
                              <>
                                {u.role !== 'admin_master' && (
                                  <button
                                    onClick={() => setRoleTarget(u)}
                                    className="text-xs px-3 py-1.5 rounded-xl font-medium transition-all"
                                    style={{ background: '#f0f4f8', color: '#64748b', border: '1px solid #e2e8f0' }}
                                    title={u.role === 'admin_client' ? 'Rebaixar para usuário' : 'Promover a admin'}
                                  >
                                    {u.role === 'admin_client' ? '↓ Usuário' : '↑ Admin'}
                                  </button>
                                )}
                                <button
                                  onClick={() => {
                                    setDeleteTarget(u)
                                    setShowPasswordModal(true)
                                  }}
                                  className="text-xs px-3 py-1.5 rounded-xl font-medium transition-all"
                                  style={{ background: '#fff1f2', color: '#ef4444', border: '1px solid #fecdd3' }}
                                >
                                  Excluir
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {filteredUsers.map(u => (
                <div key={u.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
                      style={{
                        background: u.role === 'admin_master'
                          ? 'linear-gradient(135deg, #7c3aed, #a855f7)'
                          : u.role === 'admin_client'
                          ? 'linear-gradient(135deg, #1e5fa8, #2d7dd2)'
                          : 'linear-gradient(135deg, #0ea5a0, #10c98f)'
                      }}>
                      {u.name?.[0]?.toUpperCase() ?? '?'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: '#0f2744' }}>
                        {u.name}
                        {u.id === currentUser?.id && <span className="ml-2 text-xs text-slate-400">(você)</span>}
                      </p>
                      <p className="text-xs text-slate-400 truncate">{u.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pl-12 sm:pl-0">
                    <span className="text-xs px-2.5 py-1 rounded-full font-medium"
                      style={
                        u.role === 'admin_master'
                          ? { background: 'rgba(124,58,237,0.1)', color: '#7c3aed' }
                          : u.role === 'admin_client'
                          ? { background: 'rgba(30,95,168,0.1)', color: '#1e5fa8' }
                          : { background: '#f1f5f9', color: '#64748b' }
                      }>
                      {u.role === 'admin_master' ? 'Administrador Master' : u.role === 'admin_client' ? 'Admin' : 'Usuário'}
                    </span>
                    {u.id !== currentUser?.id && !(u.role === 'admin_master' && currentUser?.role !== 'admin_master') && (
                      <>
                        {u.role !== 'admin_master' && (
                          <button
                            onClick={() => setRoleTarget(u)}
                            className="text-xs px-3 py-1.5 rounded-xl font-medium transition-all"
                            style={{ background: '#f0f4f8', color: '#64748b', border: '1px solid #e2e8f0' }}
                            title={u.role === 'admin_client' ? 'Rebaixar para usuário' : 'Promover a admin'}
                          >
                            {u.role === 'admin_client' ? '↓ Usuário' : '↑ Admin'}
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setDeleteTarget(u)
                            setShowPasswordModal(true)
                          }}
                          className="text-xs px-3 py-1.5 rounded-xl font-medium transition-all"
                          style={{ background: '#fff1f2', color: '#ef4444', border: '1px solid #fecdd3' }}
                        >
                          Excluir
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section title="Cadastrar novo usuário">
          {!canCreate && !isOverviewMode && (
            <div className="rounded-xl p-4 mb-4 flex items-start gap-3" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#f59e0b' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="flex-1">
                <p className="text-sm font-medium" style={{ color: '#f59e0b' }}>Cliente Inativo</p>
                <p className="text-xs mt-1" style={{ color: '#92400e' }}>
                  Não é possível criar novos usuários para clientes inativos.
                </p>
              </div>
            </div>
          )}
          <form onSubmit={handleCreate} className="space-y-4">
            <fieldset disabled={!canCreate && !isOverviewMode} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium" style={{ color: '#0f2744' }}>Nome</label>
                  <input value={name} onChange={e => setName(e.target.value)} required
                    placeholder="Nome completo"
                    className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                    style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', color: '#0f2744' }} />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium" style={{ color: '#0f2744' }}>E-mail</label>
                  <input value={email} onChange={e => setEmail(e.target.value)} type="email" required
                    placeholder="email@exemplo.com"
                    className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                    style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', color: '#0f2744' }} />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium" style={{ color: '#0f2744' }}>Senha</label>
                  <input value={password} onChange={e => setPassword(e.target.value)} type="password" required
                    placeholder="Mínimo 8 caracteres"
                    className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                    style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', color: '#0f2744' }} />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium" style={{ color: '#0f2744' }}>Perfil</label>
                  <select value={role} onChange={e => setRole(e.target.value as UserRole)}
                    className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                    style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', color: '#0f2744' }}>
                    <option value="user">Usuário</option>
                    <option value="admin_client">Administrador</option>
                    {currentUser?.role === 'admin_master' && (
                      <option value="admin_master">Administrador Master</option>
                    )}
                  </select>
                </div>

                {currentUser?.role === 'admin_master' && role !== 'admin_master' && availableClients.filter(c => c.isActive).length > 0 && (
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="block text-sm font-medium" style={{ color: '#0f2744' }}>
                      Cliente <span className="text-red-500">*</span>
                    </label>
                    <select 
                      value={selectedClientId} 
                      onChange={e => setSelectedClientId(e.target.value)}
                      required
                      className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                      style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', color: '#0f2744' }}
                    >
                      <option value="">Selecione um cliente</option>
                      {availableClients.filter(c => c.isActive).map(client => (
                        <option key={client.id} value={client.id}>
                          {client.name}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-slate-400">
                      Este usuário terá acesso apenas aos dados deste cliente
                    </p>
                  </div>
                )}
              </div>
            </fieldset>

            {formError && <p className="text-sm text-red-500">{formError}</p>}
            {formSuccess && <p className="text-sm" style={{ color: '#10c98f' }}>{formSuccess}</p>}

            <button type="submit" disabled={loading || (!canCreate && !isOverviewMode)}
              className="px-5 py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-50 transition-all"
              style={{ background: 'linear-gradient(135deg, #1e5fa8, #2d7dd2)' }}>
              {loading ? 'Criando…' : 'Criar usuário'}
            </button>
          </form>
        </Section>
      </div>
    </main>
  )
}
