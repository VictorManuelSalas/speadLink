import { CurrencyPipe, DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  HostListener,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LanguageService } from '../../../core/i18n/language.service';
import { CRM_DATA } from '../../../core/data-access/crm-data';
import { CrmAttachment, Customer } from '../../../core/models/customer';
import { AttachmentPicker } from '../../../shared/attachment-picker';
import { FileUploadModal } from '../../../shared/file-upload-modal';
import { InlineEditableDateField } from '../../../shared/inline-editable-date-field';
import { InlineEditableField } from '../../../shared/inline-editable-field';
import { RecordField, RecordFieldConfig } from '../../../shared/record-field';
import { PicklistOption, StyledPicklist } from '../../../shared/styled-picklist';
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
import {
  OPERATIONAL_MODULES,
  OperationalModuleKey,
  OperationalRecord,
  ModuleField,
} from '../operational-modules.data';
import { LeadEmailFormValue, LeadEmailModal, LeadEmailSeed } from '../lead-email-modal/lead-email-modal';
import { RecordEventsSection } from '../lead-events-section/lead-events-section';
import { OperationalEmail, OperationalStore } from '../operational-store';
import {
  RecordActivitySection,
  RecordAttachmentsSection,
  RecordEmailsSection,
  RecordNotesSection,
} from '../record-sections/record-sections';
import { InterestedServicesSectionComponent } from '../record-sections/interested-services-section';

type DetailTab = 'Resumen' | 'Correos' | 'Eventos' | 'Notas' | 'Actividad' | 'Archivos' | 'Contratos' | 'Asignaciones' | 'Relaciones' | 'Detalles' | 'Conciliación' | 'Comprobante';

interface RelatedItem {
  icon: string;
  title: string;
  detail: string;
  meta: string;
  tone: string;
  route?: ReadonlyArray<string>;
}

interface LookupPreview {
  type: string;
  title: string;
  detail: string;
  initials: string;
}

interface ContractItemDraft {
  id: string;
  serviceId: string;
  quantity: number;
  unitPrice: number;
  locked?: boolean;
}

const INTERNET_PERMANENCE_MONTHS = 6;

@Component({
  selector: 'app-operational-record-detail-page',
  imports: [
    AttachmentPicker,
    CurrencyPipe,
    DatePipe,
    FileUploadModal,
    InlineEditableDateField,
    InlineEditableField,
    LeadEmailModal,
    RecordDetailLayout,
    RecordField,
    RecordHeader,
    RecordInformationCard,
    RecordQuickActions,
    RecordRecentActivity,
    RecordSummary,
    RecordTabs,
    RecordActivitySection,
    RecordAttachmentsSection,
    RecordEmailsSection,
    RecordEventsSection,
    RecordNotesSection,
    InterestedServicesSectionComponent,
    RouterLink,
    StyledPicklist,
  ],
  templateUrl: './operational-record-detail-page.html',
  styleUrl: './operational-record-detail-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OperationalRecordDetailPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly crmData = inject(CRM_DATA);
  readonly store = inject(OperationalStore);
  readonly i18n = inject(LanguageService);
  readonly moduleKey = this.route.snapshot.data['moduleKey'] as OperationalModuleKey;
  readonly definition = OPERATIONAL_MODULES[this.moduleKey];
  readonly leadGpsField: RecordFieldConfig = {
    key: 'coordinates',
    label: 'Ubicación GPS',
    kind: 'gps',
    editable: true,
  };
  readonly recordId = this.route.snapshot.paramMap.get('id') ?? '';
  readonly record = computed(() => this.store.find(this.moduleKey, this.recordId));
  readonly tabs: ReadonlyArray<DetailTab> =
    this.moduleKey === 'leads'
      ? ['Resumen', 'Correos', 'Eventos', 'Notas', 'Archivos', 'Actividad']
      : this.moduleKey === 'services'
        ? ['Resumen', 'Contratos', 'Notas', 'Archivos', 'Actividad']
        : this.moduleKey === 'equipment'
          ? ['Resumen', 'Asignaciones', 'Notas', 'Archivos', 'Actividad']
          : this.moduleKey === 'assignments'
            ? ['Resumen', 'Notas', 'Archivos', 'Actividad']
            : this.moduleKey === 'invoices'
              ? ['Resumen', 'Notas', 'Archivos', 'Actividad']
              : this.moduleKey === 'payments'
                ? ['Resumen', 'Notas', 'Archivos', 'Actividad']
                : this.moduleKey === 'expenses'
                  ? ['Resumen', 'Notas', 'Archivos', 'Actividad']
                  : ['Resumen', 'Notas', 'Archivos', 'Actividad'];
  readonly activeTab = signal<DetailTab>('Resumen');
  readonly contractItems = signal<ReadonlyArray<ContractItemDraft>>([]);
  readonly contractTotal = computed(() =>
    this.contractItems().reduce((total, item) => total + item.quantity * item.unitPrice, 0),
  );
  readonly contractItemsValid = computed(
    () =>
      this.contractItems().length > 0 &&
      this.contractItems().every((item) => item.serviceId && item.quantity > 0),
  );
  readonly contractItemsDirty = signal(false);
  constructor() {
    this.route.queryParamMap.subscribe((params) => {
      const tab = params.get('tab');
      if (tab && this.tabs.includes(tab as DetailTab)) this.activeTab.set(tab as DetailTab);
    });
    if (this.moduleKey === 'contracts') {
      const record = this.record();
      if (record) {
        this.contractItems.set(
          this.parseContractItems(record).map((item) => ({
            id: `contract-item-${item.serviceId || 'svc'}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            serviceId: item.serviceId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            locked: this.store.find('services', item.serviceId)?.['type'] === 'Internet',
          })),
        );
      }
    }
  }
  recordTabs(id: string): ReadonlyArray<RecordTabItem> {
    const record = this.record();
    return this.tabs.map((label) => ({
      label,
      count:
        label === 'Notas'
          ? this.notes(id).length
          : label === 'Actividad'
            ? this.activity(id).length
            : label === 'Archivos'
              ? this.recordFiles(id).length
              : label === 'Correos'
                ? this.emails(id).length
                : (label === 'Contratos' || label === 'Asignaciones') && record
                  ? this.relatedItems(record).length
                  : undefined,
    }));
  }
  setActiveTab(value: string): void {
    if (this.tabs.includes(value as DetailTab)) this.activeTab.set(value as DetailTab);
  }
  readonly editingStatus = signal(false);
  readonly editingPicklistKey = signal<string | null>(null);
  readonly emailComposerOpen = signal(false);
  readonly emailPreview = signal<OperationalEmail | null>(null);
  readonly emailComposeSeed = signal<LeadEmailSeed>({});
  readonly emailComposeKey = signal(0);
  readonly emailMenuId = signal<string | null>(null);
  readonly editingEmailId = signal<string | null>(null);
  readonly noteComposerOpen = signal(false);
  readonly noteDraft = signal('');
  readonly noteMenuId = signal<string | null>(null);
  readonly editingNoteId = signal<string | null>(null);
  readonly pinNewNote = signal(false);
  readonly selectedNoteId = signal<string | null>(null);
  readonly attachments = signal<ReadonlyArray<CrmAttachment>>([]);
  readonly attachmentReset = signal(0);
  readonly uploadModalOpen = signal(false);
  readonly fileMenuId = signal<string | null>(null);
  readonly activityModule = signal('');
  readonly activityType = signal<'' | 'CREATE' | 'EDIT' | 'DELETE'>('');
  readonly activityDate = signal('');
  readonly activityModuleOptions = [
    'Registro',
    'Leads',
    'Clientes',
    'Tickets',
    'Servicios',
    'Equipamiento',
    'Asignaciones',
    'Contratos',
    'Facturas',
    'Pagos',
    'Gastos',
    'Notas',
    'Archivos',
    'Correos',
    'Calendario',
    'Configuración de organización',
    'Usuarios',
    'Roles y permisos',
    'SMTP',
    'SMS',
    'Portal',
    'Plantillas',
    'Módulos',
    'Automatizaciones',
    'Flujos de trabajo',
    'Programaciones',
    'Registro de actividad',
    'Auditoría',
    'Restricciones IP',
    'Inicio de sesión 2FA',
    'Webhooks',
    'APIs',
    'Integraciones',
  ];
  readonly summaryColumns = computed(() =>
    this.moduleKey === 'leads'
      ? [
          { key: 'prospectType', label: 'Tipo de prospecto', type: 'text' as const },
          { key: 'source', label: 'Origen', type: 'text' as const },
          { key: 'status', label: 'Estado', type: 'status' as const },
          { key: 'phone', label: 'WhatsApp', type: 'text' as const },
        ]
      : this.definition.columns.slice(0, 4),
  );
  readonly statusOptions = computed(() =>
    this.definition.fields.find((field) => field.key === 'status')?.options?.length
      ? [...(this.definition.fields.find((field) => field.key === 'status')?.options ?? [])]
      : Array.from(
          new Set(
            this.store
              .recordsFor(this.moduleKey)
              .map((item) => String(item['status'] ?? ''))
              .filter(Boolean),
          ),
        ),
  );
  primaryValue(record: OperationalRecord): string {
    return String(record[this.definition.columns[0].key] ?? record.id);
  }
  initials(value: string): string {
    return value
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase();
  }
  asString(value: string | number | boolean): string {
    return String(value);
  }
  asNumber(value: string | number | boolean): number {
    return Number(value) || 0;
  }
  editableInputType(key: string): 'text' | 'email' | 'tel' | 'date' {
    if (key === 'email') return 'email';
    if (key === 'phone' || key === 'cellphone') return 'tel';
    return 'text';
  }
  fieldDisplayValue(
    field: { type: string; inputType?: string; optionLabels?: Record<string, string> },
    value: string | number | boolean,
  ): string {
    if (field.type === 'money') {
      return new Intl.NumberFormat(this.i18n.locale(), {
        style: 'currency',
        currency: 'MXN',
        maximumFractionDigits: 2,
      }).format(this.asNumber(value));
    }
    if (field.inputType === 'select' && field.optionLabels) {
      return field.optionLabels[String(value)] || '';
    }
    return '';
  }
  fieldActionHref(key: string, value: string | number | boolean): string {
    if (!value) return '';
    if (key === 'email') return 'mailto:' + String(value);
    if (key === 'phone' || key === 'cellphone')
      return 'tel:' + String(value).replace(/[^\d+]/g, '');
    return '';
  }
  whatsappUrl(value: string | number | boolean): string {
    return `https://wa.me/${String(value ?? '').replace(/\D/g, '')}`;
  }
  relatedRoute(key: string, value: string | number | boolean): ReadonlyArray<string> | null {
    const text = String(value ?? '');
    if (!text) return null;
    if (key === 'convertedToClientId') return ['/customers', text];
    if (key === 'invoice') return ['/invoices', text];
    if (key === 'client') {
      return text.startsWith('SL-') ? ['/customers', text] : null;
    }
    if (key === 'equipment') {
      return text.startsWith('EQ-') ? ['/equipment', text] : null;
    }
    if (key === 'service') {
      const service = this.store
        .recordsFor('services')
        .find((record) => text.includes(String(record['name'])));
      return service ? ['/services', service.id] : null;
    }

    const field = this.definition.fields.find((f) => f.key === key);
    if (field?.options && field?.lookupModule) {
      return [`/${field.lookupModule}`, text];
    }
    return null;
  }
  lookupPreview(key: string, value: string | number | boolean): LookupPreview | null {
    const route = this.relatedRoute(key, value);
    if (!route) return null;
    const text = String(value);
    const relatedModule = route[0].replace('/', '') as OperationalModuleKey;
    const related = OPERATIONAL_MODULES[relatedModule]
      ? this.store.find(relatedModule, route[1])
      : undefined;
    const title = related ? this.primaryValueForModule(relatedModule, related) : text;
    const typeLabels: Readonly<Record<string, string>> = {
      customers: 'Cliente relacionado',
      invoices: 'Factura relacionada',
      equipment: 'Equipo relacionado',
      services: 'Servicio relacionado',
    };
    return {
      type: typeLabels[relatedModule] ?? 'Registro relacionado',
      title,
      detail: related ? `${related.id} · Clic para abrir` : `${route[1]} · Clic para abrir`,
      initials: this.initials(title),
    };
  }
  private primaryValueForModule(module: OperationalModuleKey, record: OperationalRecord): string {
    return String(record[OPERATIONAL_MODULES[module].columns[0].key] ?? record.id);
  }
  createdAt(record: OperationalRecord): string {
    return String(record['createdAt'] ?? '2026-07-12T09:30:00-06:00');
  }
  updatedAt(record: OperationalRecord): string {
    return String(
      record['updatedAt'] ?? record['date'] ?? record['assignedAt'] ?? '2026-07-18T12:00:00-06:00',
    );
  }
  formattedUpdatedAt(record: OperationalRecord): string {
    return new Intl.DateTimeFormat(this.i18n.locale(), {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(this.updatedAt(record)));
  }
  statusLabel(value: string | number | boolean): string {
    return String(value)
      .replaceAll('_', ' ')
      .toLocaleLowerCase()
      .replace(/^./, (letter) => letter.toUpperCase());
  }
  statusTone(value: string | number | boolean): string {
    const status = String(value);
    if (['ACTIVE', 'AVAILABLE', 'PAID', 'QUALIFIED', 'COMPLETED'].includes(status)) return 'green';
    if (['OVERDUE', 'DAMAGED', 'CANCELLED', 'LOST', 'EXPIRED'].includes(status)) return 'red';
    if (['PENDING', 'PENDING_SIGNATURE', 'IN_REPAIR', 'CONTACTED', 'RETURNED'].includes(status))
      return 'amber';
    if (['NEW', 'ASSIGNED', 'DRAFT'].includes(status)) return 'blue';
    return 'violet';
  }
  statHelper(key: string): string {
    return (
      (
        {
          status: 'Estado actual',
          price: 'Precio vigente',
          total: 'Importe registrado',
          amount: 'Importe registrado',
          client: 'Cuenta relacionada',
          updatedAt: 'Último movimiento',
          assignedAt: 'Fecha de entrega',
        } as Record<string, string>
      )[key] ?? 'Información principal'
    );
  }
  displayFields(record: OperationalRecord) {
    return Object.keys(record)
      .filter(
        (key) =>
          key !== 'id' &&
          key !== 'updatedAt' &&
          !(this.moduleKey === 'leads' && (key === 'latitude' || key === 'longitude')) &&
          !(this.moduleKey === 'contracts' && key === 'items') &&
          !(this.moduleKey === 'services' && key === 'updatedAt'),
      )
      .map((key) => {
        const column = this.definition.columns.find((item) => item.key === key);
        const configured = this.definition.fields.find((item) => item.key === key);
        return {
          key,
          label: column?.label ?? configured?.label ?? this.statusLabel(key),
          type: column?.type ?? (configured?.type === 'date' ? 'date' : 'text'),
          editable: Boolean(configured),
          inputType:
            configured?.type === 'number'
              ? 'number'
              : configured?.type === 'date'
                ? 'date'
                : configured?.type === 'select'
                  ? 'select'
                  : 'text',
          options: configured?.options ?? [],
          optionLabels: configured?.optionLabels ?? {},
        };
      });
  }
  operationalFieldConfig(
    field: ReturnType<OperationalRecordDetailPage['displayFields']>[number],
    record: OperationalRecord,
  ): RecordFieldConfig {
    const value = record[field.key];
    const isSelectOrLookup = field.inputType === 'select' || field.type === 'lookup';
    const hasOptions = field.options && field.options.length > 0;
    const route = this.relatedRoute(field.key, value) ?? undefined;
    const preview = route ? (this.lookupPreview(field.key, value) ?? undefined) : undefined;

    // Los lookups editables deben seguir siendo lookups si tienen route (para el link), pero también editables
    // Los select puros sin route son campos select normales
    const kind: RecordFieldConfig['kind'] =
      field.type === 'status'
        ? 'status'
        : isSelectOrLookup && hasOptions && route
          ? 'lookup'
          : isSelectOrLookup && hasOptions && !route
            ? 'select'
            : route
              ? 'lookup'
              : field.type === 'date'
                ? 'date'
                : field.type === 'money' && !field.editable
                  ? 'money'
                  : field.inputType === 'number' && field.editable
                    ? 'text'
                    : this.editableInputType(field.key) === 'email'
                      ? 'email'
                      : this.editableInputType(field.key) === 'tel'
                        ? 'phone'
                        : field.type === 'money'
                          ? 'money'
                          : 'text';

    return {
      key: field.key,
      label: field.label,
      kind,
      editable: field.editable || (isSelectOrLookup && hasOptions),
      options: field.type === 'status' ? this.statusOptions() : field.options,
      optionLabels: field.optionLabels,
      href: this.fieldActionHref(field.key, value),
      displayValue: this.fieldDisplayValue(field, value),
      route: kind === 'lookup' ? route : undefined,
      preview: kind === 'lookup' ? preview : undefined,
      statusLabel: this.statusLabel(value),
      statusTone: this.statusTone(value),
    };
  }
  operationalAuditField(key: string, label: string): RecordFieldConfig {
    return {
      key,
      label,
      kind: 'audit',
      auditUser: {
        id: 'usr-andrea-torres',
        fullName: 'Andrea Torres',
        email: 'andrea.torres@speedlink.mx',
        initials: 'AT',
      },
    };
  }
  saveOperationalField(record: OperationalRecord, key: string, value: string): void {
    if (this.moduleKey === 'leads' && key === 'status' && value === 'CONVERTED') {
      this.convertLead(record);
      return;
    }
    this.updateField(record.id, key, value);
  }
  updateField(id: string, key: string, value: string): void {
    this.store.update(this.moduleKey, id, { [key]: value });
  }
  saveLeadStatus(id: string, key: string, value: string): void {
    const lead = this.store.find('leads', id);
    if (value === 'CONVERTED' && lead) this.convertLead(lead);
    else this.updateField(id, key, value);
    this.editingStatus.set(false);
  }
  savePicklist(id: string, key: string, value: string): void {
    this.updateField(id, key, value);
    this.editingPicklistKey.set(null);
  }
  getOptionLabel(field: any, value: any): string {
    const stringValue = String(value);
    return field?.optionLabels?.[stringValue] || stringValue;
  }

  getFieldPicklistOptions(field: any): Array<{ value: string; label: string }> {
    if (!field?.options) return [];
    return field.options.map((option: string) => ({
      value: option,
      label: field?.optionLabels?.[option] || option,
    }));
  }

  fieldValueAsString(value: any): string {
    return value ? String(value) : '';
  }

  getLookupOptions(fieldKey: string): { options: ReadonlyArray<string>; optionLabels: Record<string, string> } {
    const configured = this.definition.fields.find((f) => f.key === fieldKey);
    if (!configured?.options) {
      return { options: [], optionLabels: {} };
    }
    return {
      options: configured.options,
      optionLabels: configured.optionLabels ?? {},
    };
  }
  leadCoordinates(record: OperationalRecord): string {
    return `${record['latitude'] ?? 19.432608}, ${record['longitude'] ?? -99.133209}`;
  }
  updateLeadCoordinates(id: string, coordinates: string): void {
    const [latitude, longitude] = coordinates.split(',').map((value) => Number(value.trim()));
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
    this.store.update('leads', id, { latitude, longitude });
  }
  openNoteComposerQuickAction(): void {
    this.activeTab.set('Notas');
    this.noteComposerOpen.set(true);
    setTimeout(() => this.noteComposerOpen.set(false));
  }
  openEmailComposer(): void {
    this.activeTab.set('Correos');
    const lead = this.record();
    this.emailComposeSeed.set({
      to: String(lead?.['email'] ?? ''),
      from: 'andrea.torres@speedlink.mx',
      title: 'Redactar mensaje',
    });
    this.emailComposeKey.update((value) => value + 1);
    this.editingEmailId.set(null);
    this.emailPreview.set(null);
    this.emailComposerOpen.set(true);
  }
  emails(id: string) {
    return this.store.emailsFor(id);
  }
  saveLeadEmail(id: string, value: LeadEmailFormValue, draft: boolean): void {
    this.store.saveEmail(id, value, draft, this.editingEmailId() ?? undefined);
    this.closeEmailComposer();
  }
  closeEmailComposer(): void {
    this.emailComposerOpen.set(false);
    this.editingEmailId.set(null);
  }
  openEmail(email: OperationalEmail): void {
    if (email.status === 'DRAFT') this.editDraft(email);
    else this.openEmailPreview(email);
  }
  openEmailPreview(email: OperationalEmail): void {
    this.emailMenuId.set(null);
    this.emailPreview.set(email);
  }
  toggleEmailMenu(event: MouseEvent, emailId: string): void {
    event.stopPropagation();
    this.emailMenuId.set(this.emailMenuId() === emailId ? null : emailId);
  }
  composeFromEmail(email: OperationalEmail, action: 'resend' | 'forward'): void {
    const forwarded = action === 'forward';
    this.emailComposeSeed.set({
      title: forwarded ? 'Reenviar correo' : 'Reenviar mensaje',
      to: forwarded ? '' : email.to,
      cc: forwarded ? '' : email.cc,
      from: email.from,
      subject: forwarded
        ? email.subject.startsWith('Fwd:')
          ? email.subject
          : `Fwd: ${email.subject}`
        : email.subject,
      body: forwarded
        ? `\n\n---------- Mensaje reenviado ----------\nDe: ${email.from}\nPara: ${email.to}\nAsunto: ${email.subject}\n\n${email.body}`
        : email.body,
      attachments: email.attachments,
    });
    this.emailComposeKey.update((value) => value + 1);
    this.editingEmailId.set(null);
    this.emailMenuId.set(null);
    this.emailPreview.set(null);
    this.emailComposerOpen.set(true);
  }
  editDraft(email: OperationalEmail): void {
    this.emailComposeSeed.set({
      title: 'Editar borrador',
      to: email.to,
      cc: email.cc,
      from: email.from,
      subject: email.subject,
      body: email.body,
      attachments: email.attachments,
    });
    this.editingEmailId.set(email.id);
    this.emailComposeKey.update((value) => value + 1);
    this.emailMenuId.set(null);
    this.emailPreview.set(null);
    this.emailComposerOpen.set(true);
  }
  openNoteComposer(): void {
    this.activeTab.set('Notas');
    this.noteComposerOpen.set(true);
  }
  isConvertedLead(record: OperationalRecord): boolean {
    return this.moduleKey === 'leads' && record['status'] === 'CONVERTED';
  }
  convertLead(lead: OperationalRecord): void {
    if (this.moduleKey !== 'leads' || this.isConvertedLead(lead)) return;
    const convertedAt = new Date().toISOString();
    const customerId =
      'SL-' +
      (1100 +
        this.store.recordsFor('leads').filter((item) => item['status'] === 'CONVERTED').length);
    const name = String(lead['name'] ?? 'Cliente convertido');
    const customer: Customer = {
      id: customerId,
      organizationId: 'speedlink-mx-01',
      createdAt: convertedAt,
      createdBy: { fullName: 'Andrea Torres', email: 'andrea.torres@speedlink.mx', initials: 'AT' },
      updatedAt: convertedAt,
      updatedBy: { fullName: 'Andrea Torres', email: 'andrea.torres@speedlink.mx', initials: 'AT' },
      name,
      initials: this.initials(name),
      email: String(lead['email'] ?? ''),
      phone: String(lead['phone'] ?? lead['cellphone'] ?? ''),
      address: String(lead['address'] ?? 'Dirección pendiente'),
      community: 'Comunidad pendiente',
      status: 'pending',
      plan: 'Por asignar',
      speed: 'Pendiente',
      monthlyFee: 0,
      billingDay: 1,
      currentBalance: 0,
      technician: 'Sin asignar',
      lastActivity: 'Convertido ahora',
      installDate: convertedAt,
      gpsLocation:
        String(lead['latitude'] ?? '19.4326') + ', ' + String(lead['longitude'] ?? '-99.1332'),
      ipAddress: 'Pendiente',
      equipment: [],
      invoices: [],
      payments: [],
      tickets: [],
      notes: [],
      timeline: [
        {
          id: 'conversion-' + Date.now(),
          title: 'Cliente convertido desde lead',
          detail: 'Origen: ' + String(lead['source'] ?? 'No especificado') + ' · Lead ' + lead.id,
          date: convertedAt,
          type: 'service',
          author: 'Andrea Torres',
        },
      ],
    };
    this.crmData.createCustomer(customer);
    this.store.update('leads', lead.id, {
      status: 'CONVERTED',
      convertedAt,
      convertedToClientId: customerId,
    });
  }
  notes(id: string) {
    return this.store.notesFor(id);
  }
  activity(id: string) {
    return this.store.activityFor(id);
  }
  filteredActivity(id: string) {
    const module = this.activityModule();
    const type = this.activityType();
    const date = this.activityDate();
    return this.activity(id).filter((event) => {
      const eventDate = this.localDateKey(event.createdAt);
      return (
        (!module || event.module === module) &&
        (!type || event.actionType === type) &&
        (!date || eventDate === date)
      );
    });
  }
  setActivityModule(event: Event): void {
    this.activityModule.set((event.target as HTMLSelectElement).value);
  }
  setActivityType(event: Event): void {
    this.activityType.set(
      (event.target as HTMLSelectElement).value as '' | 'CREATE' | 'EDIT' | 'DELETE',
    );
  }
  clearActivityFilters(): void {
    this.activityModule.set('');
    this.activityType.set('');
    this.activityDate.set('');
  }
  actionTypeLabel(type: 'CREATE' | 'EDIT' | 'DELETE'): string {
    return { CREATE: 'Creación', EDIT: 'Edición', DELETE: 'Eliminación' }[type];
  }
  private localDateKey(value: string): string {
    const date = new Date(value);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  saveNote(id: string): void {
    const message = this.noteDraft().trim();
    if (!message) return;
    const editingId = this.editingNoteId();
    const pinned = this.pinNewNote() && this.canPinNote(id);
    if (editingId) this.store.updateNote(id, editingId, message, pinned, this.attachments());
    else this.store.addNote(id, message, this.attachments(), pinned);
    this.cancelNoteEdit();
  }
  deleteNote(id: string, noteId: string): void {
    this.store.deleteNote(id, noteId);
    if (this.editingNoteId() === noteId) this.cancelNoteEdit();
    this.noteMenuId.set(null);
  }
  toggleNoteMenu(event: MouseEvent, noteId: string): void {
    event.stopPropagation();
    this.noteMenuId.set(this.noteMenuId() === noteId ? null : noteId);
  }
  @HostListener('document:click') closeNoteMenu(): void {
    this.noteMenuId.set(null);
    this.fileMenuId.set(null);
    this.emailMenuId.set(null);
  }
  recordFiles(recordId: string): ReadonlyArray<CrmAttachment> {
    return this.store.attachmentsFor(recordId);
  }
  handleRecordFilesUploaded(recordId: string, files: ReadonlyArray<CrmAttachment>): void {
    this.store.addAttachments(recordId, files);
    this.uploadModalOpen.set(false);
  }
  toggleFileMenu(event: MouseEvent, fileId: string): void {
    event.stopPropagation();
    this.fileMenuId.set(this.fileMenuId() === fileId ? null : fileId);
  }
  deleteRecordFile(recordId: string, fileId: string): void {
    this.store.deleteAttachment(recordId, fileId);
    this.fileMenuId.set(null);
  }
  startEditingNote(noteId: string, message: string, pinned: boolean): void {
    this.noteComposerOpen.set(true);
    this.editingNoteId.set(noteId);
    this.noteDraft.set(message);
    this.pinNewNote.set(pinned);
    this.noteMenuId.set(null);
  }
  cancelNoteEdit(): void {
    this.noteDraft.set('');
    this.pinNewNote.set(false);
    this.editingNoteId.set(null);
    this.attachments.set([]);
    this.attachmentReset.update((value) => value + 1);
    this.noteComposerOpen.set(false);
  }
  pinnedNotes(recordId: string) {
    return this.notes(recordId)
      .filter((note) => note.pinned)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .slice(0, 5);
  }
  sortedNotes(recordId: string) {
    return [...this.notes(recordId)].sort(
      (left, right) =>
        Number(right.pinned) - Number(left.pinned) || right.createdAt.localeCompare(left.createdAt),
    );
  }
  canPinNote(recordId: string): boolean {
    const editingId = this.editingNoteId();
    return (
      this.pinnedNotes(recordId).length < 5 ||
      this.notes(recordId).some((note) => note.id === editingId && note.pinned)
    );
  }
  canTogglePinned(recordId: string, pinned: boolean): boolean {
    return pinned || this.pinnedNotes(recordId).length < 5;
  }
  toggleDraftPin(recordId: string): void {
    if (this.pinNewNote()) this.pinNewNote.set(false);
    else if (this.canPinNote(recordId)) this.pinNewNote.set(true);
  }
  togglePinnedNote(recordId: string, noteId: string): void {
    const note = this.notes(recordId).find((item) => item.id === noteId);
    if (!note || !this.canTogglePinned(recordId, note.pinned)) return;
    this.store.togglePinnedNote(recordId, noteId);
    if (this.editingNoteId() === noteId) this.pinNewNote.set(!note.pinned);
    this.noteMenuId.set(null);
  }
  openPinnedNote(noteId: string): void {
    this.activeTab.set('Notas');
    this.selectedNoteId.set(noteId);
    window.setTimeout(() =>
      document
        .getElementById(`operational-note-${noteId}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
    );
    window.setTimeout(() => this.selectedNoteId.set(null), 2200);
  }
  formatSize(size: number): string {
    return size < 1024 * 1024
      ? `${Math.max(1, Math.round(size / 1024))} KB`
      : `${(size / 1024 / 1024).toFixed(1)} MB`;
  }
  fileExtension(fileName: string): string {
    return fileName.split('.').pop()?.slice(0, 4).toUpperCase() || 'FILE';
  }
  relatedTitle(): string {
    return (
      {
        leads: 'Tareas de seguimiento',
        services: 'Contratos con este servicio',
        equipment: 'Asignaciones del equipo',
        assignments: 'Relaciones de la asignación',
        contracts: 'Servicios contratados',
        invoices: 'Conceptos y pagos',
        payments: 'Conciliación del pago',
        expenses: 'Comprobante y clasificación',
      } as Record<OperationalModuleKey, string>
    )[this.moduleKey];
  }
  relatedSubtitle(): string {
    return (
      {
        leads: 'Acciones pendientes y próximos compromisos',
        services: 'Clientes que tienen el plan activo',
        equipment: 'Historial de entrega y ubicación',
        assignments: 'Cliente y dispositivo vinculados',
        contracts: 'Partidas incluidas en el contrato',
        invoices: 'Detalle financiero de la factura',
        payments: 'Factura y referencia relacionadas',
        expenses: 'Evidencia y datos del egreso',
      } as Record<OperationalModuleKey, string>
    )[this.moduleKey];
  }
  equipmentAssignments(record: OperationalRecord): ReadonlyArray<RelatedItem> {
    const assignments = this.store.recordsFor('assignments');
    const equipmentAssignments = assignments.filter((a) => a['equipment'] === record.id);
    const clientNames: Record<string, string> = {
      'SL-1040': 'José Luis Hernández',
      'SL-1041': 'Morgan Díaz',
      'SL-1042': 'Consultorio Dental Sonríe',
      'SL-1043': 'Distribuidora Nova',
    };
    return equipmentAssignments.map((assignment) => {
      const clientId = String(assignment['client'] ?? '');
      const clientName = clientNames[clientId] || clientId;
      const statusTone = (status: string): string =>
        status === 'ACTIVE' ? 'green' : status === 'RETURNED' ? 'orange' : 'red';
      const statusLabel = (status: string): string =>
        status === 'ACTIVE' ? 'Activo' : status === 'RETURNED' ? 'Devuelto' : 'Inactivo';
      return {
        icon: '⌂',
        title: clientName,
        detail: String(assignment['assignedAt'] ?? 'Sin fecha'),
        meta: statusLabel(String(assignment['status'] ?? 'INACTIVE')),
        tone: statusTone(String(assignment['status'] ?? 'INACTIVE')),
        route: ['/assignments', assignment.id],
      };
    });
  }
  relatedItems(record: OperationalRecord): ReadonlyArray<RelatedItem> {
    const clientId = String(
      record['clientId'] ??
        (
          {
            'José Luis Hernández': 'SL-1040',
            'Morgan Díaz': 'SL-1041',
            'Consultorio Dental Sonríe': 'SL-1042',
            'Distribuidora Nova': 'SL-1043',
          } as Record<string, string>
        )[String(record['client'] ?? '')] ??
        '',
    );
    const equipmentId = String(
      record['equipmentId'] ??
        (
          {
            'Antena CPE': 'EQ-4092',
            'Router Wi-Fi': 'EQ-4091',
            'Access Point': 'EQ-4088',
          } as Record<string, string>
        )[String(record['equipment'] ?? '').split(' · ')[0]] ??
        '',
    );
    const map: Record<OperationalModuleKey, ReadonlyArray<RelatedItem>> = {
      leads: [
        {
          icon: '✓',
          title: 'Enviar propuesta comercial',
          detail: 'Asignada a Andrea Torres · Prioridad alta',
          meta: 'Hoy, 16:00',
          tone: 'violet',
        },
        {
          icon: '→',
          title: 'Validar cobertura en la dirección',
          detail: 'Pendiente · Requiere confirmación técnica',
          meta: '22 jul',
          tone: 'blue',
        },
      ],
      services: (() => {
        const clients = [
          { id: '817', name: 'José Luis Hernández', detail: `1 × ${this.primaryValue(record)}` },
          { id: '812', name: 'Morgan Díaz', detail: 'Renovación anual automática' },
          { id: '805', name: 'Consultorio Dental Sonríe', detail: `2 × ${this.primaryValue(record)}` },
          { id: '820', name: 'Distribuidora Nova', detail: `1 × ${this.primaryValue(record)}` },
          { id: '825', name: 'Farmacia El Árnica', detail: 'Plan anual vigente' },
        ];
        return clients.map((client, index) => ({
          icon: '▤',
          title: `SL-CTR-0${client.id} · ${client.name}`,
          detail: client.detail,
          meta: 'Activo',
          tone: 'green',
          route: ['/contracts', `CTR-2026-${client.id}`],
        }));
      })(),
      equipment: this.equipmentAssignments(record),
      assignments: [
        {
          icon: '♙',
          title: String(record['client'] ?? 'Cliente'),
          detail: 'Cuenta relacionada con la instalación',
          meta: 'Ver cliente',
          tone: 'blue',
          route: clientId ? ['/customers', clientId] : undefined,
        },
        {
          icon: '▣',
          title: String(record['equipment'] ?? 'Equipo'),
          detail: String(record['serial'] ?? 'Inventario asociado'),
          meta: 'Asignado',
          tone: 'violet',
          route: equipmentId ? ['/equipment', equipmentId] : undefined,
        },
      ],
      contracts: this.contractRelatedItems(record),
      invoices: [
        {
          icon: '♙',
          title: String(record['client'] ?? 'Cliente relacionado'),
          detail: 'Titular de la factura',
          meta: 'Ver cliente',
          tone: 'violet',
          route: clientId ? ['/customers', clientId] : undefined,
        },
        {
          icon: '▤',
          title: 'Servicio mensual',
          detail: 'Plan de internet correspondiente al periodo',
          meta: String(record['total'] ?? '$0'),
          tone: 'blue',
        },
        {
          icon: '✓',
          title: 'Historial de pago',
          detail: 'Conciliación y referencia bancaria',
          meta: String(record['status'] ?? 'Pendiente'),
          tone: 'green',
          route: ['/payments', record.id === 'INV-4484' ? 'PAY-74020' : 'PAY-74021'],
        },
      ],
      payments: [
        {
          icon: '♙',
          title: String(record['client'] ?? 'Cliente relacionado'),
          detail: 'Cliente que realizó el pago',
          meta: 'Ver cliente',
          tone: 'violet',
          route: clientId ? ['/customers', clientId] : undefined,
        },
        {
          icon: '▤',
          title: String(record['invoice'] ?? 'Sin factura'),
          detail: 'Factura relacionada con el movimiento',
          meta: 'Ver factura',
          tone: 'blue',
          route: record['invoice'] ? ['/invoices', String(record['invoice'])] : undefined,
        },
        {
          icon: '✓',
          title: String(record['reference'] ?? 'Sin referencia'),
          detail: String(record['method'] ?? 'Método no indicado'),
          meta: 'Conciliado',
          tone: 'green',
        },
      ],
      expenses: [
        {
          icon: '▤',
          title: String(record['receiptUrl'] ?? 'Sin comprobante'),
          detail: 'Documento asociado al gasto',
          meta: 'Descargar',
          tone: 'blue',
        },
        {
          icon: '◎',
          title: String(record['category'] ?? 'OTHER'),
          detail: String(record['vendor'] ?? 'Proveedor no indicado'),
          meta: 'Clasificación',
          tone: 'amber',
        },
      ],
    };
    return map[this.moduleKey];
  }
  activityIcon(tone: string): string {
    return tone === 'green' ? '✓' : tone === 'amber' ? '!' : tone === 'violet' ? '▤' : '✎';
  }
  private contractRelatedItems(record: OperationalRecord): ReadonlyArray<RelatedItem> {
    let items: ReadonlyArray<{ serviceId: string; quantity: number; unitPrice: number }> = [];
    try {
      items = JSON.parse(String(record['items'] ?? '[]')) as typeof items;
    } catch {
      return [];
    }
    return items.map((item) => {
      const service = this.store.find('services', item.serviceId);
      const subtotal = (Number(item.quantity) || 1) * (Number(item.unitPrice) || 0);
      return {
        icon: '⌁',
        title: String(service?.['name'] ?? item.serviceId),
        detail: `${String(service?.['type'] ?? 'Servicio')} · Cantidad ${item.quantity}`,
        meta: `${new Intl.NumberFormat(this.i18n.locale(), { style: 'currency', currency: 'MXN', maximumFractionDigits: 2 }).format(subtotal)}/mes`,
        tone: String(service?.['type'] ?? '') === 'Internet' ? 'blue' : 'violet',
        route: ['/services', item.serviceId],
      };
    });
  }
  archive(id: string): void {
    this.store.archive(this.moduleKey, id);
    void this.router.navigate(['/', this.moduleKey]);
  }
  private parseContractItems(
    record: OperationalRecord,
  ): ReadonlyArray<{ serviceId: string; quantity: number; unitPrice: number }> {
    try {
      const parsed = JSON.parse(String(record['items'] ?? '[]'));
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  private hasOtherInternetItem(currentItemId: string): boolean {
    return this.contractItems().some((item) => {
      if (item.id === currentItemId || !item.serviceId) return false;
      return this.store.find('services', item.serviceId)?.['type'] === 'Internet';
    });
  }
  private monthsSince(dateValue: string): number {
    const start = new Date(dateValue);
    if (Number.isNaN(start.getTime())) return Infinity;
    const now = new Date();
    return (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  }
  /** True while the client hasn't completed the mandatory 6-month permanence on
   * their current internet plan, so picking a *new* Internet service should be blocked
   * (they should get a new contract instead, via the plan-change flow). */
  internetPermanenceBlocked(clientId: string): boolean {
    if (!clientId) return false;
    const lastInternetStart = this.store
      .recordsFor('contracts')
      .filter((contract) => contract.id !== this.recordId && contract['clientId'] === clientId)
      .filter((contract) =>
        this.parseContractItems(contract).some(
          (item) => this.store.find('services', item.serviceId)?.['type'] === 'Internet',
        ),
      )
      .map((contract) => String(contract['startDate'] ?? ''))
      .sort()
      .at(-1);
    return !!lastInternetStart && this.monthsSince(lastInternetStart) < INTERNET_PERMANENCE_MONTHS;
  }
  contractServiceOptions(currentItemId: string): ReadonlyArray<PicklistOption> {
    const clientId = String(this.record()?.['clientId'] ?? '');
    const blockInternet =
      this.hasOtherInternetItem(currentItemId) || this.internetPermanenceBlocked(clientId);
    return this.store
      .recordsFor('services')
      .filter((service) => !(blockInternet && service['type'] === 'Internet'))
      .map((service) => ({
        value: service.id,
        label: String(service['name']),
        detail: `${String(service['type'])} · ${this.asNumber(service['price']) ? '$' + this.asNumber(service['price']) : 'Sin costo'}`,
      }));
  }
  addContractItem(): void {
    this.contractItems.update((items) => [
      ...items,
      { id: `contract-item-${Date.now()}`, serviceId: '', quantity: 1, unitPrice: 0 },
    ]);
    this.contractItemsDirty.set(true);
  }
  removeContractItem(id: string): void {
    const target = this.contractItems().find((item) => item.id === id);
    if (!target || target.locked || this.contractItems().length === 1) return;
    this.contractItems.update((items) => items.filter((item) => item.id !== id));
    this.contractItemsDirty.set(true);
  }
  updateContractItem(
    id: string,
    field: 'serviceId' | 'quantity' | 'unitPrice',
    value: string,
  ): void {
    let changed = false;
    this.contractItems.update((items) =>
      items.map((item) => {
        if (item.id !== id || item.locked) return item;
        if (field === 'serviceId') {
          const service = this.store.find('services', value);
          const isInternet = service?.['type'] === 'Internet';
          if (
            isInternet &&
            (this.hasOtherInternetItem(id) ||
              this.internetPermanenceBlocked(String(this.record()?.['clientId'] ?? '')))
          )
            return item;
          changed = true;
          return { ...item, serviceId: value, unitPrice: this.asNumber(service?.['price'] ?? 0) };
        }
        changed = true;
        return {
          ...item,
          [field]:
            field === 'quantity'
              ? Math.max(1, Number(value) || 1)
              : Math.max(0, Number(value) || 0),
        };
      }),
    );
    if (changed) this.contractItemsDirty.set(true);
  }
  saveContractItems(): void {
    if (!this.contractItemsValid() || !this.contractItemsDirty()) return;
    this.store.update('contracts', this.recordId, {
      totalMonthly: this.contractTotal(),
      items: JSON.stringify(
        this.contractItems().map(({ serviceId, quantity, unitPrice }) => ({
          serviceId,
          quantity,
          unitPrice,
        })),
      ),
    });
    this.contractItemsDirty.set(false);
  }
  canCreateNewAssignment(equipmentId: string): boolean {
    if (this.moduleKey !== 'equipment') return true;
    const assignments = this.store.recordsFor('assignments');
    const activeAssignment = assignments.find(
      (a) => a['equipment'] === equipmentId && a['status'] === 'ACTIVE'
    );
    return !activeAssignment;
  }
  openNewAssignmentForm(equipmentId: string): void {
    this.router.navigate(['/assignments'], {
      queryParams: { equipment: equipmentId }
    });
  }
}
