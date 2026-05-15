// Admin credentials — never expose this in client-side bundles or public routes
// In production, replace with environment variables and server-side auth

import type { UserRole } from '@/types';

export const ADMIN_MASTER_CREDENTIALS = [
  {
    id: 'admin-master-1',
    name: 'Felipe Bergamin Dantas',
    email: 'felipedantas016@gmail.com',
    password: '050406Fe.',
    role: 'admin_master' as UserRole,
    twoFactorEnabled: false,
  },
  {
    id: 'admin-master-2',
    name: 'Rafael Alves',
    email: 'rafa_alves0901@hotmail.com',
    password: 'rafa_0901',
    role: 'admin_master' as UserRole,
    twoFactorEnabled: false,
  },
] as const;
