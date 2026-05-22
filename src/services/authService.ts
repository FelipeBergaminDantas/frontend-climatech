import type { User } from '@/types';
import { ACCESS_TOKEN_KEY } from '@/config/constants';
import { API_BASE_URL } from '@/services/apiService';
import { validatePassword } from '@/utils/validators';

const users: Array<User & { password: string }> = [];
let currentSession: User | null = null;

function setAccessToken(token: string | null, rememberMe = false) {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  sessionStorage.removeItem(ACCESS_TOKEN_KEY);

  if (token) {
    const storage = rememberMe ? localStorage : sessionStorage;
    storage.setItem(ACCESS_TOKEN_KEY, token);
  }
}

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY) ?? sessionStorage.getItem(ACCESS_TOKEN_KEY);
}

function syncCurrentSession(user: User | null) {
  currentSession = user;
}

function clearSession() {
  syncCurrentSession(null);
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
}

export async function login(email: string, password: string, rememberMe = false): Promise<User> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({
      email,
      password,
      remember_me: rememberMe,
    }),
  });

  if (!response.ok) {
    await response.json().catch(() => null);
    throw new Error('Informações inválidas');
  }

  const result = await response.json();
  const user: User = result.data.user;
  const token = result.data.access_token;

  syncCurrentSession(user);
  setAccessToken(token, rememberMe);

  return user;
}

export async function logout(): Promise<void> {
  await fetch(`${API_BASE_URL}/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  }).catch(() => {
    // Ignore logout errors to preserve client state
  });
  clearSession();
}

export async function refreshAccessToken(): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Falha ao renovar sessão.');
  }

  const result = await response.json();
  setAccessToken(result.data.access_token);
}

export function register(name: string, email: string, password: string): User {
  validatePassword(password);

  if (users.find((u) => u.email === email)) {
    throw new Error('E-mail já cadastrado.');
  }

  const newUser: User & { password: string } = {
    id: `user-${Date.now()}`,
    name,
    email,
    twoFactorEnabled: false,
    role: 'user',
    password,
  };

  users.push(newUser);

  const { password: _pw, ...userWithoutPassword } = newUser;
  return userWithoutPassword;
}
export function verify2FA(token: string): boolean {
  // TODO: Integrate with backend 2FA verification
  if (!token || token.length < 6) {
    throw new Error('Token 2FA inválido.');
  }
  return true;
}

export function uploadAvatar(file: File): string {
  const allowedTypes = ['image/jpeg', 'image/png'];
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Formato inválido. Use JPG ou PNG.');
  }

  const maxSizeBytes = 2 * 1024 * 1024; // 2 MB
  if (file.size > maxSizeBytes) {
    throw new Error('Arquivo muito grande. Tamanho máximo: 2 MB.');
  }

  const fakeUrl = `https://cdn.climatech.app/avatars/${Date.now()}.jpg`;
  return fakeUrl;
}
export function getCurrentSession(): User | null {
  return currentSession;
}

/** Returns true if the given email belongs to a registered user. */
export function isEmailRegistered(email: string): boolean {
  return users.some(u => u.email.toLowerCase() === email.toLowerCase())
}
