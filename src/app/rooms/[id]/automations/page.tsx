'use client'

import { use, useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { useRooms } from '@/contexts/RoomsContext'
import { useAutomations } from '@/contexts/AutomationsContext'
import { RuleList } from '@/components/automation/RuleList'
import { RuleForm } from '@/components/automation/RuleForm'
import { Modal } from '@/components/ui/Modal'
import { getAllClients } from '@/services/clientService'
import type { AutomationRule, Client } from '@/types'

interface PageProps {
  params: Promise<{ id: string }>
}

export default function AutomationsPage({ params }: PageProps) {
  const { id } = use(params)
  const { isAuthenticated, isLoading: authLoading, user } = useAuth()
  const { rooms } = useRooms()
  const { getRulesForRoom, toggleRule, createRule, updateRule, deleteRule, loadRules, loadStates } = useAutomations()

  const room = rooms.find(r => r.id === id)
  const isAdmin = user?.role === 'admin_master' || user?.role === 'admin_client'

  const rules = getRulesForRoom(id)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<AutomationRule | undefined>()
  const [clients, setClients] = useState<Client[]>([])
  const [selectedClientForRoom, setSelectedClientForRoom] = useState<string>('')
  
  const isOverviewMode = user?.role === 'admin_master' && !user?.selectedClientId

  useEffect(() => {
    if (!id) return

    async function loadRoomData() {
      await loadRules(id)
      await loadStates(id)
    }

    loadRoomData()
  }, [id, loadRules, loadStates])
  
  useEffect(() => {
    if (isOverviewMode) {
      getAllClients().then(setClients)
    }
  }, [isOverviewMode])

  if (!isAuthenticated && !authLoading) return null

  type AutomationRuleFormData = Omit<AutomationRule, 'id' | 'createdAt' | 'updatedAt' | 'runtimeStatus'>

  async function handleSave(data: AutomationRuleFormData) {
    if (editingRule) {
      await updateRule(editingRule.id, {
        nomeAutomacao: data.nomeAutomacao,
        flSomenteDiaUtil: data.flSomenteDiaUtil,
        flSegunda: data.flSegunda,
        flTerca: data.flTerca,
        flQuarta: data.flQuarta,
        flQuinta: data.flQuinta,
        flSexta: data.flSexta,
        flSabado: data.flSabado,
        flDomingo: data.flDomingo,
        horaInicio: data.horaInicio,
        horaFim: data.horaFim,
        prioridade: data.prioridade,
        flAtivo: data.flAtivo,
      })
    } else {
      await createRule({
        clientId: data.clientId,
        roomId: data.roomId,
        nomeAutomacao: data.nomeAutomacao,
        flSomenteDiaUtil: data.flSomenteDiaUtil,
        flSegunda: data.flSegunda,
        flTerca: data.flTerca,
        flQuarta: data.flQuarta,
        flQuinta: data.flQuinta,
        flSexta: data.flSexta,
        flSabado: data.flSabado,
        flDomingo: data.flDomingo,
        horaInicio: data.horaInicio,
        horaFim: data.horaFim,
        prioridade: data.prioridade,
      })
    }
    setIsFormOpen(false)
    setEditingRule(undefined)
  }

  function handleToggle(ruleId: string) {
    toggleRule(ruleId)
  }

  function handleEdit(rule: AutomationRule) {
    if (!isAdmin) return
    setEditingRule(rule)
    setIsFormOpen(true)
  }

  function handleDelete(ruleId: string) {
    if (!isAdmin) return
    deleteRule(ruleId)
  }

  return (
    <main className="min-h-screen bg-white px-6 py-8">
      <div className="max-w-3xl mx-auto space-y-6">

        <Link
          href={`/rooms/${id}`}
          className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Voltar para {room?.name ?? 'a sala'}
        </Link>

        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#0f2744' }}>
              Automações{room ? ` — ${room.name}` : ''}
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">{rules.length} regra{rules.length !== 1 ? 's' : ''} configurada{rules.length !== 1 ? 's' : ''}</p>
          </div>
          {isAdmin && (
            <button
              onClick={() => { setEditingRule(undefined); setIsFormOpen(true) }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white"
              style={{ background: 'linear-gradient(135deg, #1e5fa8, #2d7dd2)' }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Nova regra
            </button>
          )}
        </div>

        {!isAdmin && (
          <div className="rounded-xl px-4 py-3 text-sm" style={{ background: 'rgba(30,95,168,0.06)', color: '#1e5fa8', border: '1px solid rgba(30,95,168,0.15)' }}>
            Apenas administradores podem criar ou editar regras de automação.
          </div>
        )}

        <RuleList
          rules={rules}
          onToggle={isAdmin ? handleToggle : () => {}}
          onEdit={isAdmin ? handleEdit : () => {}}
          onDelete={isAdmin ? handleDelete : () => {}}
        />

        {isAdmin && (
          <Modal
            isOpen={isFormOpen}
            onClose={() => { setIsFormOpen(false); setEditingRule(undefined); setSelectedClientForRoom('') }}
            title={editingRule ? 'Editar regra' : 'Nova regra'}
          >
            {/* Filtro de cliente (apenas no modo overview e ao criar nova regra) */}
            {isOverviewMode && !editingRule && (
              <div className="mb-4 rounded-xl p-4" style={{ background: 'rgba(30,95,168,0.05)', border: '1px solid rgba(30,95,168,0.15)' }}>
                <label className="block text-sm font-semibold mb-2" style={{ color: '#1e5fa8' }}>
                  Selecione o Cliente *
                </label>
                <select
                  value={selectedClientForRoom}
                  onChange={e => setSelectedClientForRoom(e.target.value)}
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
                  A automação será criada para uma sala deste cliente
                </p>
              </div>
            )}
            
            <RuleForm
              roomId={id}
              rooms={isOverviewMode && selectedClientForRoom ? rooms.filter(r => r.clientId === selectedClientForRoom) : rooms}
              onSave={handleSave}
              onCancel={() => { setIsFormOpen(false); setEditingRule(undefined); setSelectedClientForRoom('') }}
              initialRule={editingRule}
            />
          </Modal>
        )}
      </div>
    </main>
  )
}
