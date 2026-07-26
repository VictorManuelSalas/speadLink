import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CustomerTicket } from '../../../core/models/customer';
import { LanguageService } from '../../../core/i18n/language.service';
import { PicklistOption, StyledPicklist } from '../../../shared/styled-picklist';

type TicketFilter = 'all' | 'active' | 'waiting' | 'resolved';

export interface NewCustomerTicket {
  subject: string;
  description: string;
  category: CustomerTicket['category'];
  priority: CustomerTicket['priority'];
  channel: CustomerTicket['channel'];
  assignedTo: string;
}

@Component({
  selector: 'app-customer-tickets-section',
  imports: [DatePipe, RouterLink, StyledPicklist],
  templateUrl: './customer-tickets-section.html',
  styleUrl: './customer-tickets-section.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomerTicketsSection {
  readonly i18n = inject(LanguageService);
  readonly tickets = input.required<ReadonlyArray<CustomerTicket>>();
  readonly customerName = input.required<string>();
  readonly customerId = input.required<string>();
  readonly ticketCreated = output<NewCustomerTicket>();
  readonly ticketStatusChanged = output<{
    ticket: CustomerTicket;
    status: CustomerTicket['status'];
  }>();
  readonly search = signal('');
  readonly selectedFilter = signal<TicketFilter>('all');
  readonly expandedTicketId = signal<string | null>(null);
  readonly previewTicket = signal<CustomerTicket | null>(null);
  readonly composerOpen = signal(false);
  readonly subjectDraft = signal('');
  readonly descriptionDraft = signal('');
  readonly categoryDraft = signal('Conectividad');
  readonly priorityDraft = signal('medium');
  readonly channelDraft = signal('Teléfono');
  readonly assigneeDraft = signal('Andrea Torres');
  readonly categoryOptions: ReadonlyArray<PicklistOption> = [
    'Conectividad',
    'Facturación',
    'Equipo',
    'Instalación',
    'Otro',
  ].map((value) => ({ value, label: value }));
  readonly priorityOptions: ReadonlyArray<PicklistOption> = [
    { value: 'low', label: 'Baja' },
    { value: 'medium', label: 'Media' },
    { value: 'high', label: 'Alta' },
    { value: 'urgent', label: 'Urgente' },
  ];
  readonly channelOptions: ReadonlyArray<PicklistOption> = [
    'Teléfono',
    'WhatsApp',
    'Correo',
    'Portal',
  ].map((value) => ({ value, label: value }));
  readonly assigneeOptions: ReadonlyArray<PicklistOption> = [
    'Andrea Torres',
    'Carlos Mendoza',
    'Derek Paulsen',
    'Sin asignar',
  ].map((value) => ({ value, label: value }));
  readonly copiedTicketId = signal<string | null>(null);
  readonly filters: ReadonlyArray<{ label: string; value: TicketFilter }> = [
    { label: 'Todos', value: 'all' },
    { label: 'Activos', value: 'active' },
    { label: 'En espera', value: 'waiting' },
    { label: 'Resueltos', value: 'resolved' },
  ];
  readonly activeCount = computed(
    () => this.tickets().filter((ticket) => ['open', 'in_progress'].includes(ticket.status)).length,
  );
  readonly urgentCount = computed(
    () =>
      this.tickets().filter(
        (ticket) =>
          ['high', 'urgent'].includes(ticket.priority) &&
          !['resolved', 'closed'].includes(ticket.status),
      ).length,
  );
  readonly waitingCount = computed(
    () => this.tickets().filter((ticket) => ticket.status === 'waiting').length,
  );
  readonly resolvedCount = computed(
    () => this.tickets().filter((ticket) => ['resolved', 'closed'].includes(ticket.status)).length,
  );
  readonly canCreate = computed(() =>
    Boolean(this.subjectDraft().trim() && this.descriptionDraft().trim()),
  );
  readonly filteredTickets = computed(() => {
    const query = this.search().trim().toLocaleLowerCase(this.i18n.locale());
    const filter = this.selectedFilter();
    return [...this.tickets()]
      .filter((ticket) => {
        const matchesFilter =
          filter === 'all' ||
          (filter === 'active' && ['open', 'in_progress'].includes(ticket.status)) ||
          ticket.status === filter ||
          (filter === 'resolved' && ticket.status === 'closed');
        const haystack =
          `${ticket.id} ${ticket.subject} ${ticket.category} ${ticket.assignedTo}`.toLocaleLowerCase(
            this.i18n.locale(),
          );
        return matchesFilter && (!query || haystack.includes(query));
      })
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  });

  openComposer(): void {
    this.composerOpen.set(true);
  }
  closeComposer(): void {
    this.composerOpen.set(false);
    this.subjectDraft.set('');
    this.descriptionDraft.set('');
    this.categoryDraft.set('Conectividad');
    this.priorityDraft.set('medium');
    this.channelDraft.set('Teléfono');
    this.assigneeDraft.set('Andrea Torres');
  }
  toggleDetails(ticketId: string): void {
    this.expandedTicketId.set(this.expandedTicketId() === ticketId ? null : ticketId);
  }
  openPreview(ticket: CustomerTicket): void {
    this.previewTicket.set(ticket);
  }
  closePreview(): void {
    this.previewTicket.set(null);
  }
  createTicket(category: string, priority: string, channel: string, assignedTo: string): void {
    if (!this.canCreate()) return;
    this.ticketCreated.emit({
      subject: this.subjectDraft().trim(),
      description: this.descriptionDraft().trim(),
      category: category as CustomerTicket['category'],
      priority: priority as CustomerTicket['priority'],
      channel: channel as CustomerTicket['channel'],
      assignedTo,
    });
    this.closeComposer();
    this.selectedFilter.set('all');
  }
  changeStatus(ticket: CustomerTicket, status: string): void {
    if (ticket.status !== status)
      this.ticketStatusChanged.emit({ ticket, status: status as CustomerTicket['status'] });
    this.previewTicket.update((current) =>
      current?.id === ticket.id
        ? {
            ...current,
            status: status as CustomerTicket['status'],
            updatedAt: new Date().toISOString(),
          }
        : current,
    );
  }
  copyTicketId(ticketId: string): void {
    void navigator.clipboard?.writeText(ticketId);
    this.copiedTicketId.set(ticketId);
    window.setTimeout(() => this.copiedTicketId.set(null), 1600);
  }
  initials(name: string): string {
    return name
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase();
  }
  priorityLabel(priority: CustomerTicket['priority']): string {
    return { low: 'Baja', medium: 'Media', high: 'Alta', urgent: 'Urgente' }[priority];
  }
  statusLabel(status: CustomerTicket['status']): string {
    return {
      open: 'Abierto',
      in_progress: 'En progreso',
      waiting: 'En espera',
      resolved: 'Resuelto',
      closed: 'Cerrado',
    }[status];
  }
  isSlaOverdue(ticket: CustomerTicket): boolean {
    return (
      !['resolved', 'closed'].includes(ticket.status) &&
      new Date(ticket.slaDueAt).getTime() < Date.now()
    );
  }
  slaLabel(ticket: CustomerTicket): string {
    if (['resolved', 'closed'].includes(ticket.status)) return 'Cumplido';
    if (this.isSlaOverdue(ticket)) return 'Vencido';
    return new Intl.RelativeTimeFormat(this.i18n.locale(), { numeric: 'auto' }).format(
      Math.max(1, Math.ceil((new Date(ticket.slaDueAt).getTime() - Date.now()) / 3_600_000)),
      'hour',
    );
  }
}
