import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TicketStore } from '../../core/data-access/ticket-store';
import { CUSTOMERS } from '../../core/data-access/mock-crm-data';
import { LanguageService } from '../../core/i18n/language.service';
import { CrmAttachment, CustomerTicket } from '../../core/models/customer';
import { AttachmentPicker } from '../../shared/attachment-picker';
import { PicklistOption, StyledPicklist } from '../../shared/styled-picklist';
import {
  RecordList,
  RecordListAction,
  RecordListField,
  RecordListRow,
  RecordListWidget,
} from '../../shared/record-list';

@Component({
  selector: 'app-tickets-page',
  imports: [DatePipe, RouterLink, AttachmentPicker, RecordList, StyledPicklist],
  template: `
    <app-record-list
      title="Gestión de tickets"
      description="Solicitudes de soporte, incidencias y seguimiento a clientes."
      newLabel="Nuevo ticket"
      baseRoute="/tickets"
      accent="#7c3aed"
      [records]="ticketRows()"
      [columns]="listColumns"
      [fields]="listFields"
      [widgets]="listWidgets()"
      [rowActions]="listRowActions"
      [bulkActions]="listBulkActions"
      (newRequested)="composerOpen.set(true)"
      (rowAction)="handleListRowAction($event.actionId, $event.record)"
      (bulkAction)="
        handleListBulkAction($event.actionId, $event.records, $event.field, $event.value)
      "
      (recordsImported)="importTickets($event)"
    />
    <header class="page-heading">
      <div>
        <span>{{ i18n.t('Centro de soporte') }}</span>
        <h1>{{ i18n.t('Gestión de tickets') }}</h1>
        <p>{{ i18n.t('Solicitudes de soporte, incidencias y seguimiento a clientes.') }}</p>
      </div>
      <button class="primary-button" type="button" (click)="composerOpen.set(true)">
        ＋ {{ i18n.t('Nuevo ticket') }}
      </button>
    </header>

    <section class="ticket-stats">
      <article>
        <span class="stat-icon stat-icon--blue">◫</span>
        <div>
          <small>{{ i18n.t('Abiertos') }}</small
          ><b>{{ statusCount('open') }}</b
          ><em>Requieren atención</em>
        </div>
      </article>
      <article>
        <span class="stat-icon stat-icon--violet">↻</span>
        <div>
          <small>{{ i18n.t('En progreso') }}</small
          ><b>{{ statusCount('in_progress') }}</b
          ><em>En seguimiento</em>
        </div>
      </article>
      <article>
        <span class="stat-icon stat-icon--amber">◷</span>
        <div>
          <small>{{ i18n.t('En espera') }}</small
          ><b>{{ statusCount('waiting') }}</b
          ><em>Respuesta del cliente</em>
        </div>
      </article>
      <article>
        <span class="stat-icon stat-icon--green">✓</span>
        <div>
          <small>{{ i18n.t('Resueltos') }}</small
          ><b>{{ resolvedCount() }}</b
          ><em>Este periodo</em>
        </div>
      </article>
    </section>

    <section class="card table-card">
      <header class="table-toolbar">
        <label class="search-box"
          ><svg viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-4-4" /></svg
          ><input
            #searchInput
            type="search"
            [placeholder]="i18n.t('Buscar tickets…')"
            (input)="search.set(searchInput.value)"
        /></label>
        <div class="toolbar-filters">
          <select #statusSelect (change)="statusFilter.set(statusSelect.value)">
            <option value="all">{{ i18n.t('Todos') }} · {{ i18n.t('Estado') }}</option>
            <option value="open">{{ i18n.t('Abiertos') }}</option>
            <option value="in_progress">{{ i18n.t('En progreso') }}</option>
            <option value="waiting">{{ i18n.t('En espera') }}</option>
            <option value="resolved">{{ i18n.t('Resueltos') }}</option>
            <option value="closed">{{ i18n.t('Cerrados') }}</option>
          </select>
          <select #prioritySelect (change)="priorityFilter.set(prioritySelect.value)">
            <option value="all">{{ i18n.t('Todos') }} · {{ i18n.t('Prioridad') }}</option>
            <option value="urgent">{{ i18n.t('Urgente') }}</option>
            <option value="high">{{ i18n.t('Alta') }}</option>
            <option value="medium">{{ i18n.t('Media') }}</option>
            <option value="low">{{ i18n.t('Baja') }}</option>
          </select>
        </div>
      </header>
      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Ticket</th>
              <th>{{ i18n.t('Cliente') }}</th>
              <th>{{ i18n.t('Estado') }}</th>
              <th>{{ i18n.t('Prioridad') }}</th>
              <th>{{ i18n.t('Responsable') }}</th>
              <th>{{ i18n.t('Última actualización') }}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            @for (ticket of filteredTickets(); track ticket.id) {
              <tr (click)="openTicket(ticket.id)">
                <td>
                  <span class="ticket-subject"
                    ><b>{{ ticket.subject }}</b
                    ><small>{{ ticket.id }} · {{ ticket.category }}</small></span
                  >
                </td>
                <td>
                  <span class="client-cell"
                    ><span>{{ ticket.clientInitials }}</span
                    ><span
                      ><b>{{ ticket.clientName }}</b
                      ><small>{{ ticket.clientEmail }}</small></span
                    ></span
                  >
                </td>
                <td>
                  <span class="status status--{{ ticket.status }}">{{
                    statusLabel(ticket.status)
                  }}</span>
                </td>
                <td>
                  <span class="priority priority--{{ ticket.priority }}"
                    ><i></i>{{ priorityLabel(ticket.priority) }}</span
                  >
                </td>
                <td>
                  <span class="assignee"
                    ><span>{{ initials(ticket.assignedTo) }}</span
                    >{{ ticket.assignedTo }}</span
                  >
                </td>
                <td>
                  <time>{{ ticket.updatedAt | date: 'dd MMM y, HH:mm' : '' : i18n.locale() }}</time>
                </td>
                <td>
                  <a
                    [routerLink]="['/tickets', ticket.id]"
                    aria-label="Abrir ticket"
                    (click)="$event.stopPropagation()"
                    >›</a
                  >
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="7" class="empty">No hay tickets para estos filtros.</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
      <footer>
        <span>{{ filteredTickets().length }} de {{ store.tickets().length }} tickets</span
        ><span>Actualizado ahora</span>
      </footer>
    </section>

    @if (composerOpen()) {
      <button
        class="modal-backdrop"
        type="button"
        aria-label="Cerrar"
        (click)="closeComposer()"
      ></button>
      <section class="ticket-modal" role="dialog" aria-modal="true">
        <header>
          <div>
            <span>{{ i18n.t('Centro de soporte') }}</span>
            <h2>{{ i18n.t('Nuevo ticket') }}</h2>
            <p>Relaciona la solicitud con un cliente y define su prioridad.</p>
          </div>
          <button type="button" (click)="closeComposer()">×</button>
        </header>
        <div class="ticket-form">
          <label
            >{{ i18n.t('Cliente') }} <b class="required-mark">*</b
            ><app-styled-picklist
              [options]="clientOptions"
              [value]="newClientId()"
              placeholder="Seleccionar cliente…"
              (valueChange)="newClientId.set($event)"
          /></label>
          <label
            >{{ i18n.t('Prioridad')
            }}<app-styled-picklist
              [options]="priorityOptions"
              [value]="newPriority()"
              (valueChange)="newPriority.set($event)"
          /></label>
          <label class="full"
            >Asunto <b class="required-mark">*</b
            ><input
              #subjectInput
              type="text"
              placeholder="Describe brevemente la solicitud"
              (input)="subject.set(subjectInput.value)"
          /></label>
          <label class="full"
            >Descripción <b class="required-mark">*</b
            ><textarea
              #descriptionInput
              rows="5"
              placeholder="Incluye síntomas, contexto y pruebas realizadas"
              (input)="description.set(descriptionInput.value)"
            ></textarea>
          </label>
          <label
            >Asignar a<app-styled-picklist
              [options]="assigneeOptions"
              [value]="newAssignee()"
              (valueChange)="newAssignee.set($event)"
          /></label>
          <label
            >Categoría<app-styled-picklist
              [options]="categoryOptions"
              [value]="newCategory()"
              (valueChange)="newCategory.set($event)"
          /></label>
          <div class="full">
            <app-attachment-picker
              [resetKey]="attachmentReset()"
              (attachmentsChange)="newAttachments.set($event)"
            />
          </div>
        </div>
        <footer>
          <button type="button" (click)="closeComposer()">{{ i18n.t('Cancelar') }}</button
          ><button
            class="primary-button"
            type="button"
            [disabled]="!newClientId() || !subject().trim() || !description().trim()"
            (click)="createTicket(newClientId(), newPriority(), newAssignee(), newCategory())"
          >
            {{ i18n.t('Nuevo ticket') }}
          </button>
        </footer>
      </section>
    }
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .page-heading,
      .ticket-stats,
      .table-card {
        display: none;
      }
      .page-heading {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 20px;
        margin-bottom: 20px;
      }
      .page-heading > div > span {
        color: var(--color-primary);
        font-size: 9px;
        font-weight: 800;
        letter-spacing: 0.09em;
        text-transform: uppercase;
      }
      .page-heading h1 {
        margin-top: 5px;
        font-size: 25px;
      }
      .page-heading p {
        margin-top: 5px;
        color: var(--color-text-secondary);
        font-size: 11px;
      }
      .primary-button {
        min-height: 40px;
        padding: 0 16px;
        border: 1px solid var(--color-primary);
        border-radius: 9px;
        background: var(--color-primary);
        color: #fff;
        font-weight: 750;
      }
      .primary-button:disabled {
        opacity: 0.45;
        cursor: not-allowed;
      }
      .ticket-stats {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 12px;
        margin-bottom: 18px;
      }
      .ticket-stats article {
        padding: 16px;
        border: 1px solid var(--color-border);
        border-radius: 11px;
        background: var(--color-surface);
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .ticket-stats article > div {
        display: grid;
        grid-template-columns: 1fr auto;
        align-items: center;
        gap: 1px 12px;
        flex: 1;
      }
      .ticket-stats small {
        color: var(--color-text-secondary);
        font-size: 10px;
      }
      .ticket-stats b {
        grid-row: 1/3;
        grid-column: 2;
        font-size: 22px;
      }
      .ticket-stats em {
        color: var(--color-text-secondary);
        font-size: 8.5px;
        font-style: normal;
      }
      .stat-icon {
        width: 40px;
        height: 40px;
        display: grid;
        place-items: center;
        border-radius: 10px;
        font-weight: 800;
      }
      .stat-icon--blue {
        background: #dbeafe;
        color: #2563eb;
      }
      .stat-icon--violet {
        background: #ede9fe;
        color: #7c3aed;
      }
      .stat-icon--amber {
        background: #fef3c7;
        color: #d97706;
      }
      .stat-icon--green {
        background: #d1fae5;
        color: #059669;
      }
      .table-card {
        overflow: hidden;
      }
      .table-toolbar {
        min-height: 68px;
        padding: 13px 16px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        border-bottom: 1px solid var(--color-border);
      }
      .search-box {
        width: min(390px, 100%);
        height: 38px;
        padding: 0 11px;
        border: 1px solid var(--color-border);
        border-radius: 8px;
        background: var(--color-background);
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .search-box svg {
        width: 15px;
        height: 15px;
        fill: none;
        stroke: var(--color-text-secondary);
        stroke-width: 1.8;
      }
      .search-box input {
        width: 100%;
        border: 0;
        outline: 0;
        background: transparent;
        color: var(--color-text-primary);
        font: inherit;
        font-size: 10.5px;
      }
      .toolbar-filters {
        display: flex;
        gap: 7px;
      }
      .toolbar-filters select {
        height: 38px;
        padding: 0 28px 0 10px;
        border: 1px solid var(--color-border);
        border-radius: 8px;
        background: var(--color-surface);
        color: var(--color-text-primary);
        font: inherit;
        font-size: 10px;
      }
      .table-scroll {
        overflow-x: auto;
      }
      table {
        width: 100%;
        border-collapse: collapse;
      }
      th {
        padding: 11px 14px;
        background: var(--color-muted);
        color: var(--color-text-secondary);
        font-size: 8.5px;
        text-align: left;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
      td {
        padding: 13px 14px;
        border-top: 1px solid var(--color-border);
        font-size: 10.5px;
      }
      tbody tr {
        cursor: pointer;
      }
      tbody tr:hover {
        background: color-mix(in srgb, var(--color-primary) 4%, var(--color-surface));
      }
      .ticket-subject {
        min-width: 220px;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .ticket-subject b {
        font-size: 11.5px;
      }
      .ticket-subject small,
      .client-cell small,
      time {
        color: var(--color-text-secondary);
        font-size: 9px;
      }
      .client-cell {
        min-width: 175px;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .client-cell > span:first-child,
      .assignee > span {
        width: 29px;
        height: 29px;
        flex: 0 0 29px;
        border-radius: 50%;
        background: #dbeafe;
        color: #1d4ed8;
        display: grid;
        place-items: center;
        font-size: 8px;
        font-weight: 800;
      }
      .client-cell > span:last-child {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .status {
        padding: 5px 8px;
        border-radius: 99px;
        background: #e2e8f0;
        color: #475569;
        font-size: 8.5px;
        font-weight: 800;
        white-space: nowrap;
      }
      .status--open {
        background: #dbeafe;
        color: #1d4ed8;
      }
      .status--in_progress {
        background: #ede9fe;
        color: #6d28d9;
      }
      .status--waiting {
        background: #fef3c7;
        color: #b45309;
      }
      .status--resolved {
        background: #d1fae5;
        color: #047857;
      }
      .priority {
        display: inline-flex;
        align-items: center;
        gap: 5px;
      }
      .priority i {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: #94a3b8;
      }
      .priority--medium i {
        background: #3b82f6;
      }
      .priority--high i {
        background: #f97316;
      }
      .priority--urgent i {
        background: #ef4444;
      }
      .assignee {
        min-width: 140px;
        display: flex;
        align-items: center;
        gap: 7px;
      }
      .assignee > span {
        width: 25px;
        height: 25px;
        flex-basis: 25px;
        background: #e0e7ff;
        color: #4338ca;
      }
      td > a {
        width: 27px;
        height: 27px;
        border-radius: 7px;
        display: grid;
        place-items: center;
        color: var(--color-primary);
        font-size: 19px;
        text-decoration: none;
      }
      .empty {
        padding: 60px;
        text-align: center;
        color: var(--color-text-secondary);
      }
      .table-card > footer {
        min-height: 48px;
        padding: 0 16px;
        border-top: 1px solid var(--color-border);
        display: flex;
        align-items: center;
        justify-content: space-between;
        color: var(--color-text-secondary);
        font-size: 9px;
      }
      .modal-backdrop {
        position: fixed;
        inset: 0;
        z-index: 1000;
        border: 0;
        background: rgba(15, 23, 42, 0.52);
        backdrop-filter: blur(3px);
      }
      .ticket-modal {
        position: fixed;
        left: 50%;
        top: 50%;
        z-index: 1001;
        width: min(680px, calc(100vw - 28px));
        max-height: calc(100vh - 28px);
        overflow-y: auto;
        border: 1px solid var(--color-border);
        border-radius: 16px;
        background: var(--color-surface);
        box-shadow: 0 30px 80px rgba(15, 23, 42, 0.3);
        transform: translate(-50%, -50%);
      }
      .ticket-modal > header {
        padding: 20px 22px 16px;
        border-bottom: 1px solid var(--color-border);
        display: flex;
        justify-content: space-between;
      }
      .ticket-modal header span {
        color: var(--color-primary);
        font-size: 8px;
        font-weight: 800;
        letter-spacing: 0.08em;
      }
      .ticket-modal h2 {
        margin-top: 4px;
      }
      .ticket-modal header p {
        margin-top: 3px;
        color: var(--color-text-secondary);
        font-size: 10px;
      }
      .ticket-modal header > button {
        width: 32px;
        height: 32px;
        border: 0;
        border-radius: 50%;
        background: var(--color-muted);
        color: var(--color-text-primary);
        font-size: 20px;
      }
      .ticket-form {
        padding: 19px 22px;
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 13px;
      }
      .ticket-form label {
        display: flex;
        flex-direction: column;
        gap: 5px;
        color: var(--color-text-secondary);
        font-size: 9.5px;
        font-weight: 700;
      }
      .required-mark {
        color: #dc2626;
      }
      .ticket-form .full {
        grid-column: 1/-1;
      }
      .ticket-form input,
      .ticket-form select,
      .ticket-form textarea {
        width: 100%;
        padding: 0 10px;
        border: 1px solid var(--color-border);
        border-radius: 8px;
        outline: 0;
        background: var(--color-background);
        color: var(--color-text-primary);
        font: inherit;
        font-size: 10.5px;
      }
      .ticket-form input,
      .ticket-form select {
        height: 38px;
      }
      .ticket-form textarea {
        padding-block: 9px;
        resize: vertical;
      }
      .ticket-modal > footer {
        padding: 13px 22px 19px;
        display: flex;
        justify-content: flex-end;
        gap: 8px;
      }
      .ticket-modal > footer > button:not(.primary-button) {
        min-height: 40px;
        padding: 0 14px;
        border: 1px solid var(--color-border);
        border-radius: 9px;
        background: var(--color-surface);
        color: var(--color-text-primary);
        font-weight: 700;
      }
      @media (max-width: 850px) {
        .ticket-stats {
          grid-template-columns: 1fr 1fr;
        }
        .table-toolbar {
          align-items: stretch;
          flex-direction: column;
        }
        .search-box {
          width: 100%;
        }
      }
      @media (max-width: 560px) {
        .page-heading {
          align-items: stretch;
          flex-direction: column;
        }
        .ticket-stats {
          grid-template-columns: 1fr;
        }
        .toolbar-filters {
          overflow-x: auto;
        }
        .ticket-form {
          grid-template-columns: 1fr;
        }
        .ticket-form .full {
          grid-column: auto;
        }
      }
    `,
  ],
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
