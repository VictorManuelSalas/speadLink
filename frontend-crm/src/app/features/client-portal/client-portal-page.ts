import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import {
  ClientPortalStore,
  PortalAttachment,
  PortalTicket,
} from '../../core/portal/client-portal.store';

type PortalTab = 'Resumen' | 'Mi perfil' | 'Facturación' | 'Tickets' | 'Archivos';

@Component({
  selector: 'app-client-portal-page',
  imports: [FormsModule, CurrencyPipe, DatePipe, DecimalPipe],
  templateUrl: './client-portal-page.html',
  styleUrl: './client-portal-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClientPortalPage {
  readonly store = inject(ClientPortalStore);
  private readonly route = inject(ActivatedRoute);
  readonly activeTab = signal<PortalTab>('Resumen');
  readonly editingProfile = signal(false);
  readonly ticketComposerOpen = signal(false);
  readonly selectedTicket = signal<PortalTicket | null>(null);
  readonly selectedFile = signal<PortalAttachment | null>(null);
  readonly loginError = signal('');
  readonly toast = signal('');
  readonly today = new Date();
  account = '';
  pin = '';
  ticketSubject = '';
  ticketDescription = '';
  ticketPriority: PortalTicket['priority'] = 'Media';
  profileName = '';
  profileEmail = '';
  profilePhone = '';
  profileAddress = '';
  profileCommunity = '';
  readonly validSlug = computed(
    () => this.route.snapshot.paramMap.get('slug') === this.store.config().slug,
  );
  readonly tabs = computed<PortalTab[]>(() => [
    'Resumen',
    'Mi perfil',
    ...(this.store.config().showInvoices || this.store.config().showPayments
      ? ['Facturación' as PortalTab]
      : []),
    ...(this.store.config().showTickets ? ['Tickets' as PortalTab] : []),
    ...(this.store.config().showAttachments ? ['Archivos' as PortalTab] : []),
  ]);
  private readonly enforceVisibleTab = effect(() => {
    if (!this.tabs().includes(this.activeTab())) this.activeTab.set('Resumen');
  });

  firstName(): string {
    return this.store.profile().name.split(' ')[0];
  }
  initials(): string {
    return this.store
      .profile()
      .name.split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toLocaleUpperCase();
  }
  fillDemo(): void {
    this.account = 'SL-1044';
    this.pin = '1044';
    this.loginError.set('');
  }
  login(): void {
    if (!this.store.login(this.account, this.pin))
      this.loginError.set('El número de cliente o PIN no son correctos.');
  }
  startProfileEdit(): void {
    const profile = this.store.profile();
    this.profileName = profile.name;
    this.profileEmail = profile.email;
    this.profilePhone = profile.phone;
    this.profileAddress = profile.address;
    this.profileCommunity = profile.community;
    this.editingProfile.set(true);
  }
  saveProfile(): void {
    if (!this.store.config().allowProfileEdit) return;
    this.store.updateProfile({
      name: this.profileName,
      email: this.profileEmail,
      phone: this.profilePhone,
      address: this.profileAddress,
      community: this.profileCommunity,
    });
    this.editingProfile.set(false);
    this.showToast('Información actualizada');
  }
  openTicketComposer(): void {
    if (!this.store.config().allowTicketCreation) return;
    this.ticketSubject = '';
    this.ticketDescription = '';
    this.ticketPriority = 'Media';
    this.ticketComposerOpen.set(true);
  }
  createTicket(): void {
    if (!this.store.config().allowTicketCreation) return;
    if (!this.ticketSubject.trim() || !this.ticketDescription.trim()) return;
    this.store.createTicket(
      this.ticketSubject.trim(),
      this.ticketDescription.trim(),
      this.ticketPriority,
    );
    this.ticketComposerOpen.set(false);
    this.activeTab.set('Tickets');
    this.showToast('Ticket creado correctamente');
  }
  uploadFiles(event: Event): void {
    if (!this.store.config().showAttachments) return;
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.store.addFiles(input.files);
      this.showToast(`${input.files.length} archivo(s) agregado(s)`);
      input.value = '';
    }
  }
  viewFile(file: PortalAttachment): void {
    if (file.url) window.open(file.url, '_blank', 'noopener');
    else this.selectedFile.set(file);
  }
  downloadFile(file: PortalAttachment): void {
    const url =
      file.url ??
      URL.createObjectURL(new Blob([`Documento del portal: ${file.name}`], { type: file.type }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = file.name;
    anchor.click();
    if (!file.url) URL.revokeObjectURL(url);
  }
  private showToast(message: string): void {
    this.toast.set(message);
    window.setTimeout(() => this.toast.set(''), 2500);
  }
}
