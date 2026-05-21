import type { User, UserRole } from '@/lib/types'

/** Matches backend isPrivileged (MANAGER | ADMIN). */
export function isPrivilegedRole(role: UserRole | undefined): boolean {
  return role === 'admin' || role === 'manager'
}

export function isAdminRole(role: UserRole | undefined): boolean {
  return role === 'admin'
}
