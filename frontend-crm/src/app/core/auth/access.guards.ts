import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Permission, SessionContext } from './session-context';

export const authenticatedGuard: CanActivateFn = () => {
  const session = inject(SessionContext);
  return session.isAuthenticated() ? true : inject(Router).createUrlTree(['/login']);
};

export function permissionGuard(permission: Permission): CanActivateFn {
  return () => inject(SessionContext).hasPermission(permission) ? true : inject(Router).createUrlTree(['/forbidden']);
}
