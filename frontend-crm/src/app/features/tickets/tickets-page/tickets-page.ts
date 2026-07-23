import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TicketStore } from '../../../core/data-access/ticket-store';
import { CUSTOMERS } from '../../../core/data-access/mock-crm-data';
import { LanguageService } from '../../../core/i18n/language.service';
import { CrmAttachment, CustomerTicket } from '../../../core/models/customer';
import { AttachmentPicker } from '../../../shared/attachment-picker';
import { PicklistOption, StyledPicklist } from '../../../shared/styled-picklist';
import {
  RecordList,
  RecordListAction,
  RecordListField,
  RecordListRow,
  RecordListWidget,
} from '../../../shared/record-list';

@Component({
  selector: 'app-tickets-page',
  imports: [DatePipe, RouterLink, AttachmentPicker, RecordList, StyledPicklist],
  templateUrl: './tickets-page.html',
  styleUrl: './tickets-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TicketsPage {
  readonly store = inject(TicketStore);
  readonly i18n = inject(LanguageService);
  private readonly router = inject(Router);
  readonly customers = CUSTOMERS;
  readonly clientOptions: ReadonlyArray<PicklistOption> = this.customers.map((client) => ({
    value: client.id,
    label: client.name,
    detail: `${client.id} · ${client.email}`,
  }));
  readonly priorityOptions: ReadonlyArray<PicklistOption> = [
    { value: 'low', label: 'Baja' },
    { value: 'medium', label: 'Media' },
    { value: 'high', label: 'Alta' },
    { value: 'urgent', label: 'Urgente' },
  ];
  readonly assigneeOptions: ReadonlyArray<PicklistOption> = [
    { value: 'Andrea Torres', label: 'Andrea Torres', detail: 'Soporte' },
    { value: 'Carlos Mendoza', label: 'Carlos Mendoza', detail: 'Operaciones' },
    { value: 'Ana Torres', label: 'Ana Torres', detail: 'Soporte' },
    { value: 'Sin asignar', label: 'Sin asignar' },
  ];
  readonly categoryOptions: ReadonlyArray<PicklistOption> = [
    { value: 'Conectividad', label: 'Conectividad' },
    { value: 'Facturación', label: 'Facturación' },
    { value: 'Equipo', label: 'Equipo' },
    { value: 'Instalación', label: 'Instalación' },
    { value: 'Otro', label: 'Otro' },
  ];
  readonly newClientId = signal('');
  readonly newPriority = signal('medium');
  readonly newAssignee = signal('Andrea Torres');
  readonly newCategory = signal('Conectividad');
  readonly search = signal('');
  readonly statusFilter = signal('all');
  readonly priorityFilter = signal('all');
  readonly composerOpen = signal(false);
  readonly subject = signal('');
  readonly description = signal('');
  readonly newAttachments = signal<ReadonlyArray<CrmAttachment>>([]);
  readonly attachmentReset = signal(0);
  readonly listColumns = [
    { key: 'subject', label: 'Ticket', type: 'identity', secondaryKey: 'category' },
    { key: 'clientName', label: 'Cliente', type: 'identity', secondaryKey: 'clientEmail' },
    { key: 'status', label: 'Estado', type: 'status' },
    { key: 'priority', label: 'Prioridad', type: 'status' },
    { key: 'assignedTo', label: 'Responsable', type: 'lookup' },
    { key: 'updatedAt', label: 'Última actualización', type: 'date' },
  ] as const;
  readonly listFields: ReadonlyArray<RecordListField> = [
    { key: 'subject', label: 'Asunto', type: 'text' },
    { key: 'clientName', label: 'Cliente', type: 'lookup' },
    {
      key: 'status',
      label: 'Estado',
      type: 'status',
      options: ['open', 'in_progress', 'waiting', 'resolved', 'closed'],
    },
    {
      key: 'priority',
      label: 'Prioridad',
      type: 'select',
      options: ['low', 'medium', 'high', 'urgent'],
    },
    {
      key: 'assignedTo',
      label: 'Responsable',
      type: 'select',
      options: ['Andrea Torres', 'Carlos Mendoza', 'Ana Torres', 'Sin asignar'],
    },
    {
      key: 'category',
      label: 'Categoría',
      type: 'select',
      options: ['Conectividad', 'Facturación', 'Equipo', 'Instalación', 'Otro'],
    },
    { key: 'createdAt', label: 'Creado', type: 'date' },
    { key: 'updatedAt', label: 'Actualizado', type: 'date' },
  ];
  readonly listRowActions: ReadonlyArray<RecordListAction> = [
    { id: 'view', label: 'Ver ticket', icon: '↗' },
    { id: 'resolve', label: 'Marcar resuelto', icon: '✓' },
    { id: 'delete', label: 'Eliminar', icon: '⊘', danger: true },
  ];
  readonly listBulkActions: ReadonlyArray<RecordListAction> = [
    { id: 'edit', label: 'Editar', icon: '✎' },
    { id: 'export', label: 'Exportar', icon: '⇩' },
    { id: 'resolve', label: 'Resolver', icon: '✓' },
    { id: 'delete', label: 'Eliminar', icon: '⊘', danger: true },
  ];
  readonly filteredTickets = computed(() => {
    const query = this.search().trim().toLocaleLowerCase(this.i18n.locale());
    return this.store
      .tickets()
      .filter(
        (ticket) =>
          (this.statusFilter() === 'all' || ticket.status === this.statusFilter()) &&
          (this.priorityFilter() === 'all' || ticket.priority === this.priorityFilter()) &&
          (!query ||
            `${ticket.id} ${ticket.subject} ${ticket.clientName} ${ticket.assignedTo}`
              .toLocaleLowerCase(this.i18n.locale())
              .includes(query)),
      );
  });
  readonly resolvedCount = computed(
    () =>
      this.store.tickets().filter((ticket) => ['resolved', 'closed'].includes(ticket.status))
        .length,
  );
  ticketRows(): ReadonlyArray<RecordListRow> {
    return this.store.tickets().map((ticket) => ({
      id: ticket.id,
      subject: ticket.subject,
      category: ticket.category,
      clientId: ticket.clientId,
      clientName: ticket.clientName,
      clientEmail: ticket.clientEmail,
      status: ticket.status,
      priority: ticket.priority,
      assignedTo: ticket.assignedTo,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
    }));
  }
  listWidgets(): ReadonlyArray<RecordListWidget> {
    return [
      {
        label: 'Abiertos',
        value: this.statusCount('open'),
        detail: 'Requieren atención',
        tone: 'blue',
        icon: '◫',
      },
      {
        label: 'En progreso',
        value: this.statusCount('in_progress'),
        detail: 'En seguimiento',
        tone: 'violet',
        icon: '↻',
      },
      {
        label: 'En espera',
        value: this.statusCount('waiting'),
        detail: 'Respuesta del cliente',
        tone: 'amber',
        icon: '◷',
      },
      {
        label: 'Resueltos',
        value: this.resolvedCount(),
        detail: 'Este periodo',
        tone: 'green',
        icon: '✓',
      },
    ];
  }
  handleListRowAction(actionId: string, row: RecordListRow): void {
    const id = String(row['id']);
    if (actionId === 'view') this.openTicket(id);
    else if (actionId === 'resolve')
      this.store.updateStatus(id, 'resolved', new Date().toISOString());
    else if (actionId === 'delete') this.store.delete(id);
  }
  handleListBulkAction(
    actionId: string,
    rows: ReadonlyArray<RecordListRow>,
    field?: string,
    value?: string,
  ): void {
    const ids = rows.map((row) => String(row['id']));
    if (actionId === 'edit' && field && value !== undefined)
      ids.forEach((id) => this.store.update(id, { [field]: value }));
    else if (actionId === 'resolve')
      ids.forEach((id) => this.store.updateStatus(id, 'resolved', new Date().toISOString()));
    else if (actionId === 'delete') ids.forEach((id) => this.store.delete(id));
  }
  importTickets(rows: ReadonlyArray<RecordListRow>): void {
    rows.forEach((row, index) => {
      const client =
        this.customers.find((item) => item.id === String(row['clientId'])) ?? this.customers[0];
      if (!client) return;
      const now = new Date().toISOString();
      const ticket: CustomerTicket = {
        id: String(row['id'] || `TK-${Date.now() + index}`),
        clientId: client.id,
        subject: String(row['subject'] || `Ticket importado ${index + 1}`),
        description: '',
        category: String(row['category'] || 'Otro') as CustomerTicket['category'],
        priority: String(row['priority'] || 'medium') as CustomerTicket['priority'],
        status: String(row['status'] || 'open') as CustomerTicket['status'],
        channel: 'Portal',
        assignedTo: String(row['assignedTo'] || 'Sin asignar'),
        createdById: 'usr-andrea-torres',
        createdAt: now,
        updatedAt: now,
        slaDueAt: new Date(Date.now() + 24 * 3_600_000).toISOString(),
        requester: client.name,
        comments: [],
        attachments: [],
      };
      this.store.add(ticket, {
        clientName: client.name,
        clientEmail: client.email,
        clientPhone: client.phone,
        clientInitials: client.initials,
      });
    });
  }
  statusCount(status: CustomerTicket['status']): number {
    return this.store.tickets().filter((ticket) => ticket.status === status).length;
  }
  openTicket(id: string): void {
    void this.router.navigate(['/tickets', id]);
  }
  statusLabel(status: CustomerTicket['status']): string {
    return this.i18n.t(
      {
        open: 'Abierto',
        in_progress: 'En progreso',
        waiting: 'En espera',
        resolved: 'Resuelto',
        closed: 'Cerrado',
      }[status],
    );
  }
  priorityLabel(priority: CustomerTicket['priority']): string {
    return this.i18n.t({ low: 'Baja', medium: 'Media', high: 'Alta', urgent: 'Urgente' }[priority]);
  }
  initials(name: string): string {
    return name
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase();
  }
  closeComposer(): void {
    this.composerOpen.set(false);
    this.subject.set('');
    this.description.set('');
    this.newAttachments.set([]);
    this.attachmentReset.update((value) => value + 1);
    this.newClientId.set('');
    this.newPriority.set('medium');
    this.newAssignee.set('Andrea Torres');
    this.newCategory.set('Conectividad');
  }
  createTicket(clientId: string, priority: string, assignedTo: string, category: string): void {
    if (!clientId || !this.subject().trim() || !this.description().trim()) return;
    const client = this.customers.find((item) => item.id === clientId);
    if (!client) return;
    const now = new Date().toISOString();
    const numericIds = this.store
      .tickets()
      .map((ticket) => Number(ticket.id.replace(/\D/g, '')) || 0);
    const ticket: CustomerTicket = {
      id: `TK-${Math.max(2300, ...numericIds) + 1}`,
      clientId,
      subject: this.subject().trim(),
      description: this.description().trim(),
      category: category as CustomerTicket['category'],
      priority: priority as CustomerTicket['priority'],
      status: 'open',
      channel: 'Portal',
      assignedTo,
      createdById: 'usr-andrea-torres',
      createdAt: now,
      updatedAt: now,
      slaDueAt: new Date(
        Date.now() + ({ low: 48, medium: 24, high: 8, urgent: 4 }[priority] ?? 24) * 3_600_000,
      ).toISOString(),
      requester: client.name,
      comments: [],
      attachments: this.newAttachments(),
    };
    this.store.add(ticket, {
      clientName: client.name,
      clientEmail: client.email,
      clientPhone: client.phone,
      clientInitials: client.initials,
    });
    this.closeComposer();
    void this.router.navigate(['/tickets', ticket.id]);
  }
}
