'use client'

import type { Room } from '@/types'
import { validateRoomName } from '@/utils/validators'
import {
  getSalasFromBackend,
  getNodesByClientFromBackend,
  createSalaInBackend,
  updateSalaInBackend,
  deleteSalaInBackend,
} from '@/services/apiService'
import { addOrUpdateNodesFromSala } from '@/services/nodeService'
import { withCache, cacheKeys, cacheDelete } from '@/services/cacheService'

const CTN_R_PATTERN = /^CTN-R-V(\d+)-\d+$/i

function padNumber(value: number, length: number) {
  return String(value).padStart(length, '0')
}

function buildCtnrNodeId(): string {
  const randomSeed = Math.floor(Math.random() * 999999)
  return `CTN-R-V1-${padNumber(randomSeed, 6)}`
}

function buildCtncNodeIds(ctnrNodeId: string, count: number): string[] {
  const normalized = ctnrNodeId.trim().toUpperCase()
  const versionMatch = normalized.match(CTN_R_PATTERN)
  const version = versionMatch ? versionMatch[1] : '1'
  const digits = normalized.replace(/\D/g, '')
  const startNumber = digits.length > 0 ? Number(digits.slice(-6)) || 1 : 1
  const base = `CTN-C-V${version}-`

  return Array.from({ length: count }, (_, index) => `${base}${padNumber(startNumber + index, 6)}`)
}

function parseCtncNodeIds(sala: any): string[] {
  if (Array.isArray(sala.nodes) && sala.nodes.length > 0) {
    return sala.nodes
      .filter((node: any) => node.node_type === 'CTN-C')
      .map((node: any) => node.node_id)
  }

  return buildCtncNodeIds(sala.ctnr_node_id, sala.qtd_ac)
}

function mapSalaResponseToRoom(
  sala: ReturnType<typeof createSalaInBackend> extends Promise<infer T> ? T : never,
  overrides: Partial<Room> = {}
): Room {
  const ctncNodeIds = overrides.ctncNodeIds?.length
    ? overrides.ctncNodeIds
    : parseCtncNodeIds(sala)

  const acCount = overrides.acCount !== undefined
    ? Math.max(1, overrides.acCount)
    : Math.max(1, ctncNodeIds.length || sala.qtd_ac)

  return {
    id: sala.id,
    userId: overrides.userId ?? '',
    clientId: sala.client_id,
    name: sala.nome_sala,
    deviceId: sala.ctnr_node_id,
    acCount,
    sizeM2: sala.tam_sala_m2,
    ctncNodeIds,
    location: overrides.location,
    idealTempMin: sala.temp_ideal_min,
    idealTempMax: sala.temp_ideal_max,
    targetTemp: sala.temp_alvo ?? null,
    createdAt: sala.dth_criacao_at,
  }
}

export async function getRooms(clientId: string): Promise<Room[]> {
  if (!clientId) return []
  
  return withCache(cacheKeys.rooms(clientId), async () => {
    const [salas, backendNodes] = await Promise.all([
      getSalasFromBackend(clientId),
      getNodesByClientFromBackend(clientId),
    ])

    const ctncIdsBySala = new Map<string, string[]>()
    backendNodes.forEach((node) => {
      if (node.node_type === 'CTN-C') {
        const existing = ctncIdsBySala.get(node.sala_id) ?? []
        existing.push(node.node_id)
        ctncIdsBySala.set(node.sala_id, existing)
      }
    })

    return salas.map((sala) => {
      const ctncNodeIds = ctncIdsBySala.get(sala.id) ?? []
      return mapSalaResponseToRoom(sala, {
        ctncNodeIds,
        acCount: Math.max(1, ctncNodeIds.length || sala.qtd_ac),
      })
    })
  })
}

export async function createRoom(data: Omit<Room, 'id' | 'createdAt'>): Promise<Room> {
  validateRoomName(data.name)

  const requestPayload = {
    client_id: data.clientId,
    nome_sala: data.name.trim(),
    tam_sala_m2: data.sizeM2,
    temp_ideal_min: data.idealTempMin,
    temp_ideal_max: data.idealTempMax,
    temp_alvo: data.targetTemp ?? undefined,
    ctnr_node_id: data.deviceId.trim(),
    ctnc_nodes: data.ctncNodes
      ? data.ctncNodes
      : data.ctncNodeIds?.map((id, index) => ({
          node_id: id.trim(),
          nome_ac: `AC ${index + 1}`,
          marca_ac: 'Marca padrão',
          modelo_ac: 'Modelo padrão',
          capacidade_btus: 12000,
          tensao_fonte: 220,
        })) ??
        buildCtncNodeIds(data.deviceId, data.acCount).map((id, index) => ({
          node_id: id,
          nome_ac: `AC ${index + 1}`,
          marca_ac: 'Marca padrão',
          modelo_ac: 'Modelo padrão',
          capacidade_btus: 12000,
          tensao_fonte: 220,
        })),
  }

  const sala = await createSalaInBackend(requestPayload)
  // Invalidate room cache after creation
  cacheDelete(cacheKeys.rooms(data.clientId))
  
  // Sync nodes returned by backend into frontend node store
  try {
    addOrUpdateNodesFromSala(sala)
  } catch (err) {
    // non-fatal: if nodes sync fails, still return created room
    console.warn('Failed to sync nodes from created sala', err)
  }
  return mapSalaResponseToRoom(sala, {
    userId: data.userId,
    location: data.location,
  })
}

export async function updateRoom(
  id: string,
  data: Partial<Omit<Room, 'id' | 'userId' | 'createdAt'>>
): Promise<Room> {
  const requestPayload: Record<string, unknown> = {}

  if (data.name !== undefined) requestPayload.nome_sala = data.name.trim()
  if (data.sizeM2 !== undefined) requestPayload.tam_sala_m2 = data.sizeM2
  if (data.idealTempMin !== undefined) requestPayload.temp_ideal_min = data.idealTempMin
  if (data.idealTempMax !== undefined) requestPayload.temp_ideal_max = data.idealTempMax
  if (data.targetTemp !== undefined) requestPayload.temp_alvo = data.targetTemp

  const sala = await updateSalaInBackend(id, requestPayload)
  // Invalidate room cache after update
  if (data.clientId) {
    cacheDelete(cacheKeys.rooms(data.clientId))
  }

  return mapSalaResponseToRoom(sala, {
    location: data.location,
  })
}

export async function deleteRoom(id: string, clientId?: string): Promise<void> {
  await deleteSalaInBackend(id)
  // Invalidate room cache after deletion
  if (clientId) {
    cacheDelete(cacheKeys.rooms(clientId))
  }
}
