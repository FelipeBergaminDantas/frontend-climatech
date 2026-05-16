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

/**
 * Get all clientes from backend
 */
export async function getClientesFromBackend(onlyActive = true): Promise<ClienteResponse[]> {
  try {
    const queryString = new URLSearchParams({ only_active: String(onlyActive) });
    const response = await fetch(`${API_BASE_URL}/clientes?${queryString}`);
    if (!response.ok) throw new Error('Failed to fetch clientes');
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
    const response = await fetch(`${API_BASE_URL}/clientes/${id}`);
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
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
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
      headers: {
        'Content-Type': 'application/json',
      },
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

/**
 * Deactivate cliente in backend
 */
export async function deactivateClienteInBackend(id: string): Promise<ClienteResponse | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/clientes/${id}/deactivate`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
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
      headers: {
        'Content-Type': 'application/json',
      },
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
      headers: {
        'Content-Type': 'application/json',
      },
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
