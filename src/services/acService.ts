'use client'

import type { Ac } from '@/types'
import type { AcResponse, AcUpdateRequest } from '@/services/apiService'
import {
  getAcsFromBackend,
  getAcsBySalaFromBackend,
  updateAcInBackend,
  deleteAcInBackend,
} from '@/services/apiService'

function mapAcResponse(ac: AcResponse): Ac {
  return {
    id: ac.id,
    clientId: ac.client_id,
    salaId: ac.sala_id,
    salaName: ac.sala_name,
    nodeId: ac.node_id,
    nomeAc: ac.nome_ac,
    nodeStatus: ac.node_status,
    nodeType: ac.node_type,
    nodeLastSeen: ac.node_last_seen,
    createdAt: ac.dth_criacao_at,
    updatedAt: ac.dth_updated_at,
  }
}

export async function getAcs(clientId?: string): Promise<Ac[]> {
  const acs = await getAcsFromBackend(clientId)
  return acs.map(mapAcResponse)
}

export async function getAcsBySala(salaId: string): Promise<Ac[]> {
  const acs = await getAcsBySalaFromBackend(salaId)
  return acs.map(mapAcResponse)
}

export async function updateAc(id: string, nomeAc: string): Promise<Ac> {
  const updated = await updateAcInBackend(id, { nome_ac: nomeAc.trim() })
  return mapAcResponse(updated)
}

export async function deleteAc(id: string): Promise<void> {
  const deleted = await deleteAcInBackend(id)
  if (!deleted) {
    throw new Error('Falha ao excluir AC')
  }
}
