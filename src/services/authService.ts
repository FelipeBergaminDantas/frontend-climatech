import type { User, UserRole } from '@/types';
import { mockUser, mockAdmin } from './mockData';
import { validatePassword } from '@/utils/validators';
import { MOCK_2FA_TOKEN } from '@/config/constants';
import { ADMIN_MASTER_CREDENTIALS } from '@/config/adminCredentials';

// In-memory store for registered users (mock)
let users: (User & { password: string })[] = [
  // Admin Masters
  ...ADMIN_MASTER_CREDENTIALS.map(admin => ({ ...admin, password: admin.password })),
  // Admin Cliente UNIFecaf
  {
    id: 'admin-client-1',
    name: 'Adm UNIFecaf',
    email: 'admin@unifecaf.com',
    password: 'Unifecaf@2024',
    role: 'admin_client' as UserRole,
    clientId: 'client-unifecaf',
    twoFactorEnabled: false,
  },
  // Usuário comum
  {
    id: 'user-1',
    name: 'Usuário Demo',
    email: 'usuario@demo.com',
    password: 'Demo@2024',
    role: 'user' as UserRole,
    clientId: 'client-demo',
    twoFactorEnabled: false,
  },
];

let currentSession: User | null = null;



export function login(email: string, password: string): User {
  const user = users.find(
    (u) => u.email === email && u.password === password
  );
  if (!user) {
    throw new Error('Credenciais inválidas.');
  }
  const { password: _pw, ...userWithoutPassword } = user;
  currentSession = userWithoutPassword;
  return userWithoutPassword;
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
  if (token !== MOCK_2FA_TOKEN) {
    throw new Error('Token 2FA inválido.');
  }
  return true;
}

export function logout(): void {
  currentSession = null;
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

  // Simulate returning a URL
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

/** Returns all users (without passwords) — admin only */
export function getAllUsers(): User[] {
  return users.map(({ password: _pw, ...u }) => u)
}

/** Creates a user with a specific role — admin only */
export function adminCreateUser(
  name: string,
  email: string,
  password: string,
  role: UserRole,
  clientId?: string
): User {
  validatePassword(password);
  if (users.find((u) => u.email === email)) throw new Error('E-mail já cadastrado.');
  
  // Validar que admin_client e user precisam de clientId
  // Admin Master não precisa de clientId
  if ((role === 'admin_client' || role === 'user') && !clientId) {
    throw new Error('clientId é obrigatório para este tipo de usuário.');
  }
  
  const newUser = {
    id: `user-${Date.now()}`,
    name,
    email,
    twoFactorEnabled: false,
    role,
    clientId: role === 'admin_master' ? undefined : clientId,
    password,
  };
  users.push(newUser);
  const { password: _pw, ...u } = newUser;
  return u;
}

/** Deletes a user by id */
export function deleteUser(id: string): void {
  users = users.filter(u => u.id !== id)
}

/** Verifies the password of a user by email — used for admin confirmation */
export function verifyPassword(email: string, password: string): boolean {
  return users.some(u => u.email === email && u.password === password)
}

/** Toggles a user's role between 'user' and 'admin_client' */
export function toggleUserRole(id: string): void {
  const idx = users.findIndex((u) => u.id === id);
  if (idx === -1) return;
  const currentRole = users[idx].role;
  // Não permite alterar admin_master
  if (currentRole === 'admin_master') return;
  const newRole: UserRole = currentRole === 'user' ? 'admin_client' : 'user';
  users[idx] = { ...users[idx], role: newRole };
}
