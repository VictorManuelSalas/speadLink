import { Routes } from '@angular/router';
import { authenticatedGuard, permissionGuard } from './core/auth/access.guards';

export const routes: Routes = [
  {
    path: '',
    canActivate: [authenticatedGuard],
    loadComponent: () => import('./core/layout/app-shell').then((m) => m.AppShell),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', canActivate: [permissionGuard('dashboard.read')], title: 'Dashboard | SpeedLink CRM', loadComponent: () => import('./features/dashboard/dashboard-page').then((m) => m.DashboardPage) },
      { path: 'customers', canActivate: [permissionGuard('customers.read')], title: 'Clientes | SpeedLink CRM', loadComponent: () => import('./features/customers/customers-page').then((m) => m.CustomersPage) },
      { path: 'customers/:id', canActivate: [permissionGuard('customers.read')], title: 'Detalle de cliente | SpeedLink CRM', loadComponent: () => import('./features/customers/customer-detail-page').then((m) => m.CustomerDetailPage) },
    ],
  },
  { path: 'login', title: 'Acceso | SpeedLink CRM', loadComponent: () => import('./features/system-message-page').then((m) => m.SystemMessagePage), data: { title: 'Acceso requerido', message: 'La autenticación se conectará al backend en una fase posterior.' } },
  { path: 'forbidden', title: 'Sin permiso | SpeedLink CRM', loadComponent: () => import('./features/system-message-page').then((m) => m.SystemMessagePage), data: { title: 'Sin permisos', message: 'Tu cuenta no tiene acceso a esta sección.' } },
  { path: '**', title: 'Página no encontrada | SpeedLink CRM', loadComponent: () => import('./features/not-found-page').then((m) => m.NotFoundPage) },
];
