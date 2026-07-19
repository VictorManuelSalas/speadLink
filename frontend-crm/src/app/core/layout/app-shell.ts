import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  HostListener,
  inject,
  signal,
  ViewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { SessionContext } from '../auth/session-context';
import { LanguageService } from '../i18n/language.service';

interface NavItem {
  label: string;
  icon: string;
  route: string;
}
interface NavGroup {
  title: string;
  items: readonly NavItem[];
}
interface AppNotification {
  title: string;
  detail: string;
  time: string;
  tone: 'orange' | 'blue' | 'red' | 'green' | 'purple';
  unread: boolean;
  route: string[];
  queryParams?: Readonly<Record<string, string>>;
}

@Component({
  selector: 'app-shell',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <div class="app-frame" [class.app-frame--dark]="darkMode()">
      @if (mobileOpen()) {
        <button
          class="backdrop"
          aria-label="Cerrar navegación"
          (click)="mobileOpen.set(false)"
        ></button>
      }
      <aside
        class="sidebar"
        [class.sidebar--collapsed]="collapsed()"
        [class.sidebar--open]="mobileOpen()"
      >
        <div class="brand">
          <span class="brand__mark" aria-hidden="true"
            ><img src="/icons/brand/speedlink-logo.svg" alt=""
          /></span>
          @if (!collapsed()) {
            <span
              >SpeedLink <b>{{ settingsMode() ? 'Configuración' : 'CRM' }}</b></span
            >
          }
          <button
            class="icon-button sidebar__close"
            aria-label="Cerrar menú"
            (click)="mobileOpen.set(false)"
          >
            ×
          </button>
        </div>
        <nav class="nav" aria-label="Navegación principal">
          @if (settingsMode()) {
            <a class="nav__mode-switch" routerLink="/dashboard" (click)="closeMobile()"
              ><span class="nav-icon"
                ><img src="/icons/ui/fi-rr-angle-double-small-left.svg" alt=""
              /></span>
              @if (!collapsed()) {
                <span>Volver al menú principal</span>
              }
            </a>
          }
          @for (group of settingsMode() ? settingsNavigation : navigation; track group.title) {
            @if (!collapsed()) {
              <p class="nav__label">{{ i18n.t(group.title) }}</p>
            }
            @for (item of group.items; track item.label) {
              <a
                [routerLink]="item.route"
                routerLinkActive="is-active"
                [routerLinkActiveOptions]="{ exact: true }"
                (click)="closeMobile()"
                [attr.title]="collapsed() ? i18n.t(item.label) : null"
                ><span class="nav-icon"><img [src]="item.icon" alt="" /></span>
                @if (!collapsed()) {
                  <span>{{ i18n.t(item.label) }}</span>
                }
              </a>
            }
          }
        </nav>
        <div class="sidebar__footer">
          <button
            class="nav-button"
            (click)="collapsed.set(!collapsed())"
            [attr.aria-label]="collapsed() ? 'Expandir sidebar' : 'Contraer sidebar'"
          >
            <span>{{ collapsed() ? '›' : '‹' }}</span>
            @if (!collapsed()) {
              <span>Contraer menú</span>
            }
          </button>
          <div
            class="user-menu"
            (mouseenter)="userMenuOpen.set(true)"
            (mouseleave)="userMenuOpen.set(false)"
          >
            <button
              class="user-chip"
              type="button"
              aria-label="Abrir menú de usuario"
              (click)="userMenuOpen.set(true)"
            >
              <span class="avatar avatar--sm">{{ userInitials() }}</span>
              @if (!collapsed()) {
                <span
                  ><b>{{ session.user()?.name }}</b
                  ><small>{{ userRole() }}</small></span
                >
              }
            </button>
            @if (userMenuOpen()) {
              <section class="user-popover" aria-label="Opciones de usuario">
                <div class="user-popover__summary">
                  <span class="avatar">{{ userInitials() }}</span
                  ><span
                    ><b>{{ session.user()?.name }}</b
                    ><small>{{ session.user()?.email }}</small></span
                  >
                </div>
                <a routerLink="/users/usr-andrea-torres" (click)="userMenuOpen.set(false)"
                  ><img src="/icons/settings/fi-rr-portrait-2.svg" alt="" /><span>{{
                    i18n.t('Ver perfil')
                  }}</span></a
                >
                <button type="button" (click)="toggleDarkMode()">
                  <img
                    [src]="darkMode() ? '/icons/ui/fi-sr-rec.svg' : '/icons/ui/fi-sr-moon.svg'"
                    alt=""
                  /><span>{{ i18n.t(darkMode() ? 'Modo claro' : 'Modo oscuro') }}</span>
                </button>
                <div class="user-popover__language">
                  <span>{{ i18n.t('Idioma') }}</span>
                  <div>
                    <button
                      type="button"
                      [class.is-active]="i18n.language() === 'es'"
                      (click)="i18n.setLanguage('es')"
                    >
                      ES</button
                    ><button
                      type="button"
                      [class.is-active]="i18n.language() === 'en'"
                      (click)="i18n.setLanguage('en')"
                    >
                      EN
                    </button>
                  </div>
                </div>
                <button class="user-popover__signout" type="button" (click)="signOut()">
                  <img src="/icons/actions/fi-sr-sign-out-alt.svg" alt="" /><span>{{
                    i18n.t('Cerrar sesión')
                  }}</span>
                </button>
              </section>
            }
          </div>
        </div>
      </aside>
      <section class="workspace">
        <header class="topbar">
          <button
            class="icon-button mobile-menu"
            aria-label="Abrir menú"
            (click)="mobileOpen.set(true)"
          >
            ☰
          </button>
          <div class="search-shell" (mouseleave)="closeQuickAccess()">
            <label class="global-search"
              ><img src="/icons/actions/fi-br-search.svg" alt="" /><input
                #globalSearch
                type="search"
                [placeholder]="i18n.t('Buscar módulos…')"
                aria-label="Búsqueda global"
                (focus)="searchOpen.set(true)"
                (input)="updateSearch($event)"
                (keydown)="handleSearchKeydown($event)"
              /><kbd><img src="/icons/ui/command.svg" alt="Command" /> K</kbd></label
            >
            @if (searchOpen()) {
              <section class="search-palette" aria-label="Acceso rápido">
                <header>
                  <span>{{ i18n.t('Acceso rápido') }}</span
                  ><small>Enter para abrir · Esc para cerrar</small>
                </header>
                @for (item of searchResults(); track item.route) {
                  <button
                    (mousedown)="$event.preventDefault()"
                    (click)="openSearchResult(item.route)"
                  >
                    <img [src]="item.icon" alt="" /><span
                      ><b>{{ item.label }}</b
                      ><small>{{ item.section }}</small></span
                    ><i>↵</i>
                  </button>
                } @empty {
                  <p>No se encontraron módulos.</p>
                }
              </section>
            }
          </div>
          <div class="topbar__actions">
            <a
              class="icon-button settings-button"
              [routerLink]="settingsMode() ? '/dashboard' : '/settings/organization'"
              [attr.aria-label]="settingsMode() ? 'Cerrar configuración' : 'Abrir configuración'"
              ><img src="/icons/ui/settings-sliders.svg" alt=""
            /></a>
            <div
              class="notification-menu"
              (mouseenter)="notificationsOpen.set(true)"
              (mouseleave)="notificationsOpen.set(false)"
            >
              <button
                class="icon-button notification-button"
                [attr.aria-label]="unreadNotificationCount() + ' notificaciones sin leer'"
                (click)="notificationsOpen.set(true)"
              >
                <img src="/icons/ui/bell.svg" alt="" />
                @if (unreadNotificationCount() > 0) {
                  <span class="notification-badge">{{ unreadNotificationCount() }}</span>
                }
              </button>
              @if (notificationsOpen()) {
                <section class="notification-panel" aria-label="Notificaciones">
                  <div class="panel-heading">
                    <b>Notificaciones</b><span>{{ unreadNotificationCount() }} nuevas</span>
                  </div>
                  @for (notification of allNotifications.slice(0, 3); track notification.title) {
                    <button class="notification-preview" (click)="openNotification(notification)">
                      <i class="notification-tone notification-tone--{{ notification.tone }}"></i
                      ><span
                        ><b>{{ notification.title }}</b
                        ><small>{{ notification.detail }} · {{ notification.time }}</small></span
                      >
                    </button>
                  }
                  <button class="notification-see-all" (click)="openNotificationDrawer()">
                    Ver todas
                  </button>
                </section>
              }
            </div>
            <a class="button button--primary topbar__new" routerLink="/tickets"
              >＋ <span>{{ i18n.t('Nuevo ticket') }}</span></a
            >
          </div>
        </header>
        <main class="page"><router-outlet /></main>
      </section>
      @if (notificationDrawerOpen()) {
        <button
          class="drawer-backdrop"
          [class.drawer-backdrop--closing]="notificationDrawerClosing()"
          aria-label="Cerrar notificaciones"
          (click)="closeNotificationDrawer()"
        ></button>
        <aside
          class="notification-drawer"
          [class.notification-drawer--closing]="notificationDrawerClosing()"
          aria-label="Todas las notificaciones"
        >
          <header>
            <div>
              <span class="drawer-eyebrow">SpeedLink CRM</span>
              <h2>Todas las notificaciones</h2>
            </div>
            <button class="drawer-close" aria-label="Cerrar" (click)="closeNotificationDrawer()">
              ×
            </button>
          </header>
          <div class="drawer-summary">
            <span
              ><b>{{ unreadNotificationCount() }}</b> sin leer</span
            ><button (click)="markAllNotificationsRead()">Marcar todas como leídas</button>
          </div>
          <div class="notification-list">
            @for (notification of allNotifications; track notification.title) {
              <button
                type="button"
                class="notification-item"
                [class.is-unread]="notification.unread"
                (click)="openNotification(notification)"
              >
                <i class="notification-tone notification-tone--{{ notification.tone }}"></i>
                <div>
                  <b>{{ notification.title }}</b>
                  <p>{{ notification.detail }}</p>
                  <small>{{ notification.time }}</small>
                </div>
                @if (notification.unread) {
                  <span class="unread-marker"></span>
                }
              </button>
            }
          </div>
        </aside>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppShell {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  readonly session = inject(SessionContext);
  readonly i18n = inject(LanguageService);
  @ViewChild('globalSearch') private globalSearch?: ElementRef<HTMLInputElement>;
  readonly collapsed = signal(false);
  readonly mobileOpen = signal(false);
  readonly darkMode = signal(this.readStoredTheme());
  readonly userMenuOpen = signal(false);
  readonly searchOpen = signal(false);
  readonly searchQuery = signal('');
  readonly notificationsOpen = signal(false);
  readonly notificationDrawerOpen = signal(false);
  readonly notificationDrawerClosing = signal(false);
  readonly settingsMode = signal(this.router.url.startsWith('/settings'));
  readonly allNotifications: AppNotification[] = [
    {
      title: 'Nuevo correo recibido',
      detail: 'José Luis Hernández · Re: actualización del servicio',
      time: 'Hace 4 min',
      tone: 'blue',
      unread: true,
      route: ['/customers', 'SL-1044'],
      queryParams: { tab: 'Correos' },
    },
    {
      title: 'Factura próxima a vencer',
      detail: 'Rocío Macías · INV-2026-39437',
      time: 'Hace 10 min',
      tone: 'orange',
      unread: true,
      route: ['/invoices', 'INV-4484'],
    },
    {
      title: 'Nueva instalación programada',
      detail: 'Karime Galves · 15:00 - 16:30',
      time: 'Hace 35 min',
      tone: 'blue',
      unread: true,
      route: ['/customers', 'SL-1042'],
      queryParams: { tab: 'Eventos' },
    },
    {
      title: 'Factura vencida',
      detail: 'INV-2026-39407 · $460.00 MXN',
      time: 'Hace 1 h',
      tone: 'red',
      unread: true,
      route: ['/invoices', 'INV-4481'],
    },
    {
      title: 'Pago recibido',
      detail: 'Miriam Guerrero · $500.00 MXN',
      time: 'Hace 2 h',
      tone: 'green',
      unread: true,
      route: ['/payments', 'PAY-74021'],
    },
    {
      title: 'Nuevo cliente registrado',
      detail: 'Perla Ramírez',
      time: 'Hace 3 h',
      tone: 'purple',
      unread: true,
      route: ['/customers', 'SL-1042'],
    },
    {
      title: 'Instalación completada',
      detail: 'Ivet Martínez · Servicio básico',
      time: 'Ayer',
      tone: 'blue',
      unread: false,
      route: ['/assignments', 'ASG-7831'],
    },
    {
      title: 'Recordatorio de seguimiento',
      detail: 'Lead: Carlos Hernández',
      time: 'Ayer',
      tone: 'orange',
      unread: false,
      route: ['/leads', 'LD-1084'],
      queryParams: { tab: 'Eventos' },
    },
    {
      title: 'Servicio actualizado',
      detail: 'Rocío Macías · Plan intermedio',
      time: 'Hace 2 días',
      tone: 'green',
      unread: false,
      route: ['/services', 'SRV-100'],
    },
  ];
  readonly quickLinks = [
    {
      label: 'Dashboard',
      section: 'Menú principal',
      icon: '/icons/menu/fi-sr-apps.svg',
      route: '/dashboard',
    },
    {
      label: 'Clientes',
      section: 'Menú principal',
      icon: '/icons/menu/fi-rr-portrait.svg',
      route: '/customers',
    },
    {
      label: 'Leads',
      section: 'Menú principal',
      icon: '/icons/menu/fi-rr-interactive.svg',
      route: '/leads',
    },
    {
      label: 'Servicios',
      section: 'Red',
      icon: '/icons/menu/fi-rr-database.svg',
      route: '/services',
    },
    {
      label: 'Equipamiento',
      section: 'Red',
      icon: '/icons/menu/fi-rr-subtitles.svg',
      route: '/equipment',
    },
    {
      label: 'Asignaciones',
      section: 'Red',
      icon: '/icons/menu/fi-rr-reflect.svg',
      route: '/assignments',
    },
    {
      label: 'Contratos',
      section: 'Comercial',
      icon: '/icons/menu/fi-rr-document.svg',
      route: '/contracts',
    },
    {
      label: 'Tickets',
      section: 'Funciones',
      icon: '/icons/settings/fi-rr-comments.svg',
      route: '/tickets',
    },
    {
      label: 'Facturas',
      section: 'Funciones',
      icon: '/icons/menu/fi-rr-document.svg',
      route: '/invoices',
    },
    {
      label: 'Pagos',
      section: 'Funciones',
      icon: '/icons/menu/fi-rr-subtitles.svg',
      route: '/payments',
    },
    {
      label: 'Gastos',
      section: 'Funciones',
      icon: '/icons/menu/fi-rr-diploma.svg',
      route: '/expenses',
    },
    {
      label: 'Calendario',
      section: 'Funciones',
      icon: '/icons/menu/fi-rr-calendar.svg',
      route: '/calendar',
    },
    {
      label: 'Configuración de organización',
      section: 'Preferencias',
      icon: '/icons/settings/fi-rr-building.svg',
      route: '/settings/organization',
    },
    {
      label: 'Usuarios',
      section: 'Preferencias',
      icon: '/icons/settings/fi-rr-portrait-2.svg',
      route: '/settings/users',
    },
  ];
  readonly searchResults = computed(() => {
    const query = this.searchQuery().trim().toLocaleLowerCase('es');
    return query
      ? this.quickLinks.filter((item) => item.label.toLocaleLowerCase('es').includes(query))
      : this.quickLinks;
  });
  readonly navigation: readonly NavGroup[] = [
    {
      title: 'MENÚ PRINCIPAL',
      items: [
        { label: 'Dashboard', icon: '/icons/menu/fi-sr-apps.svg', route: '/dashboard' },
        { label: 'Clientes', icon: '/icons/menu/fi-rr-portrait.svg', route: '/customers' },
        { label: 'Leads', icon: '/icons/menu/fi-rr-interactive.svg', route: '/leads' },
      ],
    },
    {
      title: 'RED',
      items: [
        { label: 'Asignaciones', icon: '/icons/menu/fi-rr-reflect.svg', route: '/assignments' },
        { label: 'Servicios', icon: '/icons/menu/fi-rr-database.svg', route: '/services' },
        { label: 'Equipamiento', icon: '/icons/menu/fi-rr-subtitles.svg', route: '/equipment' },
      ],
    },
    {
      title: 'COMERCIAL',
      items: [{ label: 'Contratos', icon: '/icons/menu/fi-rr-document.svg', route: '/contracts' }],
    },
    {
      title: 'FUNCIONES',
      items: [
        { label: 'Facturas', icon: '/icons/menu/fi-rr-document.svg', route: '/invoices' },
        { label: 'Pagos', icon: '/icons/menu/fi-rr-subtitles.svg', route: '/payments' },
        { label: 'Gastos', icon: '/icons/menu/fi-rr-diploma.svg', route: '/expenses' },
        { label: 'Calendario', icon: '/icons/menu/fi-rr-calendar.svg', route: '/calendar' },
        { label: 'Tickets', icon: '/icons/settings/fi-rr-comments.svg', route: '/tickets' },
      ],
    },
  ];
  readonly settingsNavigation: readonly NavGroup[] = [
    {
      title: 'AJUSTES',
      items: [
        {
          label: 'Centro de configuración',
          icon: '/icons/menu/fi-sr-apps.svg',
          route: '/settings',
        },
      ],
    },
    {
      title: 'GENERAL',
      items: [
        {
          label: 'Configuración de organización',
          icon: '/icons/settings/fi-rr-building.svg',
          route: '/settings/organization',
        },
        {
          label: 'Usuarios',
          icon: '/icons/settings/fi-rr-portrait-2.svg',
          route: '/settings/users',
        },
        {
          label: 'Roles y permisos',
          icon: '/icons/menu/fi-rr-diploma.svg',
          route: '/settings/roles',
        },
        {
          label: 'Impuestos',
          icon: '/icons/menu/fi-rr-document.svg',
          route: '/settings/taxes',
        },
      ],
    },
    {
      title: 'CANALES',
      items: [
        { label: 'SMTP', icon: '/icons/settings/fi-rr-envelope.svg', route: '/settings/smtp' },
        { label: 'SMS', icon: '/icons/settings/fi-rr-comments.svg', route: '/settings/sms' },
        { label: 'Portal', icon: '/icons/settings/fi-rr-layers.svg', route: '/settings/portal' },
      ],
    },
    {
      title: 'PERSONALIZACIÓN',
      items: [
        {
          label: 'Plantillas',
          icon: '/icons/menu/fi-rr-document.svg',
          route: '/settings/templates',
        },
        { label: 'Módulos', icon: '/icons/settings/fi-rr-apps.svg', route: '/settings/modules' },
      ],
    },
    {
      title: 'AUTOMATIZACIÓN',
      items: [
        {
          label: 'Flujos de trabajo',
          icon: '/icons/settings/fi-rr-chart-tree.svg',
          route: '/settings/workflows',
        },
        {
          label: 'Programaciones',
          icon: '/icons/settings/fi-rr-time-forward.svg',
          route: '/settings/schedules',
        },
      ],
    },
    {
      title: 'SEGURIDAD',
      items: [
        {
          label: 'Registro de actividad',
          icon: '/icons/menu/fi-rr-document.svg',
          route: '/settings/activity',
        },
        { label: 'Auditoría', icon: '/icons/settings/fi-rr-bug.svg', route: '/settings/audit' },
        {
          label: 'Restricciones IP',
          icon: '/icons/settings/fi-rr-lock.svg',
          route: '/settings/ip-restrictions',
        },
        {
          label: 'Inicio de sesión 2FA',
          icon: '/icons/settings/fi-rr-lock.svg',
          route: '/settings/2fa',
        },
      ],
    },
    {
      title: 'INTEGRACIONES',
      items: [
        {
          label: 'Webhooks',
          icon: '/icons/settings/fi-rr-resize.svg',
          route: '/settings/webhooks',
        },
        { label: 'APIs', icon: '/icons/settings/fi-rr-clouds.svg', route: '/settings/apis' },
        {
          label: 'Conexiones',
          icon: '/icons/settings/fi-rr-cube.svg',
          route: '/settings/connections',
        },
      ],
    },
  ];

  constructor() {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((event) => this.settingsMode.set(event.urlAfterRedirects.startsWith('/settings')));
  }

  @HostListener('document:keydown.escape') closePanels(): void {
    this.mobileOpen.set(false);
    this.notificationsOpen.set(false);
    this.userMenuOpen.set(false);
    this.closeQuickAccess();
    this.globalSearch?.nativeElement.blur();
    if (this.notificationDrawerOpen()) this.closeNotificationDrawer();
  }

  @HostListener('document:keydown', ['$event']) handleGlobalShortcut(event: KeyboardEvent): void {
    if ((event.metaKey || event.ctrlKey) && event.key.toLocaleLowerCase() === 'k') {
      event.preventDefault();
      this.searchOpen.set(true);
      queueMicrotask(() => this.globalSearch?.nativeElement.focus());
    }
  }

  @HostListener('document:click', ['$event']) handleDocumentClick(event: MouseEvent): void {
    const target = event.target;
    if (target instanceof Element && !target.closest('.search-shell')) this.closeQuickAccess();
  }

  updateSearch(event: Event): void {
    this.searchQuery.set((event.target as HTMLInputElement).value);
    this.searchOpen.set(true);
  }
  handleSearchKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.closeQuickAccess();
      this.globalSearch?.nativeElement.blur();
    } else if (event.key === 'Enter' && this.searchResults().length > 0) {
      void this.openSearchResult(this.searchResults()[0].route);
    }
  }
  closeQuickAccess(): void {
    this.searchOpen.set(false);
  }
  async openSearchResult(route: string): Promise<void> {
    await this.router.navigateByUrl(route);
    this.searchOpen.set(false);
    this.searchQuery.set('');
    if (this.globalSearch) this.globalSearch.nativeElement.value = '';
  }

  unreadNotificationCount(): number {
    return this.allNotifications.filter((notification) => notification.unread).length;
  }
  openNotificationDrawer(): void {
    this.notificationsOpen.set(false);
    this.notificationDrawerClosing.set(false);
    this.notificationDrawerOpen.set(true);
  }
  closeNotificationDrawer(): void {
    if (this.notificationDrawerClosing()) return;
    this.notificationDrawerClosing.set(true);
    window.setTimeout(() => {
      this.notificationDrawerOpen.set(false);
      this.notificationDrawerClosing.set(false);
    }, 250);
  }
  markAllNotificationsRead(): void {
    this.allNotifications.forEach((notification) => (notification.unread = false));
  }
  async openNotification(notification: AppNotification): Promise<void> {
    notification.unread = false;
    this.notificationsOpen.set(false);
    this.notificationDrawerClosing.set(false);
    this.notificationDrawerOpen.set(false);
    await this.router.navigate(notification.route, { queryParams: notification.queryParams });
  }
  toggleDarkMode(): void {
    const darkMode = !this.darkMode();
    this.darkMode.set(darkMode);
    localStorage.setItem('speedlink-theme', darkMode ? 'dark' : 'light');
    this.userMenuOpen.set(false);
  }
  private readStoredTheme(): boolean {
    return localStorage.getItem('speedlink-theme') === 'dark';
  }
  signOut(): void {
    this.userMenuOpen.set(false);
    this.session.logout();
    void this.router.navigateByUrl('/login', { replaceUrl: true });
  }
  userInitials(): string {
    return (this.session.user()?.name ?? 'Usuario')
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toLocaleUpperCase();
  }
  userRole(): string {
    const role = this.session.user()?.role;
    return role === 'admin' ? 'Administradora' : role === 'manager' ? 'Gerente' : 'Usuario';
  }
  closeMobile(): void {
    this.mobileOpen.set(false);
  }
}
