'use client'

import { useState, useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRooms } from '@/contexts/RoomsContext'
import { useClientStatus } from '@/hooks/useClientStatus'
import { getNodes } from '@/services/nodeService'
import { getClientName } from '@/services/clientService'
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
function NodeCommandModal({ node, onClose }: { node: ClimaTechNode; onClose: () => void }) {
  const cfg = STATUS_CONFIG[node.status]
  const isCTNR = node.type === 'CTNR'

  const [statusCmd, setStatusCmd] = useState<CommandState>('idle')
  const [statusResult, setStatusResult] = useState<string>('')
  const [learnCmd, setLearnCmd] = useState<CommandState>('idle')
  const [selectedIr, setSelectedIr] = useState<IrCommand>('power_on')
  const [learnResult, setLearnResult] = useState<string>('')

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
        <p className="text-sm font-semibold" style={{ color: '#0f2744' }}>{node.roomName}</p>
        <p className="text-xs text-slate-400 mt-0.5">
          Par: <span className="font-mono">{node.pairId}</span>
          {node.acIndex !== undefined && <span className="ml-2">· AC #{node.acIndex}</span>}
        </p>
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

export default function NodesPage() {
  const { user } = useAuth()
  const { rooms } = useRooms()
  const { canCreate } = useClientStatus()
  const isAdmin = user?.role === 'admin_master' || user?.role === 'admin_client'
  const isOverviewMode = user?.role === 'admin_master' && !user?.selectedClientId

  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  const [filterType, setFilterType] = useState<FilterType>('all')
  const [filterRoom, setFilterRoom] = useState<string>('all')
  const [filterClient, setFilterClient] = useState<string>('all') // Novo filtro de cliente
  const [selectedNode, setSelectedNode] = useState<ClimaTechNode | null>(null)

  const allNodes = useMemo(() => {
    // Filtra nodes apenas das salas do cliente atual
    const roomIds = rooms.map(r => r.id)
    return getNodes().filter(node => roomIds.includes(node.roomId))
  }, [rooms])

  // Filtrar salas por cliente no modo overview
  const filteredRooms = isOverviewMode && filterClient !== 'all'
    ? rooms.filter(r => r.clientId === filterClient)
    : rooms

  // Obter lista única de clientIds
  const clientIds = useMemo(() => {
    return Array.from(new Set(rooms.map(r => r.clientId)))
  }, [rooms])

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

  const online  = allNodes.filter(n => n.status === 'online').length
  const offline = allNodes.filter(n => n.status === 'offline').length

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
      {selectedNode && <NodeCommandModal node={selectedNode} onClose={() => setSelectedNode(null)} />}

      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#0f2744' }}>
            {isOverviewMode ? 'Nodes - Visão Geral' : 'Nodes'}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Clique em um node para enviar comandos</p>
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

        <div className="flex flex-wrap gap-2">
          {/* Filtro de cliente (apenas no modo overview) */}
          {isOverviewMode && clientIds.length > 0 && (
            <select
              value={filterClient}
              onChange={e => setFilterClient(e.target.value)}
              className="px-3 py-1.5 rounded-xl text-xs outline-none"
              style={{ background: 'white', color: '#64748b', border: '1px solid #e2e8f0' }}
            >
              <option value="all">Todos os clientes</option>
              {clientIds.map(clientId => (
                <option key={clientId} value={clientId}>
                  {getClientName(clientId)}
                </option>
              ))}
            </select>
          )}
          
          <div className="flex flex-wrap gap-1.5">
            {(['all', 'online', 'offline'] as const).map(s => (
              <button key={s} onClick={() => setFilterStatus(s)}
                className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
                style={filterStatus === s
                  ? { background: 'linear-gradient(135deg, #1e5fa8, #2d7dd2)', color: 'white' }
                  : { background: 'white', color: '#64748b', border: '1px solid #e2e8f0' }}>
                {s === 'all' ? 'Todos' : s === 'online' ? 'Online' : 'Offline'}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(['all', 'CTNR', 'CTNC'] as FilterType[]).map(t => (
              <button key={t} onClick={() => setFilterType(t)}
                className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
                style={filterType === t
                  ? { background: 'linear-gradient(135deg, #0ea5a0, #10c98f)', color: 'white' }
                  : { background: 'white', color: '#64748b', border: '1px solid #e2e8f0' }}>
                {t === 'all' ? 'Todos os tipos' : TYPE_LABEL[t]}
              </button>
            ))}
          </div>
          <select value={filterRoom} onChange={e => setFilterRoom(e.target.value)}
            className="px-3 py-1.5 rounded-xl text-xs outline-none"
            style={{ background: 'white', color: '#64748b', border: '1px solid #e2e8f0' }}>
            <option value="all">Todas as salas</option>
            {filteredRooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>

        {isOverviewMode && filterClient === 'all' ? (
          // Modo overview: agrupar por cliente
          <>
            {clientIds.map(clientId => {
              const clientRooms = rooms.filter(r => r.clientId === clientId)
              const clientRoomIds = clientRooms.map(r => r.id)
              const clientNodes = filtered.filter(n => clientRoomIds.includes(n.roomId))
              
              if (clientNodes.length === 0) return null
              
              const clientOnline = clientNodes.filter(n => n.status === 'online').length
              
              return (
                <div key={clientId} className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold" style={{ color: '#1e5fa8' }}>
                      {getClientName(clientId)}
                    </h2>
                    <span className="text-xs text-slate-400">
                      {clientOnline} de {clientNodes.length} online
                    </span>
                  </div>
                  
                  {clientRooms.map(room => {
                    const roomNodes = clientNodes.filter(n => n.roomId === room.id)
                    if (roomNodes.length === 0) return null
                    return (
                      <div key={room.id}>
                        <div className="flex items-center gap-3 mb-3">
                          <h3 className="text-sm font-semibold" style={{ color: '#0f2744' }}>{room.name}</h3>
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
                </div>
              )
            })}
          </>
        ) : (
          // Modo normal ou filtrado: lista simples
          <>
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
          </>
        )}

        {filtered.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-12">Nenhum node encontrado com os filtros selecionados.</p>
        )}
      </div>
    </main>
  )
}

