import { ChangeDetectionStrategy, Component, HostListener, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

interface NavItem { label: string; icon: string; route?: string; disabled?: boolean; }

@Component({
  selector: 'app-shell',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <div class="app-frame">
      @if (mobileOpen()) { <button class="backdrop" aria-label="Cerrar navegación" (click)="mobileOpen.set(false)"></button> }
      <aside class="sidebar" [class.sidebar--collapsed]="collapsed()" [class.sidebar--open]="mobileOpen()">
        <div class="brand">
          <span class="brand__mark" aria-hidden="true">ϟ</span>
          @if (!collapsed()) { <span>SpeedLink <b>CRM</b></span> }
          <button class="icon-button sidebar__close" aria-label="Cerrar menú" (click)="mobileOpen.set(false)">×</button>
        </div>
        <nav class="nav" aria-label="Navegación principal">
          <a routerLink="/dashboard" routerLinkActive="is-active" [routerLinkActiveOptions]="{exact:true}" (click)="closeMobile()"><span>▦</span>@if (!collapsed()) { <span>Dashboard</span> }</a>
          @for (group of navigation; track group.title) {
            @if (!collapsed()) { <p class="nav__label">{{ group.title }}</p> }
            @for (item of group.items; track item.label) {
              @if (item.route) { <a [routerLink]="item.route" routerLinkActive="is-active" (click)="closeMobile()"><span>{{ item.icon }}</span>@if (!collapsed()) { <span>{{ item.label }}</span> }</a> }
              @else { <span class="nav__disabled" [attr.title]="item.label + ' · Próximamente'"><span>{{ item.icon }}</span>@if (!collapsed()) { <span>{{ item.label }} <small>Próximamente</small></span> }</span> }
            }
          }
        </nav>
        <div class="sidebar__footer">
          <button class="nav-button" (click)="collapsed.set(!collapsed())" [attr.aria-label]="collapsed() ? 'Expandir sidebar' : 'Contraer sidebar'"><span>{{ collapsed() ? '›' : '‹' }}</span>@if (!collapsed()) { <span>Contraer menú</span> }</button>
          <div class="user-chip"><span class="avatar avatar--sm">AT</span>@if (!collapsed()) { <span><b>Andrea Torres</b><small>Administradora</small></span> }</div>
        </div>
      </aside>
      <section class="workspace">
        <header class="topbar">
          <button class="icon-button mobile-menu" aria-label="Abrir menú" (click)="mobileOpen.set(true)">☰</button>
          <label class="global-search"><span>⌕</span><input type="search" placeholder="Buscar clientes, facturas, tickets…" aria-label="Búsqueda global"/><kbd>⌘ K</kbd></label>
          <div class="topbar__actions">
            <button class="icon-button notification-button" aria-label="3 notificaciones sin leer" (click)="notificationsOpen.set(!notificationsOpen())">♢<span class="notification-dot"></span></button>
            <a class="button button--primary topbar__new" routerLink="/customers">＋ <span>Nuevo cliente</span></a>
          </div>
          @if (notificationsOpen()) {
            <section class="notification-panel" aria-label="Notificaciones">
              <div class="panel-heading"><b>Notificaciones</b><button (click)="notificationsOpen.set(false)">Cerrar</button></div>
              <div class="notification"><i class="dot dot--amber"></i><span><b>3 facturas vencen hoy</b><small>Revisa los saldos pendientes</small></span></div>
              <div class="notification"><i class="dot dot--blue"></i><span><b>Instalación a las 13:00</b><small>Tepotzotlán · Carlos Mendoza</small></span></div>
              <div class="notification"><i class="dot dot--green"></i><span><b>Pago conciliado</b><small>Transferencia por $1,050 MXN</small></span></div>
            </section>
          }
        </header>
        <main class="page"><router-outlet /></main>
      </section>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppShell {
  readonly collapsed = signal(false);
  readonly mobileOpen = signal(false);
  readonly notificationsOpen = signal(false);
  readonly navigation = [
    { title: 'CRM', items: [{ label: 'Clientes', icon: '♙', route: '/customers' }, { label: 'Leads', icon: '◎', disabled: true }] },
    { title: 'OPERACIÓN', items: [{ label: 'Servicios', icon: '⌁', disabled: true }, { label: 'Red y equipos', icon: '⌘', disabled: true }, { label: 'Soporte', icon: '◇', disabled: true }] },
    { title: 'FINANZAS', items: [{ label: 'Facturas', icon: '▤', disabled: true }, { label: 'Pagos', icon: '◫', disabled: true }] },
  ] as const;

  @HostListener('document:keydown.escape') closePanels(): void { this.mobileOpen.set(false); this.notificationsOpen.set(false); }
  closeMobile(): void { this.mobileOpen.set(false); }
}
