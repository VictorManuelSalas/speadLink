import { Routes } from '@angular/router';
import { authenticatedGuard, guestGuard, permissionGuard } from './core/auth/access.guards';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    canActivate: [guestGuard],
    title: 'SpeedLink | Internet para tu hogar',
    loadComponent: () =>
      import('./features/public/public-home-page/public-home-page').then(
        (m) => m.PublicHomePage,
      ),
  },
  {
    path: 'login',
    canActivate: [guestGuard],
    title: 'Acceso | SpeedLink CRM',
    loadComponent: () => import('./features/auth/login-page').then((m) => m.LoginPage),
  },
  {
    path: 'forbidden',
    title: 'Sin permiso | SpeedLink CRM',
    loadComponent: () => import('./features/system-message-page').then((m) => m.SystemMessagePage),
    data: { title: 'Sin permisos', message: 'Tu cuenta no tiene acceso a esta sección.' },
  },
  {
    path: 'portal/:slug',
    title: 'Portal de clientes | SpeedLink',
    loadComponent: () =>
      import('./features/client-portal/client-portal-page').then((m) => m.ClientPortalPage),
  },
  {
    path: '',
    canActivate: [authenticatedGuard],
    loadComponent: () => import('./core/layout/app-shell').then((m) => m.AppShell),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        canActivate: [permissionGuard('dashboard.read')],
        title: 'Dashboard | SpeedLink CRM',
        loadComponent: () =>
          import('./features/dashboard/dashboard-page').then((m) => m.DashboardPage),
      },
      {
        path: 'customers',
        canActivate: [permissionGuard('customers.read')],
        title: 'Clientes | SpeedLink CRM',
        loadComponent: () =>
          import('./features/customers/customers-page/customers-page').then(
            (m) => m.CustomersPage,
          ),
      },
      {
        path: 'customers/:id',
        canActivate: [permissionGuard('customers.read')],
        title: 'Detalle de cliente | SpeedLink CRM',
        loadComponent: () =>
          import('./features/customers/customer-detail-page/customer-detail-page').then(
            (m) => m.CustomerDetailPage,
          ),
      },
      {
        path: 'tickets',
        canActivate: [permissionGuard('tickets.read')],
        title: 'Tickets | SpeedLink CRM',
        loadComponent: () =>
          import('./features/tickets/tickets-page/tickets-page').then((m) => m.TicketsPage),
      },
      {
        path: 'tickets/:id',
        canActivate: [permissionGuard('tickets.read')],
        title: 'Detalle de ticket | SpeedLink CRM',
        loadComponent: () =>
          import('./features/tickets/ticket-detail-page/ticket-detail-page').then(
            (m) => m.TicketDetailPage,
          ),
      },
      ...(
        [
          ['leads', 'leads', 'leads.read', 'Leads'],
          ['services', 'services', 'services.read', 'Servicios'],
          ['equipment', 'equipment', 'equipment.read', 'Equipamiento'],
          ['assignments', 'assignments', 'assignments.read', 'Asignaciones'],
          ['contracts', 'contracts', 'contracts.read', 'Contratos'],
          ['invoices', 'invoices', 'invoices.read', 'Facturas'],
          ['payments', 'payments', 'payments.read', 'Pagos'],
          ['expenses', 'expenses', 'expenses.read', 'Gastos'],
        ] as const
      ).flatMap(([path, moduleKey, permission, title]) => [
        {
          path,
          canActivate: [permissionGuard(permission)],
          title: `${title} | SpeedLink CRM`,
          loadComponent: () =>
            import('./features/operations/operational-module-page/operational-module-page').then(
              (m) => m.OperationalModulePage,
            ),
          data: { moduleKey },
        },
        {
          path: `${path}/:id`,
          canActivate: [permissionGuard(permission)],
          title: `Detalle de ${title.toLowerCase()} | SpeedLink CRM`,
          loadComponent: () =>
            import(
              './features/operations/operational-record-detail-page/operational-record-detail-page'
            ).then((m) => m.OperationalRecordDetailPage),
          data: { moduleKey },
        },
      ]),
      {
        path: 'calendar',
        canActivate: [permissionGuard('calendar.read')],
        title: 'Calendario | SpeedLink CRM',
        loadComponent: () =>
          import('./features/calendar/calendar-page').then((m) => m.CalendarPage),
      },
      {
        path: 'users/:id',
        title: 'Perfil de usuario | SpeedLink CRM',
        loadComponent: () =>
          import('./features/users/user-profile-page').then((m) => m.UserProfilePage),
      },
      {
        path: 'settings',
        title: 'Centro de configuración | SpeedLink CRM',
        loadComponent: () =>
          import('./features/settings/settings-overview-page/settings-overview-page').then(
            (m) => m.SettingsOverviewPage,
          ),
      },
      {
        path: 'settings/portal',
        title: 'Portal de clientes | SpeedLink CRM',
        loadComponent: () =>
          import('./features/settings/settings-portal-page/settings-portal-page').then(
            (m) => m.SettingsPortalPage,
          ),
      },
      {
        path: 'settings/templates',
        title: 'Plantillas | SpeedLink CRM',
        loadComponent: () =>
          import('./features/settings/settings-templates-page/settings-templates-page').then(
            (m) => m.SettingsTemplatesPage,
          ),
      },
      ...(
        [
          ['organization', 'organization', 'Organización'],
          ['users', 'users', 'Usuarios'],
          ['roles', 'roles', 'Roles y permisos'],
          ['smtp', 'smtp', 'Servidor SMTP'],
          ['sms', 'sms', 'Mensajería SMS'],
          ['modules', 'modules', 'Módulos personalizados'],
          ['workflows', 'workflows', 'Flujos de trabajo'],
          ['schedules', 'schedules', 'Programaciones'],
          ['activity', 'activity', 'Registro de actividad'],
          ['audit', 'audit', 'Auditoría'],
          ['ip-restrictions', 'ip-restrictions', 'Restricciones IP'],
          ['2fa', '2fa', 'Autenticación 2FA'],
          ['webhooks', 'webhooks', 'Webhooks'],
          ['apis', 'apis', 'Acceso API'],
          ['connections', 'connections', 'Conexiones'],
          ['taxes', 'taxes', 'Impuestos'],
        ] as const
      ).map(([path, section, title]) => ({
        path: `settings/${path}`,
        title: `${title} | SpeedLink CRM`,
        loadComponent: () =>
          import('./features/settings/settings-section-page/settings-section-page').then(
            (m) => m.SettingsSectionPage,
          ),
        data: { section },
      })),
      {
        path: ':section',
        title: 'Módulo | SpeedLink CRM',
        loadComponent: () =>
          import('./features/system-message-page').then((m) => m.SystemMessagePage),
        data: {
          title: 'Módulo en preparación',
          message:
            'Esta sección ya forma parte de la navegación y se implementará en una siguiente fase.',
        },
      },
    ],
  },
  {
    path: '**',
    title: 'Página no encontrada | SpeedLink CRM',
    loadComponent: () => import('./features/not-found-page').then((m) => m.NotFoundPage),
  },
];
