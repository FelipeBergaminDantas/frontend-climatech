'use client'

import { useState, useMemo, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRooms } from '@/contexts/RoomsContext'
import { useClientStatus } from '@/hooks/useClientStatus'
import { addCtncNode, deleteNode, loadNodesForClient, updateNode } from '@/services/nodeService'
import { verifyCurrentPassword } from '@/services/userService'
import { getClientName } from '@/services/clientService'
import { Button } from '@/components/ui/Button'
import { PasswordConfirmModal } from '@/components/ui/PasswordConfirmModal'
import type { ClimaTechNode, NodeStatus, NodeType } from '@/types'

const TYPE_LABEL: Record<string, string> = { CTNR: 'CTN-R', CTNC: 'CTN-C' }

const STATUS_CONFIG: Record<NodeStatus, { label: string; color: string; bg: string; dot: string }> = {
  online:  { label: 'Online',  color: '#10c98f', bg: 'rgba(16,201,143,0.1)',  dot: '#10c98f' },
  offline: { label: 'Offline', color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', dot: '#94a3b8' },
}

// IR commands available for CTN-C learning mode
const IR_COMMANDS = ['power_on', 'power_off', 'set_setpoint'] as const
type IrCommand = typeof IR_COMMANDS[number]

type CommandState = 'idle' | 'running' | 'success' | 'error'

function formatLastSeen(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return `${diff}s atrás`
  if (diff < 3600) return `${Math.floor(diff / 60)}min atrás`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h atrás`
  return `${Math.floor(diff / 86400)}d atrás`
}

// ── Node command modal ─────────────────────────────────────────────────────────
function NodeCommandModal({ node, onClose, onUpdate, onDelete, isUpdating, isDeleting, actionError }: { node: ClimaTechNode; onClose: () => void; onUpdate: (node: ClimaTechNode, newNodeId?: string) => void; onDelete: (node: ClimaTechNode) => void; isUpdating: boolean; isDeleting: boolean; actionError: string }) {
  const cfg = STATUS_CONFIG[node.status]
  const isCTNR = node.type === 'CTNR'

  const [statusCmd, setStatusCmd] = useState<CommandState>('idle')
  const [statusResult, setStatusResult] = useState<string>('')
  const [learnCmd, setLearnCmd] = useState<CommandState>('idle')
  const [selectedIr, setSelectedIr] = useState<IrCommand>('power_on')
  const [learnResult, setLearnResult] = useState<string>('')
  const [nodeIdInput, setNodeIdInput] = useState(node.id)

  useEffect(() => {
    setNodeIdInput(node.id)
  }, [node.id])

  async function handleRequestStatus() {
    setStatusCmd('running')
    setStatusResult('')
    // Simulate MQTT command round-trip
    await new Promise(r => setTimeout(r, 1200))
    const isOnline = node.status === 'online'
    setStatusCmd(isOnline ? 'success' : 'error')
    setStatusResult(isOnline
      ? `Node respondeu: online · fw ${node.firmwareVersion} · visto agora`
      : `Node não respondeu. Último contato: ${formatLastSeen(node.lastSeen)}`)
  }

  async function handleLearnMode() {
    setLearnCmd('running')
    setLearnResult('')
    await new Promise(r => setTimeout(r, 1500))
    setLearnCmd('success')
    setLearnResult(`Modo aprendizagem ativado para "${selectedIr}". Aponte o controle remoto e pressione o botão.`)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-0 sm:px-4"
      style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl overflow-hidden" style={{ background: 'white' }}>

        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5" style={{ borderBottom: '1px solid #e8edf5' }}>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-2 py-0.5 rounded-lg"
                style={isCTNR
                  ? { background: 'rgba(30,95,168,0.1)', color: '#1e5fa8' }
                  : { background: 'rgba(14,165,160,0.1)', color: '#0ea5a0' }}>
                {TYPE_LABEL[node.type]}
              </span>
              <span className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full"
                style={{ background: cfg.bg, color: cfg.color }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.dot }} />
                {cfg.label}
              </span>
            </div>
            <p className="text-xs font-mono text-slate-500">{node.id}</p>
            <p className="text-sm font-semibold" style={{ color: '#0f2744' }}>{node.roomName} · Par {node.pairId}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors mt-1" aria-label="Fechar">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">

          {/* Command 1: Request Status */}
          <div className="rounded-xl p-4 space-y-3" style={{ background: '#f8fafc', border: '1px solid #e8edf5' }}>
            <div>
              <p className="text-sm font-semibold" style={{ color: '#0f2744' }}>Solicitar Status</p>
              <p className="text-xs text-slate-400 mt-0.5">Envia comando <span className="font-mono">status</span> via MQTT e aguarda resposta do node.</p>
            </div>
            <button
              onClick={handleRequestStatus}
              disabled={statusCmd === 'running'}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white transition-all disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #1e5fa8, #2d7dd2)' }}
            >
              {statusCmd === 'running' ? (
                <>
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3" />
                    <path d="M12 2a10 10 0 0110 10" stroke="white" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                  Aguardando…
                </>
              ) : 'Verificar status'}
            </button>
            {statusResult && (
              <p className="text-xs rounded-lg px-3 py-2"
                style={statusCmd === 'success'
                  ? { background: 'rgba(16,201,143,0.08)', color: '#0ea5a0' }
                  : { background: 'rgba(239,68,68,0.06)', color: '#ef4444' }}>
                {statusResult}
              </p>
            )}
          </div>

          {/* Command 2: Learning Mode — CTN-C only */}
          {!isCTNR && (
            <div className="rounded-xl p-4 space-y-3" style={{ background: '#f8fafc', border: '1px solid #e8edf5' }}>
              <div>
                <p className="text-sm font-semibold" style={{ color: '#0f2744' }}>Modo Aprendizagem IR</p>
                <p className="text-xs text-slate-400 mt-0.5">Habilita o CTN-C para capturar o código IR do controle remoto original.</p>
              </div>
              <div className="flex gap-2">
                <select
                  value={selectedIr}
                  onChange={e => setSelectedIr(e.target.value as IrCommand)}
                  className="flex-1 px-3 py-2 rounded-xl text-xs outline-none"
                  style={{ background: 'white', border: '1px solid #e2e8f0', color: '#0f2744' }}
                >
                  {IR_COMMANDS.map(cmd => (
                    <option key={cmd} value={cmd}>{cmd}</option>
                  ))}
                </select>
                <button
                  onClick={handleLearnMode}
                  disabled={learnCmd === 'running'}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white transition-all disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg, #0ea5a0, #10c98f)' }}
                >
                  {learnCmd === 'running' ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3" />
                        <path d="M12 2a10 10 0 0110 10" stroke="white" strokeWidth="3" strokeLinecap="round" />
                      </svg>
                      Ativando…
                    </>
                  ) : 'Ativar'}
                </button>
              </div>
              {learnResult && (
                <p className="text-xs rounded-lg px-3 py-2"
                  style={learnCmd === 'success'
                    ? { background: 'rgba(16,201,143,0.08)', color: '#0ea5a0' }
                    : { background: 'rgba(239,68,68,0.06)', color: '#ef4444' }}>
                  {learnResult}
                </p>
              )}
            </div>
          )}

          {isCTNR && (
            <p className="text-xs text-slate-400 text-center">
              Modo Aprendizagem IR disponível apenas para nodes CTN-C.
            </p>
          )}

          <div className="rounded-xl p-4 space-y-3" style={{ background: '#f8fafc', border: '1px solid #e8edf5' }}>
            <div>
              <p className="text-sm font-semibold" style={{ color: '#0f2744' }}>
                Editar node
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                Altere o identificador do node. O ID do node é o nome visível do node.
              </p>
            </div>

            <input
              value={nodeIdInput}
              onChange={(e) => setNodeIdInput(e.target.value.toUpperCase())}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none"
              placeholder={node.id}
            />
            {node.type === 'CTNC' && (
              <p className="text-xs text-slate-400 mt-2">
                AC - {node.acIndex ?? 1} · ID do CTN-C: <span className="font-mono">{node.id}</span>
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="primary"
                size="sm"
                loading={isUpdating}
                onClick={() => onUpdate(node, nodeIdInput)}
                disabled={nodeIdInput.trim().length === 0 || nodeIdInput.trim() === node.id}
              >
                {isUpdating ? 'Salvando...' : 'Salvar alterações'}
              </Button>
              {!isCTNR && (
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  loading={isDeleting}
                  onClick={() => onDelete(node)}
                >
                  Excluir CTN-C
                </Button>
              )}
            </div>
            {actionError && (
              <p className="text-xs text-red-600">{actionError}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function CreateNodeModal({
  isOpen,
  onClose,
  clientIds,
  isOverviewMode,
  selectClientId,
  onSelectClient,
  roomOptions,
  selectedRoomId,
  onSelectRoom,
  nodeId,
  onNodeIdChange,
  onCreate,
  isCreating,
  creationError,
}: {
  isOpen: boolean
  onClose: () => void
  clientIds: string[]
  isOverviewMode: boolean
  selectClientId: string
  onSelectClient: (clientId: string) => void
  roomOptions: { id: string; name: string }[]
  selectedRoomId: string
  onSelectRoom: (roomId: string) => void
  nodeId: string
  onNodeIdChange: (value: string) => void
  onCreate: () => void
  isCreating: boolean
  creationError: string
}) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: '1px solid #e8edf5' }}>
          <div>
            <h2 className="text-lg font-semibold" style={{ color: '#0f2744' }}>Adicionar novo CTN-C</h2>
            <p className="text-sm text-slate-500 mt-1">Crie um CTN-C vinculado a uma sala existente.</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors" aria-label="Fechar">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-5 px-6 py-6">
          {isOverviewMode && clientIds.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#0f2744' }}>Cliente</label>
              <select
                value={selectClientId}
                onChange={(e) => onSelectClient(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none"
              >
                <option value="all">Todos os clientes</option>
                {clientIds.map((id) => (
                  <option key={id} value={id}>{getClientName(id)}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: '#0f2744' }}>Sala</label>
            <select
              value={selectedRoomId}
              onChange={(e) => onSelectRoom(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none"
            >
              <option value="all">Selecione uma sala</option>
              {roomOptions.map((room) => (
                <option key={room.id} value={room.id}>{room.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: '#0f2744' }}>ID do CTN-C</label>
            <input
              type="text"
              value={nodeId}
              onChange={(e) => onNodeIdChange(e.target.value)}
              placeholder="CTN-C-V1-000001"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none"
            />
          </div>

          {creationError && (
            <p className="text-xs text-red-600">{creationError}</p>
          )}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onCreate}
              disabled={isCreating || roomOptions.length === 0}
              className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isCreating ? 'Criando...' : 'Criar CTN-C'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Node card ──────────────────────────────────────────────────────────────────
function NodeCard({ node, onSelect }: { node: ClimaTechNode; onSelect: (n: ClimaTechNode) => void }) {
  const cfg = STATUS_CONFIG[node.status]
  const isCTNR = node.type === 'CTNR'

  return (
    <button
      onClick={() => onSelect(node)}
      className="w-full text-left rounded-2xl p-5 space-y-3 transition-all hover:shadow-md"
      style={{ background: 'white', border: '1px solid #e8edf5' }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="shrink-0 text-xs font-bold px-2 py-0.5 rounded-lg"
            style={isCTNR
              ? { background: 'rgba(30,95,168,0.1)', color: '#1e5fa8' }
              : { background: 'rgba(14,165,160,0.1)', color: '#0ea5a0' }}>
            {TYPE_LABEL[node.type]}
          </span>
          <span className="text-xs font-mono text-slate-500 truncate">{node.id}</span>
        </div>
        <span className="shrink-0 flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full"
          style={{ background: cfg.bg, color: cfg.color }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.dot }} />
          {cfg.label}
        </span>
      </div>

      <div>
        <p className="text-sm font-semibold" style={{ color: '#0f2744' }}>
          {node.id}
        </p>
        {node.type === 'CTNC' && (
          <p className="text-xs text-slate-400 mt-0.5">
            AC - {node.acIndex ?? 1} · Sala: {node.roomName}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-100">
        <span>fw <span className="font-mono">{node.firmwareVersion}</span></span>
        <span>Visto {formatLastSeen(node.lastSeen)}</span>
      </div>
    </button>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────
type FilterStatus = 'all' | NodeStatus
type FilterType = 'all' | NodeType

function formatCtncInput(raw: string) {
  const prefix = 'CTN-C-V'
  const value = raw.toUpperCase().replace(/\s+/g, '')
  const stripped = value.startsWith(prefix)
    ? value.slice(prefix.length)
    : value.replace(/^CTN-C-?V?/i, '')

  const normalized = stripped.replace(/[^0-9-]/g, '').replace(/^-+/, '')
  if (!normalized) return prefix

  const [versionPart, restPart] = normalized.split('-', 2)
  const version = versionPart || ''
  const rest = (restPart ?? '').replace(/[^0-9]/g, '')

  if (restPart !== undefined) {
    return `${prefix}${version}${rest ? `-${rest}` : '-'}`
  }

  if (version.length === 0) {
    return prefix
  }

  if (version.length === 1) {
    return `${prefix}${version}-`
  }

  return `${prefix}${version[0]}-${version.slice(1)}`
}

export default function NodesPage() {
  const { user, isLoading: authLoading } = useAuth()
  const { rooms, patchRoomLocally, isLoading: roomsLoading } = useRooms()
  const { canCreate } = useClientStatus()
  const isAdmin = user?.role === 'admin_master' || user?.role === 'admin_client'
  const isOverviewMode = user?.role === 'admin_master' && !user?.selectedClientId

  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  const [filterType, setFilterType] = useState<FilterType>('all')
  const [filterRoom, setFilterRoom] = useState<string>('all')
  const [filterClient, setFilterClient] = useState<string>('all') // Novo filtro de cliente
  const [selectedNode, setSelectedNode] = useState<ClimaTechNode | null>(null)
  const [newNodeId, setNewNodeId] = useState('CTN-C-V')
  const [createRoomId, setCreateRoomId] = useState<string>('all')
  const [createClientId, setCreateClientId] = useState<string>('all')
  const [creationError, setCreationError] = useState<string>('')
  const [actionError, setActionError] = useState<string>('')
  const [nodes, setNodes] = useState<ClimaTechNode[]>([])
  const [isLoadingNodes, setIsLoadingNodes] = useState(true)
  const [isCreatingNode, setIsCreatingNode] = useState(false)
  const [isUpdatingNode, setIsUpdatingNode] = useState(false)
  const [isDeletingNode, setIsDeletingNode] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [pendingNodeAction, setPendingNodeAction] = useState<{
    type: 'update' | 'delete'
    node: ClimaTechNode
    newNodeId?: string
  } | null>(null)

  const roomIds = rooms.map((r) => r.id)
  const allNodes = nodes.filter((node) => roomIds.includes(node.roomId))

  // Obter lista única de clientIds
  const clientIds = useMemo(() => {
    return Array.from(new Set(rooms.map((r) => r.clientId)))
  }, [rooms])

  // Filtrar salas por cliente no modo overview
  const filteredRooms = useMemo(() => {
    if (isOverviewMode && filterClient !== 'all') {
      return rooms.filter((r) => r.clientId === filterClient)
    }
    return rooms
  }, [rooms, isOverviewMode, filterClient])

  const currentClientId = isOverviewMode
    ? ''
    : (user?.selectedClientId ?? user?.clientId ?? '')

  const clientIdsToLoad = useMemo(() => {
    if (!isOverviewMode) {
      return currentClientId ? [currentClientId] : []
    }

    if (filterClient !== 'all') {
      return [filterClient]
    }

    return clientIds
  }, [isOverviewMode, filterClient, clientIds, currentClientId])

  const createRoomOptions = useMemo(() => {
    if (!isOverviewMode) {
      return rooms.filter((r) => r.clientId === currentClientId)
    }
    if (createClientId !== 'all') {
      return rooms.filter((r) => r.clientId === createClientId)
    }
    return rooms
  }, [rooms, isOverviewMode, currentClientId, createClientId])

  useEffect(() => {
    let mounted = true

    async function load() {
      const allAvailableRooms = rooms
      console.log('[nodesPage] Loading nodes:', { clientIdsToLoad, allAvailableRooms: allAvailableRooms.length })
      setIsLoadingNodes(true)
      if (allAvailableRooms.length === 0 || clientIdsToLoad.length === 0) {
        console.log('[nodesPage] Skipping load: no rooms or clients')
        if (mounted) setNodes([])
        setIsLoadingNodes(false)
        return
      }

      try {
        console.log('[nodesPage] Starting to load nodes for clients:', clientIdsToLoad)
        const loadedPerClient = await Promise.all(
          clientIdsToLoad.map((clientId) => {
            const roomsForClient = allAvailableRooms.filter((room) => room.clientId === clientId)
            console.log(`[nodesPage] Loading nodes for client ${clientId}:`, { roomCount: roomsForClient.length })
            return loadNodesForClient(clientId, roomsForClient)
          })
        )

        console.log('[nodesPage] Nodes loaded:', loadedPerClient.flat().length)
        if (mounted) {
          setNodes(loadedPerClient.flat())
        }
      } catch (error) {
        console.error('[nodesPage] Failed to load nodes:', error)
        if (mounted) setNodes([])
      } finally {
        if (mounted) setIsLoadingNodes(false)
      }
    }

    load()
    return () => {
      mounted = false
    }
  }, [rooms, clientIdsToLoad])

  const selectedRoomId = createRoomId !== 'all' && createRoomOptions.some((room) => room.id === createRoomId)
    ? createRoomId
    : createRoomOptions[0]?.id ?? 'all'

  const filtered = useMemo(() => allNodes.filter(n => {
    if (filterStatus !== 'all' && n.status !== filterStatus) return false
    if (filterType !== 'all' && n.type !== filterType) return false
    if (filterRoom !== 'all' && n.roomId !== filterRoom) return false
    // Filtro por cliente no modo overview
    if (isOverviewMode && filterClient !== 'all') {
      const room = rooms.find(r => r.id === n.roomId)
      if (!room || room.clientId !== filterClient) return false
    }
    return true
  }), [allNodes, filterStatus, filterType, filterRoom, filterClient, isOverviewMode, rooms])

  async function handleCreateCtncNode() {
    console.log('[nodesPage] handleCreateCtncNode start')
    setCreationError('')
const roomId = selectedRoomId !== 'all' ? selectedRoomId : createRoomOptions[0]?.id
    console.log('[nodesPage] Selected room ID:', { roomId, selectedRoomId })
    
    if (!roomId) {
      const msg = 'Selecione uma sala válida para adicionar o CTN-C.'
      console.error('[nodesPage] Error:', msg)
      setCreationError(msg)
      return
    }

    const room = rooms.find((r) => r.id === roomId)
    if (!room) {
      const msg = 'Sala selecionada não encontrada.'
      console.error('[nodesPage] Error:', msg, { roomId, roomIds: rooms.map(r => r.id) })
      setCreationError(msg)
      setIsCreatingNode(false)
      return
    }

    if (!newNodeId.trim() || newNodeId === 'CTN-C-V') {
      const msg = 'Informe um ID de CTN-C válido.'
      console.error('[nodesPage] Error:', msg, { newNodeId })
      setCreationError(msg)
      return
    }

    setIsCreatingNode(true)
    try {
      console.log('[nodesPage] Creating node:', { roomId, roomName: room.name, nodeId: newNodeId })
      const node = await addCtncNode(roomId, room.name, newNodeId)
      console.log('[nodesPage] Node created:', node)
      
      patchRoomLocally(roomId, {
        acCount: room.acCount + 1,
        ctncNodeIds: [...(room.ctncNodeIds ?? []), node.id],
      })
      setNodes((prev) => [...prev, node])
      setNewNodeId('CTN-C-V')
      setShowCreateModal(false)
      setCreationError('')
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erro ao adicionar o node.'
      console.error('[nodesPage] Error creating node:', error, msg)
      setCreationError(msg)
    } finally {
      setIsCreatingNode(false)
    }
  }

  async function handleUpdateNode(node: ClimaTechNode, newNodeId: string) {
    setActionError('')
    setIsUpdatingNode(true)

    try {
      const updated = await updateNode(node.id, node.roomName, { node_id: newNodeId.trim().toUpperCase() })
      setNodes((prev) => prev.map((current) => (current.id === node.id ? updated : current)))

      const room = rooms.find((r) => r.id === node.roomId)
      if (room) {
        if (node.type === 'CTNR') {
          patchRoomLocally(node.roomId, { deviceId: updated.id })
        }

        if (node.type === 'CTNC') {
          patchRoomLocally(node.roomId, {
            ctncNodeIds: (room.ctncNodeIds ?? []).map((id) => (id === node.id ? updated.id : id)),
          })
        }
      }

      setSelectedNode(updated)
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erro ao atualizar o node.'
      console.error('[nodesPage] Error updating node:', error, msg)
      setActionError(msg)
    } finally {
      setIsUpdatingNode(false)
    }
  }

  async function handleDeleteNode(node: ClimaTechNode) {
    setActionError('')
    setIsDeletingNode(true)

    try {
      await deleteNode(node.id)
      setNodes((prev) => prev.filter((n) => n.id !== node.id))
      const room = rooms.find((r) => r.id === node.roomId)
      if (room) {
        patchRoomLocally(node.roomId, {
          acCount: Math.max(0, room.acCount - 1),
          ctncNodeIds: (room.ctncNodeIds ?? []).filter((id) => id !== node.id),
        })
      }
      setSelectedNode(null)
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erro ao excluir o node.'
      console.error('[nodesPage] Error deleting node:', error, msg)
      setActionError(msg)
    } finally {
      setIsDeletingNode(false)
    }
  }

  function requestNodeUpdate(node: ClimaTechNode, newNodeId?: string) {
    setPendingNodeAction({ type: 'update', node, newNodeId })
  }

  function requestNodeDelete(node: ClimaTechNode) {
    setPendingNodeAction({ type: 'delete', node })
  }

  async function confirmPendingNodeAction(password: string) {
    if (!pendingNodeAction) return
    await verifyCurrentPassword(password)

    if (pendingNodeAction.type === 'update' && pendingNodeAction.newNodeId) {
      await handleUpdateNode(pendingNodeAction.node, pendingNodeAction.newNodeId)
    }

    if (pendingNodeAction.type === 'delete') {
      await handleDeleteNode(pendingNodeAction.node)
    }

    setPendingNodeAction(null)
  }

  const online = allNodes.filter((n) => n.status === 'online').length
  const offline = allNodes.filter((n) => n.status === 'offline').length

  if (authLoading || roomsLoading) {
    return (
      <main className="min-h-screen px-4 sm:px-6 py-6 sm:py-8 pb-16 bg-white">
        <div className="max-w-6xl mx-auto py-12">
          <p className="text-sm text-slate-500">Carregando salas...</p>
        </div>
      </main>
    )
  }

  if (isLoadingNodes) {
    return (
      <main className="min-h-screen px-4 sm:px-6 py-6 sm:py-8 pb-16 bg-white">
        <div className="max-w-6xl mx-auto py-12">
          <p className="text-sm text-slate-500">Carregando nodes...</p>
        </div>
      </main>
    )
  }

  if (!isAdmin) {
    return (
      <main className="min-h-screen px-6 py-8 bg-white flex items-center justify-center">
        <div className="max-w-sm text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="#ef4444" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m0 0v2m0-2h2m-2 0H10m2-6V7m0 0a5 5 0 00-5 5v1H5a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2h-2v-1a5 5 0 00-5-5z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold" style={{ color: '#0f2744' }}>Acesso restrito</h1>
          <p className="text-sm text-slate-500">
            O painel de Nodes é exclusivo para administradores.
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen px-4 sm:px-6 py-6 sm:py-8 pb-16 bg-white">
      {selectedNode && (
        <NodeCommandModal
          node={selectedNode}
          onClose={() => setSelectedNode(null)}
          onUpdate={requestNodeUpdate}
          onDelete={requestNodeDelete}
          isUpdating={isUpdatingNode}
          isDeleting={isDeletingNode}
          actionError={actionError}
        />
      )}

      {pendingNodeAction && (
        <PasswordConfirmModal
          title={pendingNodeAction.type === 'delete'
            ? 'Confirmar exclusão de CTN-C'
            : 'Confirmar atualização de CTN-C'}
          message={pendingNodeAction.type === 'delete'
            ? 'Digite sua senha para confirmar a exclusão permanente deste CTN-C.'
            : 'Digite sua senha para confirmar a alteração do identificador do CTN-C.'}
          onConfirm={confirmPendingNodeAction}
          onClose={() => setPendingNodeAction(null)}
          confirmButtonText={pendingNodeAction.type === 'delete' ? 'Excluir' : 'Confirmar'}
          isDangerous={pendingNodeAction.type === 'delete'}
        />
      )}

      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#0f2744' }}>
              {isOverviewMode ? 'Nodes - Visão Geral' : 'Nodes'}
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">Clique em um node para enviar comandos</p>
          </div>
          <div>
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={() => setShowCreateModal(true)}
              disabled={!canCreate || createRoomOptions.length === 0}
            >
              + Nova CTN-C
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Total de nodes', value: allNodes.length, color: '#0f2744' },
            { label: 'Online',   value: online,  color: '#10c98f' },
            { label: 'Offline',  value: offline, color: '#94a3b8' },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-2xl p-5" style={{ background: 'white', border: '1px solid #e8edf5' }}>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">{label}</p>
              <p className="text-2xl font-bold" style={{ color }}>{value}</p>
            </div>
          ))}
        </div>

        {/* Warning banner for inactive clients */}
        {!canCreate && !isOverviewMode && (
          <div className="rounded-xl p-4 flex items-start gap-3" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#f59e0b' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-medium" style={{ color: '#f59e0b' }}>Cliente Inativo</p>
              <p className="text-xs mt-1" style={{ color: '#92400e' }}>
                Este cliente está inativo. Você pode visualizar os nodes existentes, mas não pode realizar operações de configuração.
              </p>
            </div>
          </div>
        )}

        {showCreateModal && (
          <CreateNodeModal
            isOpen={showCreateModal}
            onClose={() => setShowCreateModal(false)}
            clientIds={clientIds}
            isOverviewMode={isOverviewMode}
            selectClientId={createClientId}
            onSelectClient={(value) => setCreateClientId(value)}
            roomOptions={createRoomOptions}
            selectedRoomId={selectedRoomId}
            onSelectRoom={(value) => setCreateRoomId(value)}
            nodeId={newNodeId}
            onNodeIdChange={(value) => setNewNodeId(formatCtncInput(value))}
            onCreate={handleCreateCtncNode}
            isCreating={isCreatingNode}
            creationError={creationError}
          />
        )}

        <div className="flex flex-wrap gap-2">
          {/* Filtro de cliente (apenas no modo overview) */}
          {isOverviewMode && clientIds.length > 0 && (
            <select
              value={filterClient}
              onChange={(e) => setFilterClient(e.target.value)}
              className="px-3 py-1.5 rounded-xl text-xs outline-none"
              style={{ background: 'white', color: '#64748b', border: '1px solid #e2e8f0' }}
            >
              <option value="all">Todos os clientes</option>
              {clientIds.map((clientId) => (
                <option key={clientId} value={clientId}>
                  {getClientName(clientId)}
                </option>
              ))}
            </select>
          )}
          
          <div className="flex flex-wrap gap-1.5">
            {(['all', 'online', 'offline'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
                style={filterStatus === s
                  ? { background: 'linear-gradient(135deg, #1e5fa8, #2d7dd2)', color: 'white' }
                  : { background: 'white', color: '#64748b', border: '1px solid #e2e8f0' }}
              >
                {s === 'all' ? 'Todos' : s === 'online' ? 'Online' : 'Offline'}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(['all', 'CTNR', 'CTNC'] as FilterType[]).map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
                style={filterType === t
                  ? { background: 'linear-gradient(135deg, #0ea5a0, #10c98f)', color: 'white' }
                  : { background: 'white', color: '#64748b', border: '1px solid #e2e8f0' }}
              >
                {t === 'all' ? 'Todos os tipos' : TYPE_LABEL[t]}
              </button>
            ))}
          </div>
          <select
            value={filterRoom}
            onChange={(e) => setFilterRoom(e.target.value)}
            className="px-3 py-1.5 rounded-xl text-xs outline-none"
            style={{ background: 'white', color: '#64748b', border: '1px solid #e2e8f0' }}
          >
            <option value="all">Todas as salas</option>
            {filteredRooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>


        {filteredRooms.map(room => {
          const roomNodes = filtered.filter(n => n.roomId === room.id)
          if (roomNodes.length === 0) return null
          return (
            <div key={room.id}>
              <div className="flex items-center gap-3 mb-3">
                <h2 className="text-sm font-semibold" style={{ color: '#0f2744' }}>{room.name}</h2>
                <span className="text-xs text-slate-400">{room.location}</span>
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#f0f4f8', color: '#64748b' }}>
                  {roomNodes.length} node{roomNodes.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {roomNodes.map(node => (
                  <NodeCard key={node.id} node={node} onSelect={setSelectedNode} />
                ))}
              </div>
            </div>
          )
        })}

        {filtered.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-12">Nenhum node encontrado com os filtros selecionados.</p>
        )}
      </div>
    </main>
  )
}

