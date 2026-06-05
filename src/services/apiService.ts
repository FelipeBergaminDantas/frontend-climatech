import { ACCESS_TOKEN_KEY } from '@/config/constants'

/**
 * API Service - Backend Integration
 * Connects frontend to ClimaTech FastAPI backend
 */

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export interface ClienteCreate {
  nome: string;
  num_cpf_cnpj: string;
  des_email: string;
  num_telefone?: string;
  num_cep?: string;
  des_endereco?: string;
  end_numero?: string;
  end_complemento?: string;
  end_bairro?: string;
  end_cidade?: string;
  end_estado?: string;
}

export interface ClienteResponse {
  id: string;
  nome: string;
  num_cpf_cnpj: string;
  des_email: string;
  num_telefone?: string;
  num_cep?: string;
  des_endereco?: string;
  end_numero?: string;
  end_complemento?: string;
  end_bairro?: string;
  end_cidade?: string;
  end_estado?: string;
  flg_ativo: boolean;
  dth_created_at: string;
  dth_updated_at: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface SalaCreateRequest {
  client_id: string;
  nome_sala: string;
  tam_sala_m2: number;
  temp_ideal_min: number;
  temp_ideal_max: number;
  temp_alvo?: number | null;
  ctnr_node_id: string;
  ctnc_nodes: NodeCreateRequest[];
}

export interface SalaUpdateRequest {
  nome_sala?: string;
  tam_sala_m2?: number;
  temp_ideal_min?: number;
  temp_ideal_max?: number;
  temp_alvo?: number | null;
}

export interface SalaResponse {
  id: string;
  client_id: string;
  nome_sala: string;
  tam_sala_m2: number;
  ctnr_node_id: string;
  qtd_ac: number;
  temp_ideal_min: number;
  temp_ideal_max: number;
  temp_alvo?: number | null;
  dth_criacao_at: string;
  dth_atualizacao_at?: string;
}

export interface NodeResponse {
  node_id: string;
  client_id: string;
  sala_id: string;
  node_type: 'CTN-R' | 'CTN-C';
  ultimo_status: string;
  dth_ultimo_status_at?: string;
  dth_criacao_at?: string;
  dth_updated_at?: string;
}

export interface NodeCreateRequest {
  node_id: string;
  nome_ac: string;
  marca_ac: string;
  modelo_ac: string;
  capacidade_btus: number;
  tensao_fonte: number;
}

export interface NodeUpdateRequest {
  node_id?: string;
  ultimo_status?: string;
}

export interface SalaDetailResponse extends SalaResponse {
  nodes?: unknown[];
}

export interface AcResponse {
  id: string;
  client_id: string;
  sala_id: string;
  sala_name?: string;
  node_id: string;
  nome_ac: string;
  marca_ac?: string;
  modelo_ac?: string;
  capacidade_btus?: number;
  tensao_fonte?: number;
  node_status?: string;
  node_type?: string;
  node_last_seen?: string;
  dth_criacao_at?: string;
  dth_updated_at?: string;
}

export interface AcCreateRequest {
  nome_ac: string;
  marca_ac: string;
  modelo_ac: string;
  capacidade_btus: number;
  tensao_fonte: number;
}

export interface AcUpdateRequest {
  nome_ac?: string;
  marca_ac?: string;
  modelo_ac?: string;
  capacidade_btus?: number;
  tensao_fonte?: number;
}

function getAccessToken(): string | null {
  if (typeof window === 'undefined') {
    return null
  }
  return localStorage.getItem(ACCESS_TOKEN_KEY) ?? sessionStorage.getItem(ACCESS_TOKEN_KEY)
}

export function extractApiErrorMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== 'object') {
    return fallback
  }
  const record = payload as Record<string, unknown>
  if (typeof record.message === 'string' && record.message.trim()) {
    return record.message
  }
  if (typeof record.detail === 'string' && record.detail.trim()) {
    return record.detail
  }
  if (Array.isArray(record.errors) && record.errors.length > 0) {
    const first = record.errors[0] as Record<string, unknown>
    if (typeof first.message === 'string' && first.message.trim()) {
      return first.message
    }
  }
  return fallback
}

export async function readApiError(response: Response, fallback: string): Promise<string> {
  const text = await response.text()
  if (!text.trim()) {
    return fallback
  }
  try {
    return extractApiErrorMessage(JSON.parse(text) as unknown, fallback)
  } catch {
    return text
  }
}

export function buildHeaders(contentType = true): Record<string, string> {
  const headers: Record<string, string> = {}
  if (contentType) {
    headers['Content-Type'] = 'application/json'
  }
  const token = getAccessToken()
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }
  return headers
}

/**
 * Get all clientes from backend
 */
export async function getClientesFromBackend(onlyActive = true): Promise<ClienteResponse[]> {
  try {
    const queryString = new URLSearchParams({ only_active: String(onlyActive) });
    const response = await fetch(`${API_BASE_URL}/clientes?${queryString}`, {
      method: 'GET',
      headers: buildHeaders(false),
      credentials: 'include',
    });

    if (!response.ok) {
      const message = await readApiError(response, 'Failed to fetch clientes')
      throw new Error(message)
    }

    const result: ApiResponse<ClienteResponse[]> = await response.json();
    return result.data;
  } catch (error) {
    console.error('Error fetching clientes:', error);
    return [];
  }
}

/**
 * Get cliente by ID from backend
 */
export async function getClienteById(id: string): Promise<ClienteResponse | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/clientes/${id}`, {
      method: 'GET',
      headers: buildHeaders(false),
    });
    if (!response.ok) throw new Error('Failed to fetch cliente');
    const result: ApiResponse<ClienteResponse> = await response.json();
    return result.data;
  } catch (error) {
    console.error('Error fetching cliente:', error);
    return null;
  }
}

/**
 * Create new cliente in backend
 */
export async function createClienteInBackend(data: ClienteCreate): Promise<ClienteResponse | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/clientes`, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify(data),
      credentials: 'include',
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create cliente');
    }
    
    const result: ApiResponse<ClienteResponse> = await response.json();
    return result.data;
  } catch (error) {
    console.error('Error creating cliente:', error);
    throw error;
  }
}

/**
 * Update cliente in backend
 */
export async function updateClienteInBackend(id: string, data: Partial<ClienteCreate>): Promise<ClienteResponse | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/clientes/${id}`, {
      method: 'PUT',
      headers: buildHeaders(),
      credentials: 'include',
      body: JSON.stringify(data),
    });
    
    if (!response.ok) throw new Error('Failed to update cliente');
    const result: ApiResponse<ClienteResponse> = await response.json();
    return result.data;
  } catch (error) {
    console.error('Error updating cliente:', error);
    throw error;
  }
}

export interface AutomationCreateRequest {
  id_cliente?: string;
  id_sala: string;
  nome_automacao: string;
  tipo_trigger: 'periodo';
  fl_somente_dia_util: boolean;
  fl_segunda: boolean;
  fl_terca: boolean;
  fl_quarta: boolean;
  fl_quinta: boolean;
  fl_sexta: boolean;
  fl_sabado: boolean;
  fl_domingo: boolean;
  hora_inicio: string;
  hora_fim: string;
  prioridade: number;
}

export interface AutomationUpdateRequest {
  nome_automacao?: string;
  fl_somente_dia_util?: boolean;
  fl_segunda?: boolean;
  fl_terca?: boolean;
  fl_quarta?: boolean;
  fl_quinta?: boolean;
  fl_sexta?: boolean;
  fl_sabado?: boolean;
  fl_domingo?: boolean;
  hora_inicio?: string;
  hora_fim?: string;
  prioridade?: number;
  fl_ativo?: boolean;
}

export interface AutomationResponse {
  id_automacao: string;
  id_cliente: string;
  id_sala: string;
  nome_automacao: string;
  tipo_trigger: 'periodo' | 'temperatura';
  fl_ativo: boolean;
  temperatura_alvo?: number | null;
  fl_somente_dia_util: boolean;
  fl_segunda: boolean;
  fl_terca: boolean;
  fl_quarta: boolean;
  fl_quinta: boolean;
  fl_sexta: boolean;
  fl_sabado: boolean;
  fl_domingo: boolean;
  hora_inicio: string;
  hora_fim: string;
  prioridade: number;
  dth_created_at: string;
  dth_updated_at: string;
}

export interface AutomationStateResponse {
  id_automacao: string;
  fl_em_execucao: boolean;
  comando_enviado?: string;
  dth_inicio_execucao?: string;
  dth_fim_execucao?: string;
  dth_ultima_execucao?: string;
  status?: string;
}

export async function getAutomationsFromBackend(clientId?: string, salaId?: string): Promise<AutomationResponse[]> {
  const params = new URLSearchParams()
  // Only include client_id for admins querying other clients
  // Regular users will use their authenticated context
  if (clientId) params.set('client_id', clientId)
  if (salaId) params.set('sala_id', salaId)
  const query = params.toString() ? `?${params.toString()}` : ''
  const response = await fetch(`${API_BASE_URL}/automacoes${query}`, {
    method: 'GET',
    headers: buildHeaders(false),
    credentials: 'include',
  })
  if (!response.ok) {
    const error = await response.json().catch(() => null)
    throw new Error(error?.message || 'Failed to fetch automations')
  }
  const result: ApiResponse<AutomationResponse[]> = await response.json()
  return result.data
}

export async function createAutomationInBackend(data: AutomationCreateRequest): Promise<AutomationResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/automacoes`, {
      method: 'POST',
      headers: buildHeaders(),
      credentials: 'include',
      body: JSON.stringify(data),
    })
    if (!response.ok) {
      const error = await response.json().catch(() => null)
      throw new Error(error?.message || `Failed to create automation: ${response.status} ${response.statusText}`)
    }
    const result: ApiResponse<AutomationResponse> = await response.json()
    return result.data
  } catch (error) {
    console.error('Error creating automation:', error)
    if (error instanceof TypeError) {
      throw new Error('Falha ao conectar com o backend. Verifique se o servidor está rodando e se a origem está liberada pelo CORS.')
    }
    throw error
  }
}

export async function updateAutomationInBackend(id: string, data: AutomationUpdateRequest): Promise<AutomationResponse> {
  const response = await fetch(`${API_BASE_URL}/automacoes/${id}`, {
    method: 'PUT',
    headers: buildHeaders(),
    credentials: 'include',
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const error = await response.json().catch(() => null)
    throw new Error(error?.message || 'Failed to update automation')
  }
  const result: ApiResponse<AutomationResponse> = await response.json()
  return result.data
}

export async function toggleAutomationInBackend(id: string): Promise<AutomationResponse> {
  const response = await fetch(`${API_BASE_URL}/automacoes/${id}/toggle`, {
    method: 'PATCH',
    headers: buildHeaders(),
    credentials: 'include',
  })
  if (!response.ok) {
    const error = await response.json().catch(() => null)
    throw new Error(error?.message || 'Failed to toggle automation')
  }
  const result: ApiResponse<AutomationResponse> = await response.json()
  return result.data
}

export async function deleteAutomationInBackend(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/automacoes/${id}`, {
    method: 'DELETE',
    headers: buildHeaders(),
    credentials: 'include',
  })
  if (!response.ok) {
    const error = await response.json().catch(() => null)
    throw new Error(error?.message || 'Failed to delete automation')
  }
}

export async function getAutomationStatesFromBackend(salaId: string): Promise<AutomationStateResponse[]> {
  const response = await fetch(`${API_BASE_URL}/automacoes/states?sala_id=${encodeURIComponent(salaId)}`, {
    method: 'GET',
    headers: buildHeaders(false),
    credentials: 'include',
  })

  if (!response.ok) {
    const message = await readApiError(response, 'Failed to fetch automation states')
    throw new Error(message)
  }

  const result: ApiResponse<AutomationStateResponse[]> = await response.json()
  return result.data
}

/**
 * Deactivate cliente in backend
 */
export async function deactivateClienteInBackend(id: string): Promise<ClienteResponse | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/clientes/${id}/deactivate`, {
      method: 'PATCH',
      headers: buildHeaders(),
      credentials: 'include',
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => null);
      throw new Error(error?.message || 'Failed to deactivate cliente');
    }

    const result: ApiResponse<ClienteResponse> = await response.json();
    return result.data;
  } catch (error) {
    console.error('Error deactivating cliente:', error);
    return null;
  }
}

/**
 * Activate cliente in backend
 */
export async function activateClienteInBackend(id: string): Promise<ClienteResponse | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/clientes/${id}/activate`, {
      method: 'PATCH',
      headers: buildHeaders(),
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => null);
      throw new Error(error?.message || 'Failed to activate cliente');
    }

    const result: ApiResponse<ClienteResponse> = await response.json();
    return result.data;
  } catch (error) {
    console.error('Error activating cliente:', error);
    return null;
  }
}

/**
 * Delete cliente in backend
 */
export async function deleteClienteInBackend(id: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/clientes/${id}`, {
      method: 'DELETE',
      headers: buildHeaders(),
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => null);
      throw new Error(error?.message || 'Failed to delete cliente');
    }

    return true;
  } catch (error) {
    console.error('Error deleting cliente:', error);
    throw error;
  }
}

/**
 * Get salas for a given client from backend
 */
export async function getSalasFromBackend(clientId: string): Promise<SalaResponse[]> {
  try {
    const url = `${API_BASE_URL}/salas/clientes/${clientId}`
    console.log('[apiService] GET salas by client:', { url, clientId })

    const response = await fetch(url, {
      method: 'GET',
      headers: buildHeaders(false),
      credentials: 'include',
    })

    console.log('[apiService] Response status for salas:', response.status, response.statusText)
    if (!response.ok) {
      const error = await response.json().catch(() => null)
      throw new Error(error?.message || 'Failed to load salas')
    }

    const result: ApiResponse<SalaResponse[]> = await response.json()
    console.log('[apiService] Response data for salas:', result)
    return result.data
  } catch (error) {
    console.error('[apiService] Error fetching salas:', error)
    return []
  }
}

/**
 * Get sala by ID from backend
 */
export async function getSalaByIdFromBackend(id: string): Promise<SalaDetailResponse | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/salas/${id}`, {
      method: 'GET',
      headers: buildHeaders(false),
      credentials: 'include',
    })

    if (!response.ok) {
      const error = await response.json().catch(() => null)
      throw new Error(error?.message || 'Failed to fetch sala')
    }

    const result: ApiResponse<SalaDetailResponse> = await response.json()
    return result.data
  } catch (error) {
    console.error('Error fetching sala by id:', error)
    return null
  }
}

/**
 * Fetch ACs from backend
 */
export async function getAcsFromBackend(clientId?: string): Promise<AcResponse[]> {
  try {
    const url = new URL(`${API_BASE_URL}/acs`)
    if (clientId) {
      url.searchParams.append('client_id', clientId)
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: buildHeaders(false),
      credentials: 'include',
    })

    if (!response.ok) {
      const error = await response.json().catch(() => null)
      throw new Error(error?.message || 'Failed to load ACs')
    }

    const result: ApiResponse<AcResponse[]> = await response.json()
    return result.data
  } catch (error) {
    console.error('Error fetching ACs:', error)
    return []
  }
}

/**
 * Get ACs by sala id from backend
 */
export async function getAcsBySalaFromBackend(salaId: string): Promise<AcResponse[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/salas/${salaId}/acs`, {
      method: 'GET',
      headers: buildHeaders(false),
      credentials: 'include',
    })

    if (!response.ok) {
      const error = await response.json().catch(() => null)
      throw new Error(error?.message || 'Failed to load sala ACs')
    }

    const result: ApiResponse<AcResponse[]> = await response.json()
    return result.data
  } catch (error) {
    console.error('Error fetching sala ACs:', error)
    return []
  }
}

/**
 * Update AC in backend
 */
export async function updateAcInBackend(id: string, data: AcUpdateRequest): Promise<AcResponse> {
  const response = await fetch(`${API_BASE_URL}/acs/${id}`, {
    method: 'PUT',
    headers: buildHeaders(),
    credentials: 'include',
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => null)
    const message = error?.message || error?.errors?.[0]?.message || 'Falha ao atualizar AC'
    throw new Error(message)
  }

  const result: ApiResponse<AcResponse> = await response.json()
  return result.data
}

/**
 * Delete AC in backend
 */
export async function deleteAcInBackend(id: string): Promise<boolean> {
  const response = await fetch(`${API_BASE_URL}/acs/${id}`, {
    method: 'DELETE',
    headers: buildHeaders(false),
    credentials: 'include',
  })

  if (!response.ok) {
    const error = await response.json().catch(() => null)
    throw new Error(error?.message || 'Failed to delete AC')
  }

  const result: ApiResponse<{ deleted: boolean }> = await response.json()
  return result.data.deleted
}

/**
 * Create sala in backend
 */
export async function createSalaInBackend(data: SalaCreateRequest): Promise<SalaDetailResponse> {
  let response: Response

  try {
    response = await fetch(`${API_BASE_URL}/salas`, {
      method: 'POST',
      headers: buildHeaders(),
      credentials: 'include',
      body: JSON.stringify(data),
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`Falha ao conectar com o backend em ${API_BASE_URL}: ${message}`)
  }

  if (!response.ok) {
    const error = await response.json().catch(() => null)
    const message = error?.message || error?.errors?.[0]?.message || 'Falha ao criar sala'
    throw new Error(message)
  }

  const result: ApiResponse<SalaDetailResponse> = await response.json()
  return result.data
}

/**
 * Update sala in backend
 */
export async function updateSalaInBackend(id: string, data: SalaUpdateRequest): Promise<SalaResponse> {
  const response = await fetch(`${API_BASE_URL}/salas/${id}`, {
    method: 'PATCH',
    headers: buildHeaders(),
    credentials: 'include',
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    throw new Error(await readApiError(response, 'Falha ao atualizar a sala'))
  }

  const result: ApiResponse<SalaResponse> = await response.json()
  return result.data
}

/**
 * Delete sala in backend
 */
export async function deleteSalaInBackend(id: string): Promise<boolean> {
  const response = await fetch(`${API_BASE_URL}/salas/${id}`, {
    method: 'DELETE',
    headers: buildHeaders(false),
    credentials: 'include',
  })

  if (!response.ok) {
    const error = await response.json().catch(() => null)
    throw new Error(error?.message || 'Failed to delete sala')
  }

  const result: ApiResponse<{ deleted: boolean }> = await response.json()
  return result.data.deleted
}

export async function getNodesByClientFromBackend(clientId: string): Promise<NodeResponse[]> {
  try {
    const url = `${API_BASE_URL}/nodes/clientes/${clientId}`
    console.log('[apiService] GET nodes by client:', { url, clientId })
    
    const response = await fetch(url, {
      method: 'GET',
      headers: buildHeaders(false),
      credentials: 'include',
    })

    console.log('[apiService] Response status:', response.status, response.statusText)
    if (!response.ok) {
      const message = await readApiError(response, `Failed to load nodes (${response.status})`)
      console.error('[apiService] Error response status:', response.status, 'message:', message)
      throw new Error(message)
    }

    const result: ApiResponse<NodeResponse[]> = await response.json()
    console.log('[apiService] Response data:', result)
    return result.data
  } catch (error) {
    console.error('[apiService] Error in getNodesByClientFromBackend:', error)
    throw error
  }
}

export interface NodeStatusResponse {
  nodeId: string;
  lastHeartbeat: string | null;
  secondsSinceLastHeartbeat: number | null;
  online: boolean;
  mqtt: boolean;
}

export interface NodeVerifyResponse {
  success: boolean;
  nodeId: string;
  message: string;
  deviceStatus: 'online' | 'offline';
  timestamp?: string;
  version?: string;
  uptime?: number;
  resetReason?: string;
}

export async function verifyNodeStatusInBackend(nodeId: string, idempotencyKey?: string): Promise<NodeVerifyResponse> {
  const url = `${API_BASE_URL}/nodes/${encodeURIComponent(nodeId)}/verify-status`
  const headers = buildHeaders()
  if (idempotencyKey) {
    headers['Idempotency-Key'] = idempotencyKey
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    credentials: 'include',
  })

  if (!response.ok) {
    const message = await readApiError(response, `Falha ao verificar status do node (${response.status})`)
    throw new Error(message)
  }

  const result: ApiResponse<NodeVerifyResponse> = await response.json()
  return result.data
}

export async function getAllNodesStatusFromBackend(): Promise<NodeStatusResponse[]> {
  try {
    const url = `${API_BASE_URL}/nodes/status`
    const response = await fetch(url, {
      method: 'GET',
      headers: buildHeaders(false),
      credentials: 'include',
    })
    if (!response.ok) {
      const message = await readApiError(response, `Failed to load node statuses (${response.status})`)
      throw new Error(message)
    }
    const result: ApiResponse<NodeStatusResponse[]> = await response.json()
    return result.data
  } catch (error) {
    console.error('[apiService] Error in getAllNodesStatusFromBackend:', error)
    throw error
  }
}

export async function getNodeStatusFromBackend(nodeId: string): Promise<NodeStatusResponse | null> {
  try {
    const url = `${API_BASE_URL}/nodes/${encodeURIComponent(nodeId)}/status`
    const response = await fetch(url, {
      method: 'GET',
      headers: buildHeaders(false),
      credentials: 'include',
    })
    if (!response.ok) {
      if (response.status === 404) return null
      const message = await readApiError(response, `Failed to load node status (${response.status})`)
      throw new Error(message)
    }
    const result: ApiResponse<NodeStatusResponse> = await response.json()
    return result.data
  } catch (error) {
    console.error('[apiService] Error in getNodeStatusFromBackend:', error)
    return null
  }
}

export async function createCtncNodeInBackend(salaId: string, data: NodeCreateRequest): Promise<NodeResponse> {
  try {
    const url = `${API_BASE_URL}/salas/${salaId}/nodes`
    console.log('[apiService] POST create CTN-C node:', { url, salaId, data })
    
    const response = await fetch(url, {
      method: 'POST',
      headers: buildHeaders(),
      credentials: 'include',
      body: JSON.stringify(data),
    })

    console.log('[apiService] Response status:', response.status, response.statusText)
    if (!response.ok) {
      const error = await response.json().catch(() => null)
      console.error('[apiService] Error response:', error)
      throw new Error(error?.message || `Failed to create node (${response.status})`)
    }

    const result: ApiResponse<NodeResponse> = await response.json()
    console.log('[apiService] Response data:', result)
    return result.data
  } catch (error) {
    console.error('[apiService] Error in createCtncNodeInBackend:', error)
    throw error
  }
}

export async function updateNodeInBackend(nodeId: string, data: NodeUpdateRequest): Promise<NodeResponse> {
  const response = await fetch(`${API_BASE_URL}/nodes/${nodeId}`, {
    method: 'PATCH',
    headers: buildHeaders(),
    credentials: 'include',
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => null)
    throw new Error(error?.message || 'Failed to update node')
  }

  const result: ApiResponse<NodeResponse> = await response.json()
  return result.data
}

export async function deleteNodeInBackend(nodeId: string): Promise<boolean> {
  const response = await fetch(`${API_BASE_URL}/nodes/${nodeId}`, {
    method: 'DELETE',
    headers: buildHeaders(false),
    credentials: 'include',
  })

  if (!response.ok) {
    const error = await response.json().catch(() => null)
    throw new Error(error?.message || 'Failed to delete node')
  }

  const result: ApiResponse<{ deleted: boolean }> = await response.json()
  return result.data.deleted
}

// ============================================================================
// Temperature Telemetry
// ============================================================================

export interface TemperatureTelemetry {
  id_node: string;
  temperatura: number;
  dth_medicao: string;
  dth_created_at: string;
  dth_updated_at: string;
}

export interface LastTemperatureByNode {
  [nodeId: string]: TemperatureTelemetry | null;
}

/**
 * Get last temperature measurement for a specific node
 */
export async function getLastTemperatureByNode(nodeId: string): Promise<TemperatureTelemetry | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/telemetry/nodes/${encodeURIComponent(nodeId)}/last`, {
      method: 'GET',
      headers: buildHeaders(false),
      credentials: 'include',
    })

    if (response.status === 404) {
      return null
    }

    if (!response.ok) {
      const error = await response.json().catch(() => null)
      throw new Error(error?.message || 'Failed to fetch temperature')
    }

    const result: ApiResponse<TemperatureTelemetry> = await response.json()
    return result.data
  } catch (error) {
    console.error('Error fetching last temperature:', error)
    return null
  }
}

/**
 * Get last temperatures for multiple nodes
 */
export async function getLastTemperaturesByNodes(nodeIds: string[]): Promise<LastTemperatureByNode> {
  if (nodeIds.length === 0) {
    console.log('[apiService] getLastTemperaturesByNodes called with empty nodeIds')
    return {}
  }

  try {
    const params = new URLSearchParams()
    nodeIds.forEach(nodeId => params.append('node_ids', nodeId))
    const url = `${API_BASE_URL}/telemetry/nodes/last?${params}`

    console.log('[apiService] GET last temperatures by nodes:', { url, nodeIds })
    const response = await fetch(url, {
      method: 'GET',
      headers: buildHeaders(false),
      credentials: 'include',
    })

    console.log('[apiService] Response status for telemetry:', response.status, response.statusText)
    if (!response.ok) {
      const error = await response.json().catch(() => null)
      throw new Error(error?.message || 'Failed to fetch temperatures')
    }

    const result: ApiResponse<LastTemperatureByNode> = await response.json()
    console.log('[apiService] Response data for telemetry:', result)
    return result.data || {}
  } catch (error) {
    console.error('[apiService] Error fetching last temperatures:', error)
    return {}
  }
}

export interface TemperatureHistoryPoint {
  timestamp: string
  temperatura: number
}

export interface TemperatureHistoryResponse {
  data: TemperatureHistoryPoint[]
  count: number
  date: string
}

/**
 * Get temperature history for a sala with 30-minute granularity
 */
export async function getTemperatureHistory(salaId: string, date?: string): Promise<TemperatureHistoryPoint[]> {
  try {
    let url = `${API_BASE_URL}/telemetry/salas/${encodeURIComponent(salaId)}/temperatura/historico`
    
    if (date) {
      url += `?date=${encodeURIComponent(date)}`
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: buildHeaders(false),
      credentials: 'include',
    })

    if (response.status === 404) {
      return []
    }

    if (!response.ok) {
      const error = await response.json().catch(() => null)
      throw new Error(error?.message || 'Failed to fetch temperature history')
    }

    const result: ApiResponse<TemperatureHistoryResponse> = await response.json()
    return result.data?.data || []
  } catch (error) {
    console.error('Error fetching temperature history:', error)
    return []
  }
}
