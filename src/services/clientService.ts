import type { Client } from '@/types'
import { verifyPassword } from '@/services/authService'
import type { ClienteCreate, ClienteResponse } from '@/services/apiService'
import {
  getClientesFromBackend,
  getClienteById,
  createClienteInBackend,
  updateClienteInBackend,
  deactivateClienteInBackend,
  activateClienteInBackend,
  deleteClienteInBackend,
} from '@/services/apiService'

let clientsCache: Client[] = []

function formatAddress(cliente: ClienteResponse): string {
  const parts = [
    cliente.des_endereco,
    cliente.end_numero,
    cliente.end_complemento,
    cliente.end_bairro,
    cliente.end_cidade,
    cliente.end_estado,
  ].filter(Boolean)

  return parts.join(', ')
}

function mapClienteResponse(cliente: ClienteResponse): Client {
  return {
    id: cliente.id,
    name: cliente.nome,
    cep: cliente.num_cep ?? undefined,
    address: formatAddress(cliente),
    phone: cliente.num_telefone ?? undefined,
    createdAt: cliente.dth_created_at,
    isActive: cliente.flg_ativo,
  }
}

async function refreshCache(clientes: ClienteResponse[]) {
  clientsCache = clientes.map(mapClienteResponse)
  return clientsCache
}

/** Retorna todos os clientes do backend */
export async function getAllClients(): Promise<Client[]> {
  const clientes = await getClientesFromBackend(false)
  return refreshCache(clientes)
}

/** Retorna apenas clientes ativos do backend */
export async function getActiveClients(): Promise<Client[]> {
  const clientes = await getClientesFromBackend(true)
  return refreshCache(clientes)
}

/** Retorna um cliente específico por ID */
export async function getClientByIdFromBackend(id: string): Promise<Client | undefined> {
  const cliente = await getClienteById(id)
  if (!cliente) return undefined
  return mapClienteResponse(cliente)
}

/** Retorna o nome formatado de um cliente pelo ID */
export function getClientName(clientId: string): string {
  const client = clientsCache.find(c => c.id === clientId)
  if (client) return client.name

  return clientId.replace('client-', '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

/** Cria um novo cliente usando o backend */
export async function createClient(data: ClienteCreate): Promise<Client> {
  const cliente = await createClienteInBackend(data)
  if (!cliente) throw new Error('Falha ao criar cliente')

  const mapped = mapClienteResponse(cliente)
  clientsCache.push(mapped)
  return mapped
}

/** Atualiza um cliente existente usando o backend */
export async function updateClient(id: string, data: Partial<ClienteCreate>): Promise<Client> {
  const cliente = await updateClienteInBackend(id, data)
  if (!cliente) throw new Error('Falha ao atualizar cliente')

  const mapped = mapClienteResponse(cliente)
  clientsCache = clientsCache.map(c => c.id === mapped.id ? mapped : c)
  return mapped
}

/** Ativa ou desativa um cliente com confirmação de senha */
export async function toggleClientStatus(id: string, adminEmail: string, password: string): Promise<Client> {
  if (!verifyPassword(adminEmail, password)) {
    throw new Error('Senha incorreta')
  }

  const cliente = await getClienteById(id)
  if (!cliente) throw new Error('Cliente não encontrado')

  const updatedResponse = cliente.flg_ativo
    ? await deactivateClienteInBackend(id)
    : await activateClienteInBackend(id)

  if (!updatedResponse) {
    throw new Error('Falha ao alterar status do cliente')
  }

  const updated = mapClienteResponse(updatedResponse)
  clientsCache = clientsCache.map(c => c.id === updated.id ? updated : c)
  return updated
}

/** Deleta um cliente no backend */
export async function deleteClient(id: string): Promise<void> {
  const deleted = await deleteClienteInBackend(id)
  if (!deleted) {
    throw new Error('Falha ao excluir cliente')
  }

  clientsCache = clientsCache.filter(c => c.id !== id)
}
