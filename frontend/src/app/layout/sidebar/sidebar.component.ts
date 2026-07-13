import { Component, DestroyRef, EventEmitter, inject, Input, Output, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

interface NavItem { label: string; icon: string; path: string; }
interface NavGroup { label: string; items: NavItem[]; }

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, TranslatePipe],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss'
})
export class SidebarComponent {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  @Input() collapsed = false;
  @Output() readonly toggleCollapsed = new EventEmitter<void>();

  readonly settingsMode = signal(this.router.url.startsWith('/settings'));

  readonly mainGroups: NavGroup[] = [
    { label: 'nav.main', items: [
      { label: 'nav.dashboard', icon: '/icons/menu/fi-sr-apps.svg', path: '/dashboard' },
      { label: 'nav.clients', icon: '/icons/menu/fi-rr-portrait.svg', path: '/clients' },
      { label: 'nav.leads', icon: '/icons/menu/fi-rr-interactive.svg', path: '/leads' }
    ]},
    { label: 'nav.network', items: [
      { label: 'nav.assignments', icon: '/icons/menu/fi-rr-reflect.svg', path: '/assignments' },
      { label: 'nav.services', icon: '/icons/menu/fi-rr-database.svg', path: '/services' },
      { label: 'nav.equipment', icon: '/icons/menu/fi-rr-subtitles.svg', path: '/equipment' }
    ]},
    { label: 'nav.features', items: [
      { label: 'nav.invoices', icon: '/icons/menu/fi-rr-document.svg', path: '/invoices' },
      { label: 'nav.payments', icon: '/icons/menu/fi-rr-subtitles.svg', path: '/payments' },
      { label: 'nav.expenses', icon: '/icons/menu/fi-rr-diploma.svg', path: '/expenses' },
      { label: 'nav.calendar', icon: '/icons/menu/fi-rr-calendar.svg', path: '/calendar' }
    ]}
  ];

  readonly settingsGroups: NavGroup[] = [
    { label: 'nav.general', items: [
      { label: 'nav.organization', icon: '/icons/settings/fi-rr-building.svg', path: '/settings/organization' },
      { label: 'nav.users', icon: '/icons/settings/fi-rr-portrait-2.svg', path: '/settings/users' },
      { label: 'nav.roles', icon: '/icons/menu/fi-rr-diploma.svg', path: '/settings/roles' }
    ]},
    { label: 'nav.channels', items: [
      { label: 'nav.smtp', icon: '/icons/settings/fi-rr-envelope.svg', path: '/settings/smtp' },
      { label: 'nav.sms', icon: '/icons/settings/fi-rr-comments.svg', path: '/settings/sms' },
      { label: 'nav.portal', icon: '/icons/settings/fi-rr-layers.svg', path: '/settings/portal' }
    ]},
    { label: 'nav.customization', items: [
      { label: 'nav.templates', icon: '/icons/menu/fi-rr-document.svg', path: '/settings/templates' },
      { label: 'nav.modules', icon: '/icons/menu/fi-rr-apps.svg', path: '/settings/modules' }
    ]},
    { label: 'nav.automation', items: [
      { label: 'nav.workflows', icon: '/icons/settings/fi-rr-chart-tree.svg', path: '/settings/workflows' },
      { label: 'nav.schedules', icon: '/icons/settings/fi-rr-time-forward.svg', path: '/settings/schedules' }
    ]},
    { label: 'nav.security', items: [
      { label: 'nav.activity', icon: '/icons/menu/fi-rr-document.svg', path: '/settings/activity' },
      { label: 'nav.audit', icon: '/icons/settings/fi-rr-bug.svg', path: '/settings/audit' },
      { label: 'nav.ipRestrictions', icon: '/icons/settings/fi-rr-lock.svg', path: '/settings/ip-restrictions' },
      { label: 'nav.twoFactor', icon: '/icons/settings/fi-rr-lock.svg', path: '/settings/2fa' }
    ]},
    { label: 'nav.integrations', items: [
      { label: 'nav.webhooks', icon: '/icons/settings/fi-rr-resize.svg', path: '/settings/webhooks' },
      { label: 'nav.apis', icon: '/icons/settings/fi-rr-clouds.svg', path: '/settings/apis' },
      { label: 'nav.connections', icon: '/icons/settings/fi-rr-cube.svg', path: '/settings/connections' }
    ]}
  ];

  constructor() {
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe((event) => this.settingsMode.set(event.urlAfterRedirects.startsWith('/settings')));
  }
}
