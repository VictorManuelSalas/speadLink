import { CurrencyPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  HostListener,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { CRM_DATA } from '../../core/data-access/crm-data';
import { LanguageService } from '../../core/i18n/language.service';
import { Customer, CustomerStatus } from '../../core/models/customer';
import { StatusBadge } from '../../shared/status-badge';
import {
  RecordList,
  RecordListAction,
  RecordListField,
  RecordListRow,
  RecordListWidget,
} from '../../shared/record-list';
import { InlineEditableDateField } from '../../shared/inline-editable-date-field';
import { PicklistOption, StyledPicklist } from '../../shared/styled-picklist';

@Component({
  selector: 'app-customers-page',
  imports: [
    CurrencyPipe,
    RecordList,
    RouterLink,
    StatusBadge,
    InlineEditableDateField,
    StyledPicklist,
  ],
  template: `
    <app-record-list
      title="Clientes"
      description="Administra sus servicios, saldos y datos de contacto."
      newLabel="Nuevo cliente"
      baseRoute="/customers"
      accent="#2563eb"
      [records]="customerRows()"
      [columns]="listColumns"
      [fields]="listFields"
      [widgets]="listWidgets()"
      [rowActions]="listRowActions"
      [bulkActions]="listBulkActions"
      (newRequested)="openCreate()"
      (rowAction)="handleListRowAction($event.actionId, $event.record)"
      (bulkAction)="
        handleListBulkAction($event.actionId, $event.records, $event.field, $event.value)
      "
      (recordsImported)="importCustomers($event)"
    />
    @if (createOpen()) {
      <button
        class="create-backdrop"
        type="button"
        aria-label="Cerrar"
        (click)="closeCreate()"
      ></button>
      <section class="customer-create" role="dialog" aria-modal="true">
        <header>
          <div>
            <span>CLIENTES</span>
            <h2>Nuevo cliente</h2>
            <p>Registra la información definida por el modelo de clientes.</p>
          </div>
          <button type="button" (click)="closeCreate()">×</button>
        </header>
        <div class="customer-form">
          <label class="full"
            ><span>Nombre <b>*</b></span
            ><input
              #customerName
              required
              type="text"
              (input)="setCustomerDraft('name', customerName.value)"
          /></label>
          <label
            ><span>Correo electrónico</span
            ><input
              #customerEmail
              type="email"
              (input)="setCustomerDraft('email', customerEmail.value)"
          /></label>
          <label
            ><span>Teléfono</span
            ><input
              #customerPhone
              type="tel"
              (input)="setCustomerDraft('phone', customerPhone.value)"
          /></label>
          <label
            ><span>Celular</span
            ><input
              #customerCellphone
              type="tel"
              (input)="setCustomerDraft('cellphone', customerCellphone.value)"
          /></label>
          <label
            ><span>Estado</span
            ><app-styled-picklist
              [options]="customerStatusOptions"
              [value]="customerDraft()['status'] || 'active'"
              (valueChange)="setCustomerDraft('status', $event)"
          /></label>
          <label class="full"
            ><span>Dirección</span
            ><input
              #customerAddress
              type="text"
              (input)="setCustomerDraft('address', customerAddress.value)"
          /></label>
          <label
            ><span>Latitud</span
            ><input
              #customerLatitude
              type="number"
              step="any"
              (input)="setCustomerDraft('latitude', customerLatitude.value)"
          /></label>
          <label
            ><span>Longitud</span
            ><input
              #customerLongitude
              type="number"
              step="any"
              (input)="setCustomerDraft('longitude', customerLongitude.value)"
          /></label>
          <label
            ><span>Día de facturación</span
            ><input
              #customerBillingDay
              type="number"
              min="1"
              max="28"
              value="1"
              (input)="setCustomerDraft('billingDay', customerBillingDay.value)"
          /></label>
          <label class="date-control"
            ><app-inline-editable-date-field
              label="Fecha de instalación"
              [value]="customerDraft()['installDate'] || ''"
              placeholder="Seleccionar fecha"
              [alwaysShowEdit]="true"
              [compact]="true"
              (valueSaved)="setCustomerDraft('installDate', $event)"
          /></label>
          <label class="full"
            ><span>Notas internas</span
            ><textarea
              #customerNotes
              rows="4"
              (input)="setCustomerDraft('notes', customerNotes.value)"
            ></textarea>
          </label>
        </div>
        <footer>
          <small><b>*</b> Campo obligatorio según Prisma.</small
          ><button type="button" (click)="closeCreate()">Cancelar</button
          ><button
            class="primary"
            type="button"
            [disabled]="!canCreateCustomer()"
            (click)="createCustomer()"
          >
            Crear cliente
          </button>
        </footer>
      </section>
    }
    <header class="page-header">
      <div>
        <div class="breadcrumbs"><span>CRM</span><b>›</b><span>Clientes</span></div>
        <h1>Clientes</h1>
        <p>Administra sus servicios, saldos y datos de contacto.</p>
      </div>
      <div class="page-header__actions">
        <button class="button">⇩ Exportar</button
        ><button class="button button--primary">＋ Nuevo cliente</button>
      </div>
    </header>
    <section class="mini-stats">
      <div>
        <span>Total de clientes</span><b>{{ customers().length }}</b
        ><small>En esta vista mock</small>
      </div>
      <div>
        <span>Activos</span><b>{{ activeCount() }}</b
        ><small class="success">● Servicios operando</small>
      </div>
      <div>
        <span>Saldo pendiente</span
        ><b>{{ pendingBalance() | currency: 'MXN' : 'symbol-narrow' : '1.0-0' : i18n.locale() }}</b
        ><small>Por cobrar</small>
      </div>
    </section>
    <section class="card customer-table-card">
      <div class="filterbar">
        <label class="table-search"
          ><span>⌕</span
          ><input
            #search
            type="search"
            placeholder="Buscar por nombre, teléfono o comunidad"
            (input)="query.set(search.value)" /></label
        ><select
          #status
          aria-label="Filtrar por estado"
          (change)="statusFilter.set(asStatus(status.value))"
        >
          <option value="all">Todos los estados</option>
          <option value="active">Activos</option>
          <option value="pending">Pendientes</option>
          <option value="suspended">Suspendidos</option>
          <option value="inactive">Inactivos</option></select
        ><button class="button">☷ Filtros</button
        ><span class="filterbar__count">{{ filtered().length }} resultados</span>
      </div>
      @if (loading()) {
        <div class="table-loading">
          @for (row of [1, 2, 3, 4, 5]; track row) {
            <div class="skeleton"></div>
          }
        </div>
      } @else if (error()) {
        <div class="state-card">
          <h2>No pudimos cargar los clientes</h2>
          <button class="button" (click)="load()">Reintentar</button>
        </div>
      } @else if (filtered().length === 0) {
        <div class="state-card">
          <span>⌕</span>
          <h2>Sin resultados</h2>
          <p>Prueba con otra búsqueda o limpia los filtros.</p>
          <button class="button" (click)="clearFilters(status)">Limpiar filtros</button>
        </div>
      } @else {
        <div class="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Estado</th>
                <th>Plan</th>
                <th>Mensualidad</th>
                <th>Facturación</th>
                <th>Saldo</th>
                <th>Zona</th>
                <th>Técnico</th>
                <th aria-label="Acciones"></th>
              </tr>
            </thead>
            <tbody>
              @for (customer of paginated(); track customer.id) {
                <tr>
                  <td>
                    <a class="customer-cell" [routerLink]="['/customers', customer.id]"
                      ><span class="avatar">{{ customer.initials }}</span
                      ><span
                        ><b>{{ customer.name }}</b
                        ><small>{{ customer.id }} · {{ customer.phone }}</small></span
                      ></a
                    >
                  </td>
                  <td><app-status-badge [status]="customer.status" /></td>
                  <td>
                    <b class="normal">{{ customer.plan }}</b
                    ><small class="block">{{ customer.speed }}</small>
                  </td>
                  <td>
                    {{
                      customer.monthlyFee
                        | currency: 'MXN' : 'symbol-narrow' : '1.0-0' : i18n.locale()
                    }}
                  </td>
                  <td>Día {{ customer.billingDay }}</td>
                  <td>
                    <b [class.danger-text]="customer.currentBalance > 0">{{
                      customer.currentBalance
                        | currency: 'MXN' : 'symbol-narrow' : '1.0-0' : i18n.locale()
                    }}</b>
                  </td>
                  <td>{{ customer.community }}</td>
                  <td>{{ customer.technician }}</td>
                  <td>
                    <button
                      class="icon-button customer-action-trigger"
                      type="button"
                      [class.is-active]="actionMenuCustomerId() === customer.id"
                      [attr.aria-expanded]="actionMenuCustomerId() === customer.id"
                      [attr.aria-label]="'Acciones para ' + customer.name"
                      (click)="toggleActionMenu($event, customer.id)"
                    >
                      •••
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        <footer class="pagination">
          <span>Mostrando {{ pageStart() }}–{{ pageEnd() }} de {{ filtered().length }}</span>
          <div>
            <button class="icon-button" [disabled]="page() === 1" (click)="page.set(page() - 1)">
              ‹</button
            ><button class="page-number is-active">{{ page() }}</button
            ><button
              class="icon-button"
              [disabled]="pageEnd() === filtered().length"
              (click)="page.set(page() + 1)"
            >
              ›
            </button>
          </div>
        </footer>
      }
    </section>
    @if (actionMenuCustomerId(); as customerId) {
      <div
        class="customer-action-menu"
        role="menu"
        [style.left.px]="actionMenuLeft()"
        [style.top.px]="actionMenuTop()"
        (click)="$event.stopPropagation()"
      >
        <a role="menuitem" [routerLink]="['/customers', customerId]" (click)="closeActionMenu()"
          ><svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M14 3h7v7M21 3l-9 9M11 5H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6"
            /></svg
          ><span>Ver detalles</span></a
        >
        <button role="menuitem" type="button" (click)="closeActionMenu()">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m22 2-7 20-4-9-9-4 20-7ZM11 13 22 2" /></svg
          ><span>Enviar mensaje</span>
        </button>
        <button
          class="customer-action-menu__danger"
          role="menuitem"
          type="button"
          (click)="suspendCustomer(customerId)"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="m5.6 5.6 12.8 12.8" /></svg
          ><span>Suspender</span>
        </button>
      </div>
    }
  `,
  styles: [
    `
      .page-header,
      .mini-stats,
      .customer-table-card,
      .customer-action-menu {
        display: none;
      }
      .create-backdrop {
        position: fixed;
        inset: 0;
        z-index: 1100;
        border: 0;
        background: rgba(15, 23, 42, 0.55);
        backdrop-filter: blur(3px);
      }
      .customer-create {
        position: fixed;
        top: 50%;
        left: 50%;
        z-index: 1101;
        width: min(720px, calc(100vw - 28px));
        max-height: calc(100vh - 28px);
        overflow-y: auto;
        border: 1px solid var(--color-border);
        border-radius: 16px;
        background: var(--color-surface);
        box-shadow: 0 30px 80px rgba(15, 23, 42, 0.3);
        transform: translate(-50%, -50%);
      }
      .customer-create > header {
        padding: 20px 22px 16px;
        border-bottom: 1px solid var(--color-border);
        display: flex;
        justify-content: space-between;
        gap: 16px;
      }
      .customer-create header span {
        color: var(--color-primary);
        font-size: 8px;
        font-weight: 800;
        letter-spacing: 0.09em;
      }
      .customer-create h2 {
        margin-top: 4px;
        font-size: 20px;
      }
      .customer-create header p {
        margin-top: 4px;
        color: var(--color-text-secondary);
        font-size: 10px;
      }
      .customer-create header > button {
        width: 32px;
        height: 32px;
        border: 0;
        border-radius: 50%;
        background: var(--color-muted);
        color: var(--color-text-primary);
        font-size: 20px;
      }
      .customer-form {
        padding: 20px 22px;
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 14px;
      }
      .customer-form label {
        display: flex;
        flex-direction: column;
        gap: 6px;
        color: var(--color-text-secondary);
        font-size: 10px;
        font-weight: 700;
      }
      .customer-form .full {
        grid-column: 1/-1;
      }
      .customer-form label span b,
      .customer-create footer small b {
        color: #dc2626;
      }
      .customer-form input,
      .customer-form select,
      .customer-form textarea {
        width: 100%;
        padding: 0 11px;
        border: 1px solid var(--color-border);
        border-radius: 9px;
        outline: 0;
        background: var(--color-background);
        color: var(--color-text-primary);
        font: inherit;
      }
      .customer-form input,
      .customer-form select,
      .date-control {
        min-height: 40px;
      }
      .customer-form textarea {
        padding-block: 10px;
        resize: vertical;
      }
      .date-control {
        padding: 4px;
        border: 1px solid var(--color-border);
        border-radius: 9px;
        background: var(--color-background);
        justify-content: center;
      }
      .customer-create > footer {
        padding: 14px 22px 19px;
        border-top: 1px solid var(--color-border);
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 8px;
      }
      .customer-create footer small {
        margin-right: auto;
        color: var(--color-text-secondary);
        font-size: 9px;
      }
      .customer-create footer button {
        min-height: 40px;
        padding: 0 14px;
        border: 1px solid var(--color-border);
        border-radius: 9px;
        background: var(--color-surface);
        color: var(--color-text-primary);
        font-weight: 750;
      }
      .customer-create footer .primary {
        border-color: var(--color-primary);
        background: var(--color-primary);
        color: #fff;
      }
      .customer-create footer .primary:disabled {
        opacity: 0.45;
      }
      @media (max-width: 600px) {
        .customer-form {
          grid-template-columns: 1fr;
        }
        .customer-form .full {
          grid-column: auto;
        }
        .customer-create footer small {
          display: none;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomersPage {
  private readonly api = inject(CRM_DATA);
  readonly i18n = inject(LanguageService);
  readonly customers = signal<ReadonlyArray<Customer>>([]);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly query = signal('');
  readonly statusFilter = signal<CustomerStatus | 'all'>('all');
  readonly page = signal(1);
  readonly pageSize = 5;
  readonly actionMenuCustomerId = signal<string | null>(null);
  readonly actionMenuLeft = signal(0);
  readonly actionMenuTop = signal(0);
  readonly createOpen = signal(false);
  readonly customerDraft = signal<Record<string, string>>({ billingDay: '1', status: 'active' });
  readonly customerStatusOptions: ReadonlyArray<PicklistOption> = [
    { value: 'active', label: 'Activo' },
    { value: 'suspended', label: 'Suspendido' },
    { value: 'cancelled', label: 'Cancelado' },
    { value: 'pending', label: 'Prospecto' },
  ];
  readonly canCreateCustomer = computed(() => Boolean(this.customerDraft()['name']?.trim()));
  readonly listColumns = [
    { key: 'name', label: 'Cliente', type: 'identity', secondaryKey: 'phone' },
    { key: 'status', label: 'Estado', type: 'status' },
    { key: 'plan', label: 'Plan', type: 'text' },
    { key: 'monthlyFee', label: 'Mensualidad', type: 'money' },
    { key: 'billingDay', label: 'Día de cobro', type: 'number' },
    { key: 'currentBalance', label: 'Saldo', type: 'money' },
    { key: 'community', label: 'Zona', type: 'text' },
    { key: 'technician', label: 'Técnico', type: 'lookup' },
  ] as const;
  readonly listFields: ReadonlyArray<RecordListField> = [
    { key: 'name', label: 'Nombre', type: 'text' },
    { key: 'email', label: 'Correo', type: 'email' },
    { key: 'phone', label: 'Teléfono', type: 'phone' },
    {
      key: 'status',
      label: 'Estado',
      type: 'status',
      options: ['active', 'pending', 'suspended', 'inactive', 'cancelled'],
    },
    { key: 'plan', label: 'Plan', type: 'select', options: ['Básico', 'Intermedio', 'Premium'] },
    { key: 'monthlyFee', label: 'Mensualidad', type: 'money' },
    { key: 'billingDay', label: 'Día de cobro', type: 'number' },
    { key: 'currentBalance', label: 'Saldo', type: 'money' },
    { key: 'community', label: 'Zona', type: 'text' },
    { key: 'technician', label: 'Técnico', type: 'lookup' },
    { key: 'installDate', label: 'Fecha de instalación', type: 'date' },
  ];
  readonly listRowActions: ReadonlyArray<RecordListAction> = [
    { id: 'view', label: 'Ver detalles', icon: '↗' },
    { id: 'message', label: 'Enviar mensaje', icon: '✉' },
    { id: 'suspend', label: 'Suspender', icon: '⊘' },
    { id: 'delete', label: 'Eliminar', icon: '⊘', danger: true },
  ];
  readonly listBulkActions: ReadonlyArray<RecordListAction> = [
    { id: 'edit', label: 'Editar', icon: '✎' },
    { id: 'export', label: 'Exportar', icon: '⇩' },
    { id: 'suspend', label: 'Suspender', icon: '⊘' },
    { id: 'delete', label: 'Eliminar', icon: '⊘', danger: true },
  ];
  readonly filtered = computed(() => {
    const q = this.query().trim().toLocaleLowerCase(this.i18n.locale());
    const status = this.statusFilter();
    return this.customers().filter(
      (c) =>
        (status === 'all' || c.status === status) &&
        (!q ||
          `${c.name} ${c.phone} ${c.community}`.toLocaleLowerCase(this.i18n.locale()).includes(q)),
    );
  });
  readonly paginated = computed(() =>
    this.filtered().slice((this.page() - 1) * this.pageSize, this.page() * this.pageSize),
  );
  readonly activeCount = computed(
    () => this.customers().filter((c) => c.status === 'active').length,
  );
  readonly pendingBalance = computed(() =>
    this.customers().reduce((sum, c) => sum + c.currentBalance, 0),
  );
  readonly pageStart = computed(() =>
    this.filtered().length ? (this.page() - 1) * this.pageSize + 1 : 0,
  );
  readonly pageEnd = computed(() => Math.min(this.page() * this.pageSize, this.filtered().length));
  openCreate(): void {
    this.customerDraft.set({ billingDay: '1', status: 'active' });
    this.createOpen.set(true);
  }
  closeCreate(): void {
    this.createOpen.set(false);
    this.customerDraft.set({ billingDay: '1', status: 'active' });
  }
  setCustomerDraft(key: string, value: string): void {
    this.customerDraft.update((draft) => ({ ...draft, [key]: value }));
  }
  createCustomer(): void {
    if (!this.canCreateCustomer()) return;
    const draft = this.customerDraft();
    const now = new Date().toISOString();
    const name = draft['name'].trim();
    const latitude = draft['latitude'] ? Number(draft['latitude']) : undefined;
    const longitude = draft['longitude'] ? Number(draft['longitude']) : undefined;
    const customer: Customer = {
      id: `SL-${Date.now()}`,
      organizationId: 'speedlink-mx-01',
      createdAt: now,
      createdBy: { fullName: 'Andrea Torres', email: 'andrea.torres@speedlink.mx', initials: 'AT' },
      updatedAt: now,
      updatedBy: { fullName: 'Andrea Torres', email: 'andrea.torres@speedlink.mx', initials: 'AT' },
      name,
      initials: name
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0])
        .join('')
        .toUpperCase(),
      email: draft['email']?.trim() || '',
      phone: draft['phone']?.trim() || '',
      cellphone: draft['cellphone']?.trim() || undefined,
      address: draft['address']?.trim() || '',
      latitude,
      longitude,
      internalNotes: draft['notes']?.trim() || undefined,
      community: '',
      status: (draft['status'] || 'active') as CustomerStatus,
      plan: 'Por asignar',
      speed: 'Pendiente',
      monthlyFee: 0,
      billingDay: Math.min(28, Math.max(1, Number(draft['billingDay']) || 1)),
      currentBalance: 0,
      technician: 'Sin asignar',
      lastActivity: 'Creado ahora',
      installDate: draft['installDate'] || '',
      gpsLocation:
        latitude !== undefined && longitude !== undefined ? `${latitude}, ${longitude}` : '',
      ipAddress: '',
      equipment: [],
      invoices: [],
      payments: [],
      tickets: [],
      notes: [],
      timeline: [],
    };
    this.api.createCustomer(customer);
    this.customers.update((customers) => [customer, ...customers]);
    this.closeCreate();
  }
  customerRows(): ReadonlyArray<RecordListRow> {
    return this.customers().map((customer) => ({
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      status: customer.status,
      plan: customer.plan,
      monthlyFee: customer.monthlyFee,
      billingDay: customer.billingDay,
      currentBalance: customer.currentBalance,
      community: customer.community,
      technician: customer.technician,
      installDate: customer.installDate,
    }));
  }
  listWidgets(): ReadonlyArray<RecordListWidget> {
    return [
      {
        label: 'Total de clientes',
        value: this.customers().length,
        detail: 'Registros actuales',
        tone: 'blue',
        icon: '♙',
      },
      {
        label: 'Activos',
        value: this.activeCount(),
        detail: 'Servicios operando',
        tone: 'green',
        icon: '✓',
      },
      {
        label: 'Saldo pendiente',
        value: `$${this.pendingBalance().toLocaleString(this.i18n.locale())}`,
        detail: 'Por cobrar',
        tone: 'amber',
        icon: '$',
      },
    ];
  }
  handleListRowAction(actionId: string, row: RecordListRow): void {
    const id = String(row['id']);
    if (actionId === 'message') window.location.href = `mailto:${String(row['email'] ?? '')}`;
    else if (actionId === 'suspend') this.suspendCustomer(id);
    else if (actionId === 'delete')
      this.customers.update((customers) => customers.filter((customer) => customer.id !== id));
  }
  handleListBulkAction(
    actionId: string,
    rows: ReadonlyArray<RecordListRow>,
    field?: string,
    value?: string,
  ): void {
    const ids = new Set(rows.map((row) => String(row['id'])));
    if (actionId === 'edit' && field && value !== undefined)
      this.customers.update((customers) =>
        customers.map((customer) => {
          if (!ids.has(customer.id)) return customer;
          const numeric = ['monthlyFee', 'billingDay', 'currentBalance'].includes(field);
          return { ...customer, [field]: numeric ? Number(value) : value } as Customer;
        }),
      );
    else if (actionId === 'suspend')
      this.customers.update((customers) =>
        customers.map((customer) =>
          ids.has(customer.id) ? { ...customer, status: 'suspended' } : customer,
        ),
      );
    else if (actionId === 'delete')
      this.customers.update((customers) => customers.filter((customer) => !ids.has(customer.id)));
  }
  importCustomers(rows: ReadonlyArray<RecordListRow>): void {
    const now = new Date().toISOString();
    rows.forEach((row, index) => {
      const name = String(row['name'] || `Cliente importado ${index + 1}`);
      const customer: Customer = {
        id: String(row['id'] || `SL-${Date.now() + index}`),
        organizationId: 'speedlink-mx-01',
        createdAt: now,
        createdBy: {
          fullName: 'Andrea Torres',
          email: 'andrea.torres@speedlink.mx',
          initials: 'AT',
        },
        updatedAt: now,
        updatedBy: {
          fullName: 'Andrea Torres',
          email: 'andrea.torres@speedlink.mx',
          initials: 'AT',
        },
        name,
        initials: name
          .split(/\s+/)
          .slice(0, 2)
          .map((part) => part[0])
          .join('')
          .toUpperCase(),
        email: String(row['email'] || ''),
        phone: String(row['phone'] || ''),
        address: '',
        community: String(row['community'] || ''),
        status: 'pending',
        plan: String(row['plan'] || 'Por asignar'),
        speed: '',
        monthlyFee: Number(row['monthlyFee']) || 0,
        billingDay: Number(row['billingDay']) || 1,
        currentBalance: Number(row['currentBalance']) || 0,
        technician: String(row['technician'] || 'Sin asignar'),
        lastActivity: 'Importado ahora',
        installDate: String(row['installDate'] || now),
        gpsLocation: '',
        ipAddress: '',
        equipment: [],
        invoices: [],
        payments: [],
        tickets: [],
        notes: [],
        timeline: [],
      };
      this.api.createCustomer(customer);
      this.customers.update((customers) => [customer, ...customers]);
    });
  }
  constructor() {
    this.load();
  }
  load(): void {
    this.loading.set(true);
    this.api.getCustomers().subscribe({
      next: (data) => {
        this.customers.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }
  asStatus(value: string): CustomerStatus | 'all' {
    this.page.set(1);
    return ['active', 'inactive', 'pending', 'suspended', 'cancelled'].includes(value)
      ? (value as CustomerStatus)
      : 'all';
  }
  clearFilters(select: HTMLSelectElement): void {
    this.query.set('');
    this.statusFilter.set('all');
    select.value = 'all';
  }

  toggleActionMenu(event: MouseEvent, customerId: string): void {
    event.stopPropagation();
    if (this.actionMenuCustomerId() === customerId) {
      this.closeActionMenu();
      return;
    }
    const trigger = event.currentTarget as HTMLElement;
    const rect = trigger.getBoundingClientRect();
    const menuWidth = 220;
    const menuHeight = 204;
    this.actionMenuLeft.set(
      Math.max(12, Math.min(window.innerWidth - menuWidth - 12, rect.right - menuWidth)),
    );
    this.actionMenuTop.set(
      rect.bottom + menuHeight + 12 > window.innerHeight
        ? Math.max(12, rect.top - menuHeight - 6)
        : rect.bottom + 6,
    );
    this.actionMenuCustomerId.set(customerId);
  }
  closeActionMenu(): void {
    this.actionMenuCustomerId.set(null);
  }
  suspendCustomer(customerId: string): void {
    this.customers.update((customers) =>
      customers.map((customer) =>
        customer.id === customerId ? { ...customer, status: 'suspended' } : customer,
      ),
    );
    this.closeActionMenu();
  }
  @HostListener('document:click') closeActionMenuOnOutsideClick(): void {
    this.closeActionMenu();
  }
  @HostListener('document:keydown.escape') closeActionMenuOnEscape(): void {
    this.closeActionMenu();
  }
  @HostListener('window:resize') closeActionMenuOnResize(): void {
    this.closeActionMenu();
  }
  @HostListener('window:scroll') closeActionMenuOnScroll(): void {
    this.closeActionMenu();
  }
}
