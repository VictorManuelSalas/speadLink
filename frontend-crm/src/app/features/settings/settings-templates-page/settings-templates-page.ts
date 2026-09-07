import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DatePipe, LowerCasePipe } from '@angular/common';
import { TemplateStore } from '../../../core/data-access/templates/template-store';
import {
  CrmTemplate,
  MergeField,
  TemplateChannel,
  TemplateFormat,
  TemplateModule,
  htmlToText,
  mergeFieldGroups,
  renderTemplateText,
  tokensIn,
} from '../../../core/data-access/templates/template.model';
import { ORGANIZATION } from '../../operations/printable-document/printable-document.data';

/** Módulos a los que se puede asociar una plantilla. */
const TEMPLATE_MODULES: ReadonlyArray<{ value: TemplateModule; label: string }> = [
  { value: '', label: 'Todos los módulos' },
  { value: 'leads', label: 'Leads' },
  { value: 'customers', label: 'Clientes' },
  { value: 'contracts', label: 'Contratos' },
  { value: 'invoices', label: 'Facturas' },
  { value: 'payments', label: 'Pagos' },
  { value: 'assignments', label: 'Asignaciones' },
];

/** Datos de ejemplo para la vista previa, por módulo. */
const PREVIEW_RECORD: Readonly<Record<string, Record<string, unknown>>> = {
  contracts: {
    contractNumber: 'CTR-2026-3010',
    client: 'María Fernanda López',
    startDate: '2026-09-01',
    endDate: '2027-09-01',
    totalMonthly: 399,
    status: 'ACTIVE',
  },
  invoices: {
    folio: 'FAC-SL-1042-07',
    client: 'María Fernanda López',
    total: 350,
    dueDate: '2026-09-10',
    status: 'PENDING',
  },
  payments: {
    reference: 'SL74018',
    client: 'María Fernanda López',
    amount: 350,
    paidAt: '2026-09-05',
  },
  leads: {
    name: 'Roberto Sánchez',
    email: 'roberto@email.mx',
    phone: '55 6123 8801',
    source: 'Sitio web',
  },
  customers: {
    name: 'María Fernanda López',
    email: 'maria.lopez@email.mx',
    phone: '55 1234 8052',
    plan: 'Intermedio',
    currentBalance: 0,
  },
  assignments: {
    name: 'ASG-2026-0001',
    client: 'María Fernanda López',
    equipment: 'Antena CPE',
    serial: 'DHR2I3TR',
  },
};

const EMPTY: CrmTemplate = {
  id: '',
  name: '',
  channel: 'email',
  module: '',
  format: 'text',
  subject: '',
  body: '',
  status: 'ACTIVE',
  updatedAt: '',
};

@Component({
  selector: 'app-settings-templates-page',
  imports: [FormsModule, RouterLink, DatePipe, LowerCasePipe],
  templateUrl: './settings-templates-page.html',
  styleUrls: ['../settings-pages.scss', './settings-templates-page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsTemplatesPage {
  private readonly store = inject(TemplateStore);
  readonly modules = TEMPLATE_MODULES;
  readonly query = signal('');
  readonly editorOpen = signal(false);
  readonly fieldPickerOpen = signal(false);
  readonly draft = signal<CrmTemplate>({ ...EMPTY });
  readonly toast = signal('');

  readonly templates = computed(() => {
    const query = this.query().trim().toLocaleLowerCase();
    const all = this.store.all();
    return query
      ? all.filter((template) =>
          `${template.name} ${template.subject} ${template.body}`
            .toLocaleLowerCase()
            .includes(query),
        )
      : all;
  });
  readonly emailCount = computed(
    () => this.store.all().filter((template) => template.channel === 'email').length,
  );
  readonly activeCount = this.store.activeCount;

  /** Variables disponibles según el módulo elegido en el editor. */
  readonly fieldGroups = computed(() => mergeFieldGroups(this.draft().module));
  /** Variables escritas que no existen para el módulo elegido. */
  readonly unknownTokens = computed(() => {
    const draft = this.draft();
    const known = new Set(
      this.fieldGroups().flatMap((group) => group.fields.map((field) => field.token)),
    );
    return [...new Set(tokensIn(`${draft.subject} ${draft.body}`))].filter(
      (token) => !known.has(token),
    );
  });
  readonly preview = computed(() => {
    const draft = this.draft();
    const context = {
      record: PREVIEW_RECORD[draft.module] ?? {},
      organization: ORGANIZATION,
      userName: 'Andrea Torres',
      formatMoney: (value: unknown) =>
        new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(
          Number(value) || 0,
        ),
      formatDate: (value: unknown) =>
        new Intl.DateTimeFormat('es-MX', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        }).format(new Date(String(value))),
    };
    const body = renderTemplateText(draft.body, draft.module, context);
    return {
      subject: renderTemplateText(draft.subject, draft.module, context),
      body: draft.format === 'html' ? htmlToText(body) : body,
    };
  });

  moduleLabel(module: TemplateModule): string {
    return TEMPLATE_MODULES.find((item) => item.value === module)?.label ?? 'Todos los módulos';
  }
  channelLabel(channel: TemplateChannel): string {
    return channel === 'email' ? 'Correo' : 'SMS';
  }

  create(): void {
    this.draft.set({ ...EMPTY, id: `tpl-${Date.now()}` });
    this.fieldPickerOpen.set(false);
    this.editorOpen.set(true);
  }
  edit(template: CrmTemplate): void {
    this.draft.set({ ...template });
    this.fieldPickerOpen.set(false);
    this.editorOpen.set(true);
  }
  close(): void {
    this.editorOpen.set(false);
    this.fieldPickerOpen.set(false);
  }
  update<K extends keyof CrmTemplate>(key: K, value: CrmTemplate[K]): void {
    this.draft.update((draft) => ({ ...draft, [key]: value }));
  }
  setChannel(value: string): void {
    // El SMS no lleva asunto ni marcado: se normaliza al cambiar de canal.
    this.draft.update((draft) => ({
      ...draft,
      channel: value as TemplateChannel,
      subject: value === 'sms' ? '' : draft.subject,
      format: value === 'sms' ? 'text' : draft.format,
    }));
  }
  setFormat(value: string): void {
    this.update('format', value as TemplateFormat);
  }
  setModule(value: string): void {
    this.update('module', value as TemplateModule);
  }
  canSave(): boolean {
    const draft = this.draft();
    return Boolean(
      draft.name.trim() && draft.body.trim() && (draft.channel === 'sms' || draft.subject.trim()),
    );
  }
  save(): void {
    if (!this.canSave()) return;
    this.store.save(this.draft());
    this.close();
    this.notify('Plantilla guardada');
  }
  remove(template: CrmTemplate): void {
    this.store.remove(template.id);
    if (this.draft().id === template.id) this.close();
    this.notify('Plantilla eliminada');
  }
  duplicate(template: CrmTemplate): void {
    this.store.save({
      ...template,
      id: `tpl-${Date.now()}`,
      name: `${template.name} (copia)`,
      status: 'DRAFT',
    });
    this.notify('Plantilla duplicada');
  }

  /**
   * Inserta `${token}` donde está el cursor. Si el usuario acaba de teclear `$`
   * para abrir el selector, ese `$` se reemplaza en vez de duplicarse.
   */
  insertField(field: MergeField, target: HTMLInputElement | HTMLTextAreaElement): void {
    const key = target.tagName === 'INPUT' ? 'subject' : 'body';
    const value = target.value;
    const end = target.selectionEnd ?? value.length;
    const start = value.slice(0, end).endsWith('$') ? end - 1 : (target.selectionStart ?? end);
    const snippet = `\${${field.token}}`;
    const next = value.slice(0, start) + snippet + value.slice(end);
    this.update(key as 'subject' | 'body', next);
    this.fieldPickerOpen.set(false);
    queueMicrotask(() => {
      target.focus();
      target.setSelectionRange(start + snippet.length, start + snippet.length);
    });
  }
  /** Teclear `$` abre el selector de variables. */
  handleKey(event: KeyboardEvent): void {
    if (event.key === '$') this.fieldPickerOpen.set(true);
  }

  private notify(message: string): void {
    this.toast.set(message);
    window.setTimeout(() => this.toast.set(''), 2400);
  }
}
