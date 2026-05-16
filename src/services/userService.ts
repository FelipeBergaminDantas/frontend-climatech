import type { User } from '@/types'
import { API_BASE_URL } from '@/services/apiService'
import { getAccessToken } from '@/services/authService'

function buildHeaders() {
  const accessToken = getAccessToken()
  return {
    'Content-Type': 'application/json',
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  }
}

async function parseResponse<T>(response: Response): Promise<T> {
  const result = await response.json().catch(() => null)
  if (!response.ok) {
    const errorMessage = result?.message ?? 'Erro ao comunicar com o servidor'
    throw new Error(errorMessage)
  }
  return result.data as T
}

export interface UserCreatePayload {
  name: string
  email: string
  password: string
  role: User['role']
  clientId?: string
}

export interface UserRoleChangePayload {
  role: User['role']
}

export async function getUsers(onlyActive = true): Promise<User[]> {
  const queryString = new URLSearchParams({ only_active: String(onlyActive) })
  const response = await fetch(`${API_BASE_URL}/users?${queryString.toString()}`, {
    method: 'GET',
    headers: buildHeaders(),
    credentials: 'include',
  })
  return parseResponse<User[]>(response)
}

export async function createUser(payload: UserCreatePayload): Promise<User> {
  const response = await fetch(`${API_BASE_URL}/users`, {
    method: 'POST',
    headers: buildHeaders(),
    credentials: 'include',
    body: JSON.stringify(payload),
  })
  return parseResponse<User>(response)
}

export async function changeUserRole(userId: string, payload: UserRoleChangePayload): Promise<User> {
  const response = await fetch(`${API_BASE_URL}/users/${userId}/role`, {
    method: 'PATCH',
    headers: buildHeaders(),
    credentials: 'include',
    body: JSON.stringify(payload),
  })
  return parseResponse<User>(response)
}

export async function deleteUser(userId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
    method: 'DELETE',
    headers: buildHeaders(),
    credentials: 'include',
  })
  await parseResponse<{ deleted: boolean }>(response)
}

export async function verifyCurrentPassword(password: string): Promise<boolean> {
  const response = await fetch(`${API_BASE_URL}/users/verify-password`, {
    method: 'POST',
    headers: buildHeaders(),
    credentials: 'include',
    body: JSON.stringify({ password }),
  })
  await parseResponse<{ verified: boolean }>(response)
  return true
}
