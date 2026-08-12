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
import { CRM_DATA } from '../../../core/data-access/crm-data';
import { LanguageService } from '../../../core/i18n/language.service';
import { Customer, CustomerStatus } from '../../../core/models/customer';
import { StatusBadge } from '../../../shared/status-badge';
import {
  RecordList,
  RecordListAction,
  RecordListField,
  RecordListRow,
  RecordListWidget,
} from '../../../shared/record-list';
import { ImportValidationResult } from '../../../shared/import-validation-modal';
import { InlineEditableDateField } from '../../../shared/inline-editable-date-field';
import { PicklistOption, StyledPicklist } from '../../../shared/styled-picklist';

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
  templateUrl: './customers-page.html',
  styleUrl: './customers-page.scss',
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
  readonly canCreateCustomer = computed(() => {
    const draft = this.customerDraft();
    return Boolean(
      draft['name']?.trim() &&
      draft['email']?.trim() &&
      draft['phone']?.trim() &&
      draft['billingDay']
    );
  });
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
    { key: 'name', label: 'Nombre', type: 'text', required: true },
    { key: 'email', label: 'Correo', type: 'email', required: true },
    { key: 'phone', label: 'Teléfono', type: 'phone', required: true },
    {
      key: 'status',
      label: 'Estado',
      type: 'status',
      options: ['active', 'pending', 'suspended', 'inactive', 'cancelled'],
    },
    { key: 'plan', label: 'Plan', type: 'select', options: ['Básico', 'Intermedio', 'Premium'] },
    { key: 'monthlyFee', label: 'Mensualidad', type: 'money' },
    { key: 'billingDay', label: 'Día de cobro', type: 'number', required: true },
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
  importCustomers(result: ImportValidationResult): void {
    const { mode, identifierKey, rows } = result;
    const now = new Date().toISOString();
    rows.forEach((row, index) => {
      const identifierValue = identifierKey ? String(row[identifierKey] ?? '') : '';
      const existing = identifierValue
        ? this.customers().find(
            (customer) => String(customer[identifierKey as keyof Customer]) === identifierValue,
          )
        : undefined;
      if (existing && mode !== 'insert') {
        const changes: Partial<Customer> = { updatedAt: now };
        for (const key of ['name', 'email', 'phone', 'community', 'plan'] as const) {
          if (row[key]) changes[key] = String(row[key]);
        }
        if (row['monthlyFee']) changes.monthlyFee = Number(row['monthlyFee']) || 0;
        if (row['billingDay']) changes.billingDay = Number(row['billingDay']) || 1;
        if (row['currentBalance']) changes.currentBalance = Number(row['currentBalance']) || 0;
        this.customers.update((customers) =>
          customers.map((customer) =>
            customer.id === existing.id ? { ...customer, ...changes } : customer,
          ),
        );
        return;
      }
      if (existing || mode === 'update') return;
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
