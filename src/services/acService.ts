'use client'

import type { Ac } from '@/types'
import type { AcResponse, AcUpdateRequest, AcCreateRequest } from '@/services/apiService'
import {
  getAcsFromBackend,
  getAcsBySalaFromBackend,
  updateAcInBackend,
  deleteAcInBackend,
} from '@/services/apiService'
import { withCache, cacheKeys, cacheDelete } from '@/services/cacheService'

function mapAcResponse(ac: AcResponse): Ac {
  return {
    id: ac.id,
    clientId: ac.client_id,
    salaId: ac.sala_id,
    salaName: ac.sala_name,
    nodeId: ac.node_id,
    nomeAc: ac.nome_ac,
    marcaAc: ac.marca_ac,
    modeloAc: ac.modelo_ac,
    capacidadeBtus: ac.capacidade_btus,
    nodeStatus: ac.node_status,
    nodeType: ac.node_type,
    nodeLastSeen: ac.node_last_seen,
    createdAt: ac.dth_criacao_at,
    updatedAt: ac.dth_updated_at,
  }
}

export async function getAcs(clientId?: string): Promise<Ac[]> {
  return withCache(cacheKeys.acs(clientId), async () => {
    const acs = await getAcsFromBackend(clientId)
    return acs.map(mapAcResponse)
  })
}

export async function getAcsBySala(salaId: string): Promise<Ac[]> {
  return withCache(cacheKeys.acs(undefined, salaId), async () => {
    const acs = await getAcsBySalaFromBackend(salaId)
    return acs.map(mapAcResponse)
  })
}

export async function updateAc(
  id: string,
  nomeAc: string,
  clientId?: string,
  salaId?: string,
  marcaAc?: string,
  modeloAc?: string,
  capacidadeBtus?: number
): Promise<Ac> {
  const updatePayload: Record<string, unknown> = { nome_ac: nomeAc.trim() }

  if (marcaAc) updatePayload.marca_ac = marcaAc.trim()
  if (modeloAc) updatePayload.modelo_ac = modeloAc.trim()
  if (capacidadeBtus) updatePayload.capacidade_btus = capacidadeBtus

  const updated = await updateAcInBackend(id, updatePayload as any)
  // Invalidate ACs cache
  if (clientId) cacheDelete(cacheKeys.acs(clientId))
  if (salaId) cacheDelete(cacheKeys.acs(undefined, salaId))
  return mapAcResponse(updated)
}

export async function deleteAc(id: string, clientId?: string, salaId?: string): Promise<void> {
  const deleted = await deleteAcInBackend(id)
  if (!deleted) {
    throw new Error('Falha ao excluir AC')
  }
  // Invalidate ACs cache
  if (clientId) cacheDelete(cacheKeys.acs(clientId))
  if (salaId) cacheDelete(cacheKeys.acs(undefined, salaId))
}
