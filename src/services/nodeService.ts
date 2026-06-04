import type { ClimaTechNode, NodeStatus } from '@/types'
import {
  createCtncNodeInBackend,
  getNodesByClientFromBackend,
  updateNodeInBackend,
  deleteNodeInBackend,
  verifyNodeStatusInBackend,
} from '@/services/apiService'
import { getAcs } from '@/services/acService'

let nodes: ClimaTechNode[] = []
let acNameCache: Map<string, string> = new Map()

function normalizeIsoTimestamp(value: string | undefined | null): string {
  const raw = String(value ?? '').trim()
  if (!raw) return ''
  const normalized = raw.replace(' ', 'T')
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(normalized)) {
    return `${normalized}Z`
  }
  return normalized
}

function mapBackendNode(node: any, roomName: string, nomeAc?: string): ClimaTechNode {
  const type = node.node_type === 'CTN-R' ? 'CTNR' : 'CTNC'
  const status = (node.ultimo_status || '').toLowerCase().includes('online') ? 'online' : 'offline'
  const lastSeen = normalizeIsoTimestamp(node.dth_ultimo_status_at) || new Date().toISOString()
  const acIndex = type === 'CTNC'
    ? (() => {
        const match = String(node.node_id || '').match(/-(\d+)$/)
        return match ? Number(match[1]) : undefined
      })()
    : undefined

  return {
    id: node.node_id,
    type,
    pairId: node.node_id,
    roomId: node.sala_id,
    roomName,
    firmwareVersion: '',
    status: status as NodeStatus,
    lastSeen,
    acIndex,
    nomeAc,
  }
}

export function getNodes(): ClimaTechNode[] {
  return [...nodes]
}

export function setNodes(newNodes: ClimaTechNode[]): void {
  nodes = [...newNodes]
}

export async function loadNodesForClient(clientId: string, rooms: { id: string; name: string }[]): Promise<ClimaTechNode[]> {
  try {
    console.log('[nodeService] loadNodesForClient:', { clientId, roomCount: rooms.length, rooms })
    const backendNodes = await getNodesByClientFromBackend(clientId)
    console.log('[nodeService] Backend nodes loaded:', backendNodes)
    
    // Load ACs to get nomeAc for each node
    try {
      const acs = await getAcs(clientId)
      acNameCache.clear()
      acs.forEach((ac) => {
        acNameCache.set(ac.nodeId, ac.nomeAc)
      })
      console.log('[nodeService] AC name cache populated:', Object.fromEntries(acNameCache))
    } catch (err) {
      console.warn('[nodeService] Could not load ACs for name cache:', err)
    }
    
    const roomMap = new Map(rooms.map((room) => [room.id, room.name]))
    const roomIds = new Set(rooms.map((room) => room.id))
    console.log('[nodeService] Room map:', Object.fromEntries(roomMap))

    const mapped = backendNodes.map((node) => {
      const roomName = roomMap.get(node.sala_id) ?? ''
      const nomeAc = acNameCache.get(node.node_id)
      console.log(`[nodeService] Mapping node ${node.node_id}:`, { sala_id: node.sala_id, foundRoomName: roomName, nomeAc })
      return mapBackendNode(node, roomName, nomeAc)
    })
    
    console.log('[nodeService] Mapped nodes:', mapped)
    nodes = [...nodes.filter((node) => !roomIds.has(node.roomId)), ...mapped]
    return mapped
  } catch (error) {
    console.error('[nodeService] Error in loadNodesForClient:', error)
    throw error
  }
}

export function getNodesByRoom(roomId: string): ClimaTechNode[] {
  return nodes.filter((n) => n.roomId === roomId)
}

export function updateNodeStatus(id: string, status: NodeStatus): ClimaTechNode {
  const index = nodes.findIndex((n) => n.id === id)
  if (index === -1) throw new Error('Node não encontrado.')
  nodes[index] = { ...nodes[index], status, lastSeen: new Date().toISOString() }
  return nodes[index]
}

export function addOrUpdateNodesFromSala(salaDetail: any): void {
  if (!salaDetail) return
  const salaId = salaDetail.id
  const salaName = salaDetail.nome_sala || salaDetail.name || ''
  const newNodes = Array.isArray(salaDetail.nodes)
    ? salaDetail.nodes
    : [{ node_id: salaDetail.ctnr_node_id, node_type: 'CTN-R', ultimo_status: 'offline', dth_ultimo_status_at: salaDetail.dth_updated_at || new Date().toISOString() },
       ...buildCtncIdsFromSala(salaDetail).map((id) => ({ node_id: id, node_type: 'CTN-C', ultimo_status: 'offline', dth_ultimo_status_at: salaDetail.dth_updated_at || new Date().toISOString() }))]

  nodes = nodes.filter((n) => n.roomId !== salaId)

  const mapped = newNodes.map((node: any, idx: number): ClimaTechNode => {
    const type = node.node_type === 'CTN-R' ? 'CTNR' : 'CTNC'
    const status = (node.ultimo_status || '').toLowerCase().includes('online') ? 'online' : 'offline'
    const lastSeen = normalizeIsoTimestamp(node.dth_ultimo_status_at) || new Date().toISOString()
    const acIndex = type === 'CTNC'
      ? (() => {
          const m = (node.node_id || '').match(/-(\d+)$/)
          return m ? Number(m[1]) : idx + 1
        })()
      : undefined

    return {
      id: node.node_id,
      type,
      pairId: node.node_id,
      roomId: salaId,
      roomName: salaName,
      firmwareVersion: '',
      status: status as NodeStatus,
      lastSeen,
      acIndex,
    }
  })

  nodes = [...nodes, ...mapped]
}

export async function addCtncNode(
  roomId: string,
  roomName: string,
  nodeId: string,
  nomeAc: string,
  marcaAc: string,
  modeloAc: string,
  capacidadeBtus: number,
  tensaoFonte: number,
): Promise<ClimaTechNode> {
  try {
    console.log('[nodeService] addCtncNode start:', { roomId, roomName, nodeId, nomeAc, marcaAc, modeloAc, capacidadeBtus })
    const normalized = nodeId.trim().toUpperCase()
    const ctncPattern = /^CTN-C-V\d+-\d+$/
    if (!normalized) throw new Error('Identificador do node não pode ficar vazio.')
    if (!ctncPattern.test(normalized)) {
      throw new Error('CTN-C deve seguir o padrão CTN-C-V<versão>-<número>.')
    }
    if (nodes.some((node) => node.id === normalized)) {
      throw new Error(`Node '${normalized}' já existe.`)
    }

    console.log('[nodeService] Creating CTN-C node in backend...')
    const created = await createCtncNodeInBackend(roomId, {
      node_id: normalized,
      nome_ac: nomeAc.trim(),
      marca_ac: marcaAc.trim(),
      modelo_ac: modeloAc.trim(),
      capacidade_btus: capacidadeBtus,
      tensao_fonte: tensaoFonte,
    })
    console.log('[nodeService] Backend returned:', created)
    
    const mapped = mapBackendNode(created, roomName, nomeAc.trim())
    acNameCache.set(normalized, nomeAc.trim())
    console.log('[nodeService] Mapped node:', mapped)
    
    nodes.push(mapped)
    return mapped
  } catch (error) {
    console.error('[nodeService] Error in addCtncNode:', error)
    throw error
  }
}

export async function updateNode(nodeId: string, roomName: string, data: { node_id: string }): Promise<ClimaTechNode> {
  try {
    console.log('[nodeService] updateNode start:', { nodeId, data })
    const updated = await updateNodeInBackend(nodeId, data)
    const mapped = mapBackendNode(updated, roomName)
    nodes = nodes.map((node) => (node.id === nodeId ? mapped : node))
    return mapped
  } catch (error) {
    console.error('[nodeService] Error in updateNode:', error)
    throw error
  }
}

export async function verifyNodeStatus(nodeId: string) {
  try {
    const idempotencyKey = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`
    return await verifyNodeStatusInBackend(nodeId, idempotencyKey)
  } catch (error) {
    console.error('[nodeService] Error in verifyNodeStatus:', error)
    throw error
  }
}

export async function deleteNode(nodeId: string): Promise<void> {
  try {
    console.log('[nodeService] deleteNode start:', { nodeId })
    await deleteNodeInBackend(nodeId)
    nodes = nodes.filter((node) => node.id !== nodeId)
  } catch (error) {
    console.error('[nodeService] Error in deleteNode:', error)
    throw error
  }
}

export function _resetNodes(): void {
  nodes = []
}

function buildCtncIdsFromSala(salaDetail: any): string[] {
  const ctnrNodeId = salaDetail.ctnr_node_id || salaDetail.deviceId
  const match = String(ctnrNodeId || '').toUpperCase().match(/CTN-R-V(\d+)-\d+/)
  const version = match ? match[1] : '1'
  const count = Number(salaDetail.qtd_ac ?? salaDetail.acCount ?? 0)
  const baseNumber = 1
  return Array.from({ length: Math.max(0, count) }, (_, index) => `CTN-C-V${version}-${String(baseNumber + index).padStart(6, '0')}`)
}
