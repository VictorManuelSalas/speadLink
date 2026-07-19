import { Injectable, signal } from '@angular/core';

export type Permission =
  | 'dashboard.read'
  | 'customers.read'
  | 'customers.create'
  | 'customers.update'
  | 'leads.read'
  | 'services.read'
  | 'equipment.read'
  | 'assignments.read'
  | 'contracts.read'
  | 'invoices.read'
  | 'payments.read'
  | 'expenses.read'
  | 'calendar.read'
  | 'tickets.read'
  | 'tickets.create'
  | 'tickets.update';

export interface SessionUser {
  id: string;
  organizationId: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'employee';
  permissions: ReadonlySet<Permission>;
  preferredLanguage: 'es' | 'en';
}

export interface LoginResult {
  success: boolean;
  message?: string;
}

interface StoredSessionUser extends Omit<SessionUser, 'permissions'> {
  permissions: Permission[];
}

const SESSION_KEY = 'speedlink-session';
const DEMO_EMAIL = 'andrea.torres@speedlink.mx';
const DEMO_PASSWORD = 'SpeedLink2026!';
const ADMIN_PERMISSIONS: readonly Permission[] = [
  'dashboard.read',
  'customers.read',
  'customers.create',
  'customers.update',
  'leads.read',
  'services.read',
  'equipment.read',
  'assignments.read',
  'contracts.read',
  'invoices.read',
  'payments.read',
  'expenses.read',
  'calendar.read',
  'tickets.read',
  'tickets.create',
  'tickets.update',
];

@Injectable({ providedIn: 'root' })
export class SessionContext {
  readonly user = signal<SessionUser | null>(this.restoreSession());

  isAuthenticated(): boolean {
    return this.user() !== null;
  }
  hasPermission(permission: Permission): boolean {
    return this.user()?.permissions.has(permission) ?? false;
  }

  login(email: string, password: string, remember: boolean): LoginResult {
    if (email.trim().toLocaleLowerCase() !== DEMO_EMAIL || password !== DEMO_PASSWORD) {
      return { success: false, message: 'El correo o la contraseña no son correctos.' };
    }

    const user: SessionUser = {
      id: 'usr-andrea-torres',
      organizationId: 'speedlink-mx-01',
      name: 'Andrea Torres',
      email: DEMO_EMAIL,
      role: 'admin',
      permissions: new Set(ADMIN_PERMISSIONS),
      preferredLanguage: this.preferredLanguage(),
    };
    this.user.set(user);
    this.persist(user, remember);
    return { success: true };
  }

  logout(): void {
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
    this.user.set(null);
  }

  private preferredLanguage(): 'es' | 'en' {
    return localStorage.getItem('speedlink-language') === 'en' ? 'en' : 'es';
  }

  private persist(user: SessionUser, remember: boolean): void {
    const serialized = JSON.stringify({ ...user, permissions: [...user.permissions] });
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
    (remember ? localStorage : sessionStorage).setItem(SESSION_KEY, serialized);
  }

  private restoreSession(): SessionUser | null {
    const serialized = sessionStorage.getItem(SESSION_KEY) ?? localStorage.getItem(SESSION_KEY);
    if (!serialized) return null;
    try {
      const stored = JSON.parse(serialized) as StoredSessionUser;
      if (!stored.id || !stored.email || !Array.isArray(stored.permissions)) throw new Error();
      return { ...stored, permissions: new Set(stored.permissions) };
    } catch {
      localStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem(SESSION_KEY);
      return null;
    }
  }
}
