import { Component, computed, DestroyRef, ElementRef, HostListener, inject, signal, ViewChild } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SidebarComponent } from './layout/sidebar/sidebar.component';
import { I18nService } from './core/i18n/i18n.service';
import { TranslatePipe } from './core/i18n/translate.pipe';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, SidebarComponent, TranslatePipe],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly i18n = inject(I18nService);
  protected readonly collapsed = signal(false);
  protected readonly darkMode = signal(false);
  protected readonly notificationsOpen = signal(false);
  protected readonly notificationDrawerOpen = signal(false);
  protected readonly notificationDrawerClosing = signal(false);
  protected readonly profileOpen = signal(false);
  protected readonly settingsMode = signal(this.router.url.startsWith('/settings'));
  protected readonly searchOpen = signal(false);
  protected readonly searchQuery = signal('');
  protected readonly quickLinks = [
    { label: 'nav.dashboard', section: 'nav.main', icon: '/icons/menu/fi-sr-apps.svg', path: '/dashboard' },
    { label: 'nav.clients', section: 'nav.main', icon: '/icons/menu/fi-rr-portrait.svg', path: '/clients' },
    { label: 'nav.invoices', section: 'nav.features', icon: '/icons/menu/fi-rr-document.svg', path: '/invoices' },
    { label: 'nav.calendar', section: 'nav.features', icon: '/icons/menu/fi-rr-calendar.svg', path: '/calendar' },
    { label: 'nav.organization', section: 'common.preferences', icon: '/icons/settings/fi-rr-building.svg', path: '/settings/organization' },
    { label: 'nav.users', section: 'common.preferences', icon: '/icons/settings/fi-rr-portrait-2.svg', path: '/settings/users' }
  ];
  protected readonly searchResults = computed(() => {
    const query = this.searchQuery().trim().toLocaleLowerCase('es');
    return query ? this.quickLinks.filter((item) => this.i18n.translate(item.label).toLocaleLowerCase(this.i18n.locale()).includes(query)) : this.quickLinks;
  });
  protected readonly allNotifications = [
    { title: 'Factura próxima a vencer', detail: 'Rocío Macías · INV-2026-39437', time: 'Hace 10 min', tone: 'orange', unread: true },
    { title: 'Nueva instalación programada', detail: 'Karime Galves · 15:00 - 16:30', time: 'Hace 35 min', tone: 'blue', unread: true },
    { title: 'Factura vencida', detail: 'INV-2026-39407 · $460.00 MXN', time: 'Hace 1 h', tone: 'red', unread: true },
    { title: 'Pago recibido', detail: 'Miriam Guerrero · $500.00 MXN', time: 'Hace 2 h', tone: 'green', unread: true },
    { title: 'Nuevo cliente registrado', detail: 'Perla Ramírez', time: 'Hace 3 h', tone: 'purple', unread: true },
    { title: 'Instalación completada', detail: 'Ivet Martínez · Servicio básico', time: 'Ayer', tone: 'blue', unread: false },
    { title: 'Recordatorio de seguimiento', detail: 'Lead: Carlos Hernández', time: 'Ayer', tone: 'orange', unread: false },
    { title: 'Servicio actualizado', detail: 'Rocío Macías · Plan intermedio', time: 'Hace 2 días', tone: 'green', unread: false }
  ];

  @ViewChild('globalSearch') private globalSearch?: ElementRef<HTMLInputElement>;

  constructor() {
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe((event) => this.settingsMode.set(event.urlAfterRedirects.startsWith('/settings')));
  }

  protected toggleTheme(): void {
    this.darkMode.update((value) => !value);
    this.profileOpen.set(false);
  }

  protected toggleSidebar(): void {
    this.collapsed.update((value) => !value);
  }

  protected toggleNotifications(): void {
    this.notificationsOpen.update((value) => !value);
    this.profileOpen.set(false);
  }

  protected toggleProfile(): void {
    this.profileOpen.update((value) => !value);
    this.notificationsOpen.set(false);
  }

  protected openNotificationDrawer(): void {
    this.notificationsOpen.set(false);
    this.notificationDrawerClosing.set(false);
    this.notificationDrawerOpen.set(true);
  }

  protected closeNotificationDrawer(): void {
    if (this.notificationDrawerClosing()) return;
    this.notificationDrawerClosing.set(true);
    window.setTimeout(() => {
      this.notificationDrawerOpen.set(false);
      this.notificationDrawerClosing.set(false);
    }, 250);
  }

  protected unreadNotificationCount(): number {
    return this.allNotifications.filter((notification) => notification.unread).length;
  }

  protected markAllNotificationsRead(): void {
    this.allNotifications.forEach((notification) => notification.unread = false);
  }

  @HostListener('document:keydown', ['$event'])
  protected handleGlobalShortcut(event: KeyboardEvent): void {
    if ((event.metaKey || event.ctrlKey) && event.key.toLocaleLowerCase() === 'k') {
      event.preventDefault();
      this.searchOpen.set(true);
      queueMicrotask(() => this.globalSearch?.nativeElement.focus());
    }
  }

  @HostListener('document:click', ['$event'])
  protected handleDocumentClick(event: MouseEvent): void {
    const target = event.target;
    if (target instanceof Element && !target.closest('.search-shell')) {
      this.closeQuickAccess();
    }
  }

  protected updateSearch(event: Event): void {
    this.searchQuery.set((event.target as HTMLInputElement).value);
    this.searchOpen.set(true);
  }

  protected handleSearchKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.searchOpen.set(false);
      this.globalSearch?.nativeElement.blur();
    } else if (event.key === 'Enter' && this.searchResults().length > 0) {
      void this.openSearchResult(this.searchResults()[0].path);
    }
  }

  protected closeQuickAccess(): void {
    this.searchOpen.set(false);
  }

  protected async openSearchResult(path: string): Promise<void> {
    await this.router.navigateByUrl(path);
    this.searchOpen.set(false);
    this.searchQuery.set('');
    if (this.globalSearch) this.globalSearch.nativeElement.value = '';
  }
}
