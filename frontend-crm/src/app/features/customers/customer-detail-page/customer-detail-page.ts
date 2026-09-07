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
  CustomerStatus,
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
import { CalendarStore } from '../../calendar/calendar-store';
import { buildPrintableDocument } from '../../operations/printable-document/printable-document.data';
import { DocumentPdfService } from '../../operations/printable-document/document-pdf.service';
import { PendingEmailService } from '../../operations/pending-email.service';
import { LeadEmailSeed } from '../../operations/lead-email-modal/lead-email-modal';
import JSZip from 'jszip';
import { buildAccountStatement } from './account-statement';
import {
  RecordActivitySection,
  RecordAttachmentsSection,
  RecordEmailsSection,
  RecordNotesSection,
} from '../../operations/record-sections/record-sections';

type ActivityFilter = 'all' | 'payment' | 'ticket' | 'call';
type EditableCustomerField =
  'email' | 'phone' | 'address' | 'community' | 'gpsLocation' | 'installDate' | 'status';

/** Estados del cliente con su etiqueta en español, para mostrar y para editar. */
const CUSTOMER_STATUS_LABELS: Readonly<Record<CustomerStatus, string>> = {
  active: 'Activo',
  pending: 'Pendiente',
  suspended: 'Suspendido',
  inactive: 'Inactivo',
  cancelled: 'Cancelado',
};

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
  private readonly calendarStore = inject(CalendarStore);
  private readonly pdf = inject(DocumentPdfService);
  private readonly pendingEmail = inject(PendingEmailService);
  private readonly router = inject(Router);
  readonly customer = signal<Customer | undefined>(undefined);
  readonly loading = signal(true);
  readonly activeTab = signal('Resumen');
  readonly changePlanConfirmOpen = signal(false);
  readonly composeEmailKey = signal(0);
  readonly emailSeed = signal<LeadEmailSeed | null>(null);
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
  /** Abre el alta de pago en el módulo de pagos, ya con el cliente puesto. */
  registerPayment(customer: Customer): void {
    void this.router.navigate(['/payments'], {
      queryParams: { create: 'true', clientId: customer.id, clientName: customer.name },
    });
  }
  /** Abre el alta de factura con el cliente y el importe de su mensualidad. */
  createInvoice(customer: Customer): void {
    void this.router.navigate(['/invoices'], {
      queryParams: { create: 'true', clientId: customer.id, clientName: customer.name },
    });
  }
  /** Lleva a Correos y abre el redactor, sin un clic extra. */
  composeMessage(): void {
    this.emailSeed.set(null);
    this.activeTab.set('Correos');
    this.composeEmailKey.update((key) => key + 1);
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
                    : label === 'Eventos'
                      ? this.customerEventCount(customer)
                      : undefined,
    }));
  }
  /** Eventos del calendario ligados a este cliente (mismo criterio que la pestaña). */
  customerEventCount(customer: Customer): number {
    return this.calendarStore.events().filter((event) => event.clientId === customer.id).length;
  }
  customerStatusLabel(status: Customer['status']): string {
    return CUSTOMER_STATUS_LABELS[status] ?? status;
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
  /** Estado del cliente: pastilla de color en lectura, lista de opciones al editar. */
  customerStatusField(customer: Customer): RecordFieldConfig {
    return {
      key: 'status',
      label: 'Estado',
      kind: 'status',
      editable: true,
      options: Object.keys(CUSTOMER_STATUS_LABELS),
      optionLabels: CUSTOMER_STATUS_LABELS,
      statusLabel: this.customerStatusLabel(customer.status),
      statusTone: this.customerStatusTone(customer.status),
    };
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
        if (customer) {
          this.hydrateSharedSections(customer);
          // Un módulo pudo dejar un correo listo (p. ej. enviar un contrato).
          const seed = this.pendingEmail.take(customer.id);
          if (seed) {
            this.emailSeed.set(seed);
            this.activeTab.set('Correos');
            this.composeEmailKey.update((key) => key + 1);
          }
        }
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
      status: 'Estado',
    };
    // El estado se guarda como clave (`active`) pero se registra con su etiqueta.
    const readable = (value: string): string =>
      field === 'status' ? (CUSTOMER_STATUS_LABELS[value as CustomerStatus] ?? value) : value;
    const event: TimelineItem = {
      id: `activity-update-${Date.now()}`,
      title: `Campo actualizado — ${labels[field]}`,
      detail: `Valor anterior: ${readable(String(previousValue))} · Valor nuevo: ${readable(newValue)}`,
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
      `Valor anterior: ${readable(String(previousValue))} · Valor nuevo: ${readable(newValue)}`,
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
  /** Abre la factura como documento y lanza el diálogo de impresión / Guardar PDF. */
  downloadInvoice(invoice: CustomerInvoice, customer: Customer): void {
    const document = buildPrintableDocument('invoices', {
        record: {
          id: invoice.id,
          folio: invoice.id,
          client: customer.name,
          clientId: customer.id,
          issueDate: invoice.issuedAt,
          dueDate: invoice.dueAt,
          total: invoice.total,
          status: invoice.status,
          notes: `${customer.plan} · ${customer.speed}`,
        },
        formatMoney: (value) => this.formatMoney(value),
        formatDate: (value) => this.formatDocumentDate(value),
        statusLabel: (value) => this.invoiceStatusLabel(String(value)),
      payments: (invoice.payments ?? []).map((payment) => ({
        id: payment.id,
        amount: payment.amount,
      })),
    });
    if (document) this.pdf.download(document);
    this.invoiceMenuId.set(null);
  }
  /** Descarga el estado de cuenta del cliente en PDF. */
  downloadAccountStatement(customer: Customer): void {
    this.pdf.download(
      buildAccountStatement(customer, {
        formatMoney: (value) => this.formatMoney(value),
        formatDate: (value) => this.formatDocumentDate(value),
        invoiceStatusLabel: (status) => this.invoiceStatusLabel(status),
      }),
      `estado-de-cuenta-${customer.id}.pdf`,
    );
  }
  /** Descarga un ZIP con dos CSV: facturas y pagos del cliente. */
  async exportBilling(customer: Customer): Promise<void> {
    const zip = new JSZip();
    zip.file(
      'facturas.csv',
      this.toCsv(
        ['Folio', 'Cliente', 'Descripción', 'Emisión', 'Vencimiento', 'Total', 'Estado'],
        customer.invoices.map((invoice) => [
          invoice.id,
          customer.name,
          `${customer.plan} · ${customer.speed}`,
          invoice.issuedAt,
          invoice.dueAt,
          invoice.total,
          this.invoiceStatusLabel(invoice.status),
        ]),
      ),
    );
    zip.file(
      'pagos.csv',
      this.toCsv(
        ['Pago', 'Cliente', 'Factura', 'Fecha', 'Método', 'Referencia', 'Monto'],
        customer.payments.map((payment) => [
          payment.id,
          customer.name,
          this.invoiceForPayment(customer, payment.id),
          payment.date,
          payment.method,
          payment.reference,
          payment.amount,
        ]),
      ),
    );
    const blob = await zip.generateAsync({ type: 'blob' });
    this.downloadBlob(blob, `facturacion-${customer.id}.zip`);
  }
  /** CSV con BOM para que Excel respete los acentos. */
  private toCsv(
    headers: ReadonlyArray<string>,
    rows: ReadonlyArray<ReadonlyArray<string | number>>,
  ): string {
    const escape = (value: string | number): string => {
      const text = String(value ?? '');
      return /[",\n;]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
    };
    return (
      '﻿' +
      [headers, ...rows].map((row) => row.map(escape).join(',')).join('\r\n')
    );
  }
  private downloadBlob(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  }
  /** Abre la factura en el módulo de Facturas, por su id. */
  openInvoiceRecord(invoice: CustomerInvoice): void {
    this.invoiceMenuId.set(null);
    void this.router.navigate(['/invoices', invoice.id]);
  }
  /** Abre el pago en el módulo de Pagos, por su id. */
  openPaymentRecord(payment: CustomerPayment): void {
    this.paymentMenuId.set(null);
    void this.router.navigate(['/payments', payment.id]);
  }
  private formatMoney(value: unknown): string {
    return new Intl.NumberFormat(this.i18n.locale(), {
      style: 'currency',
      currency: 'MXN',
      maximumFractionDigits: 2,
    }).format(Number(value) || 0);
  }
  private formatDocumentDate(value: unknown): string {
    const date = new Date(String(value ?? ''));
    return Number.isNaN(date.getTime())
      ? '—'
      : new Intl.DateTimeFormat(this.i18n.locale(), {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        }).format(date);
  }
  private invoiceStatusLabel(status: string): string {
    return { paid: 'Pagada', overdue: 'Vencida', pending: 'Pendiente' }[status] ?? status;
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
  /** Abre el comprobante del pago y lanza el diálogo de impresión / Guardar PDF. */
  downloadPayment(payment: CustomerPayment, customer: Customer): void {
    const document = buildPrintableDocument('payments', {
        record: {
          id: payment.id,
          client: customer.name,
          clientId: customer.id,
          date: payment.date,
          amount: payment.amount,
          method: payment.method,
          reference: payment.reference,
          invoice: this.invoiceForPayment(customer, payment.id),
        },
        formatMoney: (value) => this.formatMoney(value),
        formatDate: (value) => this.formatDocumentDate(value),
      statusLabel: (value) => String(value ?? ''),
    });
    if (document) this.pdf.download(document);
    this.paymentMenuId.set(null);
  }
  private invoiceForPayment(customer: Customer, paymentId: string): string {
    return (
      customer.invoices.find((invoice) =>
        (invoice.payments ?? []).some((payment) => payment.id === paymentId),
      )?.id ?? ''
    );
  }
}
