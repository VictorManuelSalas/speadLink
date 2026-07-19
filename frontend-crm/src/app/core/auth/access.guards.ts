import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Permission, SessionContext } from './session-context';

export const authenticatedGuard: CanActivateFn = (_route, state) => {
  const session = inject(SessionContext);
  const router = inject(Router);
  return session.isAuthenticated()
    ? true
    : router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};

export const guestGuard: CanActivateFn = () =>
  inject(SessionContext).isAuthenticated() ? inject(Router).createUrlTree(['/dashboard']) : true;

export function permissionGuard(permission: Permission): CanActivateFn {
  return () =>
    inject(SessionContext).hasPermission(permission)
      ? true
      : inject(Router).createUrlTree(['/forbidden']);
}
