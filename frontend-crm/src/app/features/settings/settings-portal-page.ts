import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ClientPortalStore } from '../../core/portal/client-portal.store';

@Component({
  selector: 'app-settings-portal-page',
  imports: [FormsModule, RouterLink],
  templateUrl: './settings-portal-page.html',
  styleUrl: './settings-portal-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsPortalPage {
  readonly store = inject(ClientPortalStore);
  readonly saved = signal(false);
  name = this.store.config().name;
  slug = this.store.config().slug;
  primaryColor = this.store.config().primaryColor;
  supportEmail = this.store.config().supportEmail;
  showInvoices = this.store.config().showInvoices;
  showPayments = this.store.config().showPayments;
  showTickets = this.store.config().showTickets;
  showAttachments = this.store.config().showAttachments;
  allowProfileEdit = this.store.config().allowProfileEdit;
  allowTicketCreation = this.store.config().allowTicketCreation;

  previewUrl(): string {
    return `${window.location.origin}/portal/${this.store.config().slug}`;
  }
  togglePortal(enabled: boolean): void {
    this.store.updateConfig({ enabled });
  }
  save(): void {
    this.slug = this.slug
      .trim()
      .toLocaleLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-');
    this.store.updateConfig({
      name: this.name.trim() || 'Mi SpeedLink',
      slug: this.slug || 'speedlink',
      primaryColor: this.primaryColor,
      supportEmail: this.supportEmail,
      showInvoices: this.showInvoices,
      showPayments: this.showPayments,
      showTickets: this.showTickets,
      showAttachments: this.showAttachments,
      allowProfileEdit: this.allowProfileEdit,
      allowTicketCreation: this.allowTicketCreation,
    });
    this.saved.set(true);
    window.setTimeout(() => this.saved.set(false), 2500);
  }
  resetDraft(): void {
    const config = this.store.config();
    Object.assign(this, {
      name: config.name,
      slug: config.slug,
      primaryColor: config.primaryColor,
      supportEmail: config.supportEmail,
      showInvoices: config.showInvoices,
      showPayments: config.showPayments,
      showTickets: config.showTickets,
      showAttachments: config.showAttachments,
      allowProfileEdit: config.allowProfileEdit,
      allowTicketCreation: config.allowTicketCreation,
    });
  }
}
