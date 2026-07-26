import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, HostListener, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { switchMap } from 'rxjs';
import { CRM_DATA } from '../../../core/data-access/crm-data';
import { LanguageService } from '../../../core/i18n/language.service';
import { TicketStore } from '../../../core/data-access/ticket-store';
import {
  CrmAttachment,
  Customer,
  CustomerInvoice,
  CustomerNote,
  CustomerPayment,
  CustomerTicket,
  EntityUser,
  TimelineItem,
} from '../../../core/models/customer';
import { AttachmentPicker } from '../../../shared/attachment-picker';
import {
  RecordDetailLayout,
  RecordHeader,
  RecordInformationCard,
  RecordQuickActions,
  RecordRecentActivity,
  RecordSummary,
  RecordTabItem,
  RecordTabs,
} from '../../../shared/record-detail-shell';
import { CustomerTicketsSection, NewCustomerTicket } from '../customer-tickets-section/customer-tickets-section';
import { RecordEventsSection } from '../../operations/lead-events-section/lead-events-section';
import { RecordField, RecordFieldConfig } from '../../../shared/record-field';
import { OperationalStore } from '../../operations/operational-store';
import {
  RecordActivitySection,
  RecordAttachmentsSection,
  RecordEmailsSection,
  RecordNotesSection,
} from '../../operations/record-sections/record-sections';

type ActivityFilter = 'all' | 'payment' | 'ticket' | 'call';
type EditableCustomerField =
  'email' | 'phone' | 'address' | 'community' | 'gpsLocation' | 'installDate';

interface SubscribedContractService {
  id: string;
  name: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

@Component({
  selector: 'app-customer-detail-page',
  imports: [
    CurrencyPipe,
    DatePipe,
    RouterLink,
    CustomerTicketsSection,
    AttachmentPicker,
    RecordEventsSection,
    RecordField,
    RecordActivitySection,
    RecordAttachmentsSection,
    RecordEmailsSection,
    RecordNotesSection,
    RecordDetailLayout,
    RecordHeader,
    RecordInformationCard,
    RecordQuickActions,
    RecordRecentActivity,
    RecordSummary,
    RecordTabs,
  ],
  templateUrl: './customer-detail-page.html',
  styleUrl: './customer-detail-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomerDetailPage {
  readonly i18n = inject(LanguageService);
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(CRM_DATA);
  private readonly ticketStore = inject(TicketStore);
  private readonly operationalStore = inject(OperationalStore);
  private readonly router = inject(Router);
  readonly customer = signal<Customer | undefined>(undefined);
  readonly loading = signal(true);
  readonly activeTab = signal('Resumen');
  readonly changePlanConfirmOpen = signal(false);
  readonly noteDraft = signal('');
  readonly noteAttachments = signal<ReadonlyArray<CrmAttachment>>([]);
  readonly noteAttachmentReset = signal(0);
  readonly pinNewNote = signal(false);
  readonly editingNoteId = signal<string | null>(null);
  readonly noteMenuId = signal<string | null>(null);
  readonly invoiceMenuId = signal<string | null>(null);
  readonly paymentMenuId = signal<string | null>(null);
  readonly billingMenuPosition = signal<{ top: number; left: number } | null>(null);
  readonly selectedNoteId = signal<string | null>(null);
  readonly activityFilter = signal<ActivityFilter>('all');
  readonly activityFilters: ReadonlyArray<{ label: string; value: ActivityFilter }> = [
    { label: 'Todos', value: 'all' },
    { label: 'Pagos', value: 'payment' },
    { label: 'Tickets', value: 'ticket' },
    { label: 'Llamadas', value: 'call' },
  ];
  readonly currentUser = {
    fullName: 'Andrea Torres',
    email: 'andrea.torres@speedlink.mx',
    initials: 'AT',
  };
  readonly tabs = [
    'Resumen',
    'Contratos',
    'Facturación y pagos',
    'Tickets',
    'Correos',
    'Eventos',
    'Notas',
    'Archivos',
    'Actividad',
  ];
  customerContracts(customer: Customer) {
    return this.operationalStore
      .recordsFor('contracts')
      .filter(
        (contract) =>
          String(contract['clientId'] ?? '') === customer.id ||
          String(contract['client'] ?? '') === customer.name,
      );
  }
  activeContract(customer: Customer) {
    return this.customerContracts(customer).find((contract) => contract['status'] === 'ACTIVE');
  }
  subscribedContractServices(customer: Customer): ReadonlyArray<SubscribedContractService> {
    const contract = this.activeContract(customer);
    if (!contract) return [];
    let items: ReadonlyArray<{ serviceId: string; quantity: number; unitPrice: number }> = [];
    try {
      items = JSON.parse(String(contract['items'] ?? '[]')) as typeof items;
    } catch {
      return [];
    }
    return items.map((item) => {
      const service = this.operationalStore.find('services', item.serviceId);
      return {
        id: `${contract.id}-${item.serviceId}`,
        name: String(service?.['name'] ?? item.serviceId),
        description: String(service?.['description'] ?? service?.['type'] ?? 'Servicio contratado'),
        quantity: Number(item.quantity) || 1,
        unitPrice: Number(item.unitPrice) || 0,
      };
    });
  }
  continuePlanChange(customer: Customer): void {
    this.changePlanConfirmOpen.set(false);
    void this.router.navigate(['/contracts'], {
      queryParams: { create: 'true', clientId: customer.id, clientName: customer.name },
    });
  }
  recordString(value: string | number | boolean | undefined): string {
    return String(value ?? '');
  }
  recordNumber(value: string | number | boolean | undefined): number {
    return Number(value) || 0;
  }
  customerTabs(customer: Customer): ReadonlyArray<RecordTabItem> {
    return this.tabs.map((label) => ({
      label,
      count:
        label === 'Contratos'
          ? this.customerContracts(customer).length
          : label === 'Tickets'
            ? this.openTicketCount(customer)
            : label === 'Notas'
              ? this.operationalStore.notesFor(customer.id).length
              : label === 'Actividad'
                ? this.operationalStore.activityFor(customer.id).length
                : label === 'Correos'
                  ? this.operationalStore.emailsFor(customer.id).length
                  : label === 'Archivos'
                    ? this.operationalStore.attachmentsFor(customer.id).length
                    : undefined,
    }));
  }
  customerStatusLabel(status: Customer['status']): string {
    return {
      active: 'Activo',
      pending: 'Pendiente',
      suspended: 'Suspendido',
      inactive: 'Inactivo',
      cancelled: 'Cancelado',
    }[status];
  }
  customerStatusTone(status: Customer['status']): string {
    return status === 'active' ? 'green' : status === 'pending' ? 'amber' : 'red';
  }
  customerSubtitle(customer: Customer): string {
    const installed = new Intl.DateTimeFormat(this.i18n.locale(), {
      month: 'long',
      year: 'numeric',
    }).format(new Date(`${customer.installDate.slice(0, 10)}T12:00:00`));
    return `${customer.id} · Cliente desde ${installed}`;
  }
  customerField(
    key: EditableCustomerField,
    label: string,
    kind: RecordFieldConfig['kind'] = 'text',
  ): RecordFieldConfig {
    return { key, label, kind, editable: true };
  }
  auditField(key: string, label: string, user: EntityUser): RecordFieldConfig {
    return {
      key,
      label,
      kind: 'audit',
      auditUser: { id: `usr-${user.fullName.toLowerCase().replaceAll(' ', '-')}`, ...user },
    };
  }
  constructor() {
    this.route.queryParamMap.subscribe((params) => {
      const tab = params.get('tab');
      if (tab && this.tabs.includes(tab)) this.activeTab.set(tab);
    });
    this.route.paramMap
      .pipe(switchMap((params) => this.api.getCustomer(params.get('id') ?? '')))
      .subscribe((customer) => {
        this.customer.set(customer);
        if (customer) this.hydrateSharedSections(customer);
        this.loading.set(false);
      });
  }
  private hydrateSharedSections(customer: Customer): void {
    this.operationalStore.hydrateNotes(
      customer.id,
      customer.notes.map((note) => ({
        id: note.id,
        message: note.content,
        author: note.author.fullName,
        initials: note.author.initials,
        createdAt: note.createdAt,
        pinned: note.pinned,
        attachments: note.attachments ?? [],
      })),
    );
    this.operationalStore.hydrateActivity(
      customer.id,
      customer.timeline.map((event) => ({
        id: event.id,
        title: event.title,
        detail: event.detail,
        actor: event.author,
        createdAt: event.date,
        tone: event.type === 'payment' ? 'green' : event.type === 'ticket' ? 'violet' : 'blue',
        module: this.customerActivityModule(event.type),
        actionType: 'CREATE',
      })),
    );
  }
  private customerActivityModule(type: TimelineItem['type']): string {
    return {
      payment: 'Pagos',
      ticket: 'Tickets',
      call: 'Clientes',
      note: 'Notas',
      invoice: 'Facturas',
      service: 'Servicios',
      update: 'Clientes',
    }[type];
  }
  updateCustomerField(customer: Customer, field: EditableCustomerField, newValue: string): void {
    const previousValue = customer[field];
    if (previousValue === newValue) return;
    const changedAt = new Date().toISOString();
    const labels: Record<EditableCustomerField, string> = {
      email: 'Correo electrónico',
      phone: 'Teléfono',
      address: 'Dirección de instalación',
      community: 'Comunidad',
      gpsLocation: 'Ubicación GPS',
      installDate: 'Fecha de instalación',
    };
    const event: TimelineItem = {
      id: `activity-update-${Date.now()}`,
      title: `Campo actualizado — ${labels[field]}`,
      detail: `Valor anterior: ${previousValue} · Valor nuevo: ${newValue}`,
      date: changedAt,
      type: 'update',
      author: this.currentUser.fullName,
    };
    this.customer.update((current) =>
      current?.id === customer.id
        ? {
            ...current,
            [field]: newValue,
            updatedAt: changedAt,
            updatedBy: this.currentUser,
            timeline: [event, ...current.timeline],
          }
        : current,
    );
    this.operationalStore.logActivity(
      customer.id,
      `Campo actualizado — ${labels[field]}`,
      `Valor anterior: ${previousValue} · Valor nuevo: ${newValue}`,
      'blue',
      'Clientes',
      'EDIT',
    );
  }
  totalPaid(customer: Customer): number {
    return customer.payments.reduce((total, payment) => total + payment.amount, 0);
  }
  outstandingInvoiceCount(customer: Customer): number {
    return customer.invoices.filter((invoice) => invoice.status !== 'paid').length;
  }
  openTicketCount(customer: Customer): number {
    return customer.tickets.filter((ticket) => !['resolved', 'closed'].includes(ticket.status))
      .length;
  }
  createCustomerTicket(customer: Customer, draft: NewCustomerTicket): void {
    const createdAt = new Date().toISOString();
    const slaHours = { low: 48, medium: 24, high: 8, urgent: 4 }[draft.priority];
    const numericIds = this.ticketStore
      .tickets()
      .map((ticket) => Number(ticket.id.replace(/\D/g, '')) || 0);
    const ticket: CustomerTicket = {
      id: `TK-${Math.max(2300, ...numericIds) + 1}`,
      clientId: customer.id,
      ...draft,
      status: 'open',
      createdById: 'usr-andrea-torres',
      createdAt,
      updatedAt: createdAt,
      slaDueAt: new Date(Date.now() + slaHours * 3_600_000).toISOString(),
      requester: customer.name,
      comments: [],
      attachments: [],
    };
    const event: TimelineItem = {
      id: `activity-ticket-${Date.now()}`,
      title: `Ticket abierto — ${ticket.id}`,
      detail: `${ticket.subject} · Prioridad ${this.ticketPriorityLabel(ticket.priority)} · Asignado a ${ticket.assignedTo}`,
      date: createdAt,
      type: 'ticket',
      author: this.currentUser.fullName,
    };
    this.customer.update((current) =>
      current?.id === customer.id
        ? {
            ...current,
            tickets: [ticket, ...current.tickets],
            timeline: [event, ...current.timeline],
            updatedAt: createdAt,
            updatedBy: this.currentUser,
          }
        : current,
    );
    this.ticketStore.add(ticket, {
      clientName: customer.name,
      clientEmail: customer.email,
      clientPhone: customer.phone,
      clientInitials: customer.initials,
    });
    this.operationalStore.logActivity(
      customer.id,
      `Ticket abierto — ${ticket.id}`,
      event.detail,
      'violet',
      'Tickets',
      'CREATE',
    );
  }
  changeCustomerTicketStatus(
    customer: Customer,
    ticket: CustomerTicket,
    status: CustomerTicket['status'],
  ): void {
    const changedAt = new Date().toISOString();
    const event: TimelineItem = {
      id: `activity-ticket-status-${Date.now()}`,
      title: `Ticket actualizado — ${ticket.id}`,
      detail: `Estado anterior: ${this.ticketStatusLabel(ticket.status)} · Nuevo estado: ${this.ticketStatusLabel(status)}`,
      date: changedAt,
      type: 'ticket',
      author: this.currentUser.fullName,
    };
    this.customer.update((current) =>
      current?.id === customer.id
        ? {
            ...current,
            tickets: current.tickets.map((item) =>
              item.id === ticket.id
                ? {
                    ...item,
                    status,
                    updatedAt: changedAt,
                    resolvedAt: ['resolved', 'closed'].includes(status) ? changedAt : undefined,
                  }
                : item,
            ),
            timeline: [event, ...current.timeline],
            updatedAt: changedAt,
            updatedBy: this.currentUser,
          }
        : current,
    );
    this.ticketStore.updateStatus(ticket.id, status, changedAt);
    this.operationalStore.logActivity(
      customer.id,
      `Ticket actualizado — ${ticket.id}`,
      event.detail,
      'blue',
      'Tickets',
      'EDIT',
    );
  }
  private ticketPriorityLabel(priority: CustomerTicket['priority']): string {
    return { low: 'baja', medium: 'media', high: 'alta', urgent: 'urgente' }[priority];
  }
  private ticketStatusLabel(status: CustomerTicket['status']): string {
    return {
      open: 'Abierto',
      in_progress: 'En progreso',
      waiting: 'En espera',
      resolved: 'Resuelto',
      closed: 'Cerrado',
    }[status];
  }
  nextBillingDate(customer: Customer): Date {
    const today = new Date();
    const date = new Date(today.getFullYear(), today.getMonth(), customer.billingDay);
    if (date < today) date.setMonth(date.getMonth() + 1);
    return date;
  }
  pinnedNotes(customer: Customer): ReadonlyArray<CustomerNote> {
    return customer.notes
      .filter((note) => note.pinned)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .slice(0, 5);
  }
  canPinNote(customer: Customer): boolean {
    const editingId = this.editingNoteId();
    return (
      this.pinnedNotes(customer).length < 5 ||
      customer.notes.some((note) => note.id === editingId && note.pinned)
    );
  }
  canTogglePinned(customer: Customer, note: CustomerNote): boolean {
    return note.pinned || this.pinnedNotes(customer).length < 5;
  }
  toggleDraftPin(customer: Customer): void {
    if (this.pinNewNote()) {
      this.pinNewNote.set(false);
      return;
    }
    if (this.canPinNote(customer)) this.pinNewNote.set(true);
  }
  sortedNotes(customer: Customer): Customer['notes'] {
    return [...customer.notes].sort(
      (left, right) =>
        Number(right.pinned) - Number(left.pinned) || right.createdAt.localeCompare(left.createdAt),
    );
  }
  saveNote(customer: Customer): void {
    const content = this.noteDraft().trim();
    if (!content) return;
    const changedAt = new Date().toISOString();
    const editingId = this.editingNoteId();
    const pinned = this.pinNewNote() && this.canPinNote(customer);
    this.customer.update((current) => {
      if (current?.id !== customer.id) return current;
      if (editingId)
        return {
          ...current,
          notes: current.notes.map((note) =>
            note.id === editingId
              ? {
                  ...note,
                  content,
                  pinned,
                  attachments: [...(note.attachments ?? []), ...this.noteAttachments()],
                }
              : note,
          ),
          updatedAt: changedAt,
          updatedBy: this.currentUser,
        };
      const note = {
        id: `note-${Date.now()}`,
        content,
        createdAt: changedAt,
        author: this.currentUser,
        pinned,
        attachments: this.noteAttachments(),
      };
      const event: TimelineItem = {
        id: `activity-${Date.now()}`,
        title: 'Nota agregada',
        detail: content,
        date: changedAt,
        type: 'note',
        author: this.currentUser.fullName,
      };
      return {
        ...current,
        notes: [note, ...current.notes],
        timeline: [event, ...current.timeline],
        updatedAt: changedAt,
        updatedBy: this.currentUser,
      };
    });
    this.cancelNoteEdit();
  }
  toggleNoteMenu(event: MouseEvent, noteId: string): void {
    event.stopPropagation();
    this.noteMenuId.set(this.noteMenuId() === noteId ? null : noteId);
  }
  togglePinnedNote(customer: Customer, note: CustomerNote): void {
    if (!this.canTogglePinned(customer, note)) return;
    const changedAt = new Date().toISOString();
    const pinned = !note.pinned;
    this.customer.update((current) =>
      current?.id === customer.id
        ? {
            ...current,
            notes: current.notes.map((item) => (item.id === note.id ? { ...item, pinned } : item)),
            updatedAt: changedAt,
            updatedBy: this.currentUser,
          }
        : current,
    );
    if (this.editingNoteId() === note.id) this.pinNewNote.set(pinned);
    this.noteMenuId.set(null);
  }
  openPinnedNote(noteId: string): void {
    this.activeTab.set('Notas');
    this.selectedNoteId.set(noteId);
    window.setTimeout(() =>
      document
        .getElementById(`customer-note-${noteId}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
    );
    window.setTimeout(() => this.selectedNoteId.set(null), 2200);
  }
  startNoteEdit(note: CustomerNote): void {
    this.noteDraft.set(note.content);
    this.pinNewNote.set(note.pinned);
    this.editingNoteId.set(note.id);
    this.noteMenuId.set(null);
  }
  cancelNoteEdit(): void {
    this.noteDraft.set('');
    this.pinNewNote.set(false);
    this.editingNoteId.set(null);
    this.noteAttachments.set([]);
    this.noteAttachmentReset.update((value) => value + 1);
  }
  deleteNote(customer: Customer, noteId: string): void {
    const changedAt = new Date().toISOString();
    this.customer.update((current) =>
      current?.id === customer.id
        ? {
            ...current,
            notes: current.notes.filter((note) => note.id !== noteId),
            updatedAt: changedAt,
            updatedBy: this.currentUser,
          }
        : current,
    );
    if (this.editingNoteId() === noteId) this.cancelNoteEdit();
    this.noteMenuId.set(null);
  }
  filteredTimeline(customer: Customer): ReadonlyArray<TimelineItem> {
    const filter = this.activityFilter();
    return [...customer.timeline]
      .filter((item) => filter === 'all' || item.type === filter)
      .sort((left, right) => right.date.localeCompare(left.date));
  }
  activitySince(customer: Customer): string {
    return customer.timeline.reduce(
      (earliest, item) => (item.date < earliest ? item.date : earliest),
      customer.timeline[0]?.date ?? customer.createdAt,
    );
  }
  activityIcon(type: TimelineItem['type']): string {
    return {
      payment: '$',
      ticket: '□',
      call: '☎',
      invoice: '▤',
      service: '⌁',
      note: '✎',
      update: '↻',
    }[type];
  }
  formatAttachmentSize(size: number): string {
    return size < 1024 * 1024
      ? `${Math.ceil(size / 1024)} KB`
      : `${(size / 1024 / 1024).toFixed(1)} MB`;
  }
  @HostListener('document:click') closeNoteMenu(): void {
    this.noteMenuId.set(null);
  }
  @HostListener('document:click') closeBillingMenus(): void {
    this.invoiceMenuId.set(null);
    this.paymentMenuId.set(null);
  }
  private positionBillingMenu(trigger: HTMLElement): void {
    const rect = trigger.getBoundingClientRect();
    const menuHeight = 172;
    const menuWidth = 160;
    const openUpward = rect.bottom + menuHeight + 8 > window.innerHeight;
    this.billingMenuPosition.set({
      top: openUpward ? rect.top - menuHeight - 6 : rect.bottom + 6,
      left: Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 8),
    });
  }
  toggleInvoiceMenu(event: Event, invoiceId: string): void {
    event.stopPropagation();
    const opening = this.invoiceMenuId() !== invoiceId;
    this.invoiceMenuId.set(opening ? invoiceId : null);
    this.paymentMenuId.set(null);
    if (opening) this.positionBillingMenu(event.currentTarget as HTMLElement);
  }
  deleteInvoice(customer: Customer, invoiceId: string): void {
    this.customer.update((current) =>
      current?.id === customer.id
        ? { ...current, invoices: current.invoices.filter((invoice) => invoice.id !== invoiceId) }
        : current,
    );
    this.invoiceMenuId.set(null);
  }
  downloadInvoice(invoice: CustomerInvoice, customer: Customer): void {
    const lines = [
      `Factura,${invoice.id}`,
      `Cliente,${customer.name}`,
      `Descripción,${customer.plan}`,
      `Emisión,${invoice.issuedAt}`,
      `Vencimiento,${invoice.dueAt}`,
      `Total,${invoice.total}`,
      `Estado,${invoice.status}`,
    ];
    this.downloadTextFile(`${invoice.id}.csv`, lines.join('\n'));
    this.invoiceMenuId.set(null);
  }
  togglePaymentMenu(event: Event, paymentId: string): void {
    event.stopPropagation();
    const opening = this.paymentMenuId() !== paymentId;
    this.paymentMenuId.set(opening ? paymentId : null);
    this.invoiceMenuId.set(null);
    if (opening) this.positionBillingMenu(event.currentTarget as HTMLElement);
  }
  deletePayment(customer: Customer, paymentId: string): void {
    this.customer.update((current) =>
      current?.id === customer.id
        ? { ...current, payments: current.payments.filter((payment) => payment.id !== paymentId) }
        : current,
    );
    this.paymentMenuId.set(null);
  }
  downloadPayment(payment: CustomerPayment, customer: Customer): void {
    const lines = [
      `Pago,${payment.id}`,
      `Cliente,${customer.name}`,
      `Fecha,${payment.date}`,
      `Referencia,${payment.reference}`,
      `Método,${payment.method}`,
      `Monto,${payment.amount}`,
    ];
    this.downloadTextFile(`${payment.id}.csv`, lines.join('\n'));
    this.paymentMenuId.set(null);
  }
  private downloadTextFile(fileName: string, content: string): void {
    const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  }
}
