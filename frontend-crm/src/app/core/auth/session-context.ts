import { Injectable, signal } from '@angular/core';

export type Permission = 'dashboard.read' | 'customers.read' | 'customers.create' | 'customers.update';

export interface SessionUser {
  id: string;
  organizationId: string;
  name: string;
  role: 'admin' | 'manager' | 'employee';
  permissions: ReadonlySet<Permission>;
}

@Injectable({ providedIn: 'root' })
export class SessionContext {
  // Sesión de desarrollo reemplazable por el flujo JWT cuando exista el backend.
  readonly user = signal<SessionUser | null>({
    id: 'usr-andrea-torres',
    organizationId: 'speedlink-mx-01',
    name: 'Andrea Torres',
    role: 'admin',
    permissions: new Set<Permission>(['dashboard.read', 'customers.read', 'customers.create', 'customers.update']),
  });

  isAuthenticated(): boolean { return this.user() !== null; }
  hasPermission(permission: Permission): boolean { return this.user()?.permissions.has(permission) ?? false; }
}
