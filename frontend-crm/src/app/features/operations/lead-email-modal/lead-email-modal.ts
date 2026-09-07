import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { CrmAttachment } from '../../../core/models/customer';
import { LanguageService } from '../../../core/i18n/language.service';
import { TemplateStore } from '../../../core/data-access/templates/template-store';
import { TemplateModule } from '../../../core/data-access/templates/template.model';
import { ORGANIZATION } from '../printable-document/printable-document.data';
import { AttachmentPicker } from '../../../shared/attachment-picker';
import { OperationalEmail } from '../operational-store';

export interface LeadEmailFormValue {
  to: string;
  cc: string;
  from: string;
  subject: string;
  body: string;
  attachments: ReadonlyArray<CrmAttachment>;
}

export interface LeadEmailSeed extends Partial<LeadEmailFormValue> {
  title?: string;
}


@Component({
  selector: 'app-lead-email-modal',
  imports: [AttachmentPicker, DatePipe],
  templateUrl: './lead-email-modal.html',
  styleUrl: './lead-email-modal.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LeadEmailModal {
  readonly preview = input<OperationalEmail | null>(null);
  readonly seed = input<LeadEmailSeed>({});
  readonly composeKey = input(0);
  /** Módulo desde el que se redacta: filtra las plantillas disponibles. */
  readonly module = input<TemplateModule>('');
  /** Registro con el que se resuelven las variables de la plantilla. */
  readonly record = input<Record<string, unknown> | null>(null);
  readonly closed = output<void>();
  readonly submitted = output<{ value: LeadEmailFormValue; draft: boolean }>();
  readonly resend = output<OperationalEmail>();
  readonly forward = output<OperationalEmail>();
  readonly edit = output<OperationalEmail>();
  private readonly templateStore = inject(TemplateStore);
  private readonly i18n = inject(LanguageService);
  /** Plantillas de correo activas para este módulo, más las generales. */
  readonly templates = computed(() => this.templateStore.forModule(this.module(), 'email'));
  readonly to = signal('');
  readonly cc = signal('');
  readonly from = signal('andrea.torres@speedlink.mx');
  readonly subject = signal('');
  readonly body = signal('');
  readonly attachments = signal<ReadonlyArray<CrmAttachment>>([]);
  /** Adjuntos que llegaron en el borrador, para precargar el selector. */
  readonly seededAttachments = signal<ReadonlyArray<CrmAttachment>>([]);
  readonly attachmentReset = signal(0);
  readonly composerTitle = signal('Redactar mensaje');
  constructor() {
    effect(() => {
      this.composeKey();
      const seed = this.seed();
      untracked(() => {
        this.to.set(seed.to ?? '');
        this.cc.set(seed.cc ?? '');
        this.from.set(seed.from ?? 'andrea.torres@speedlink.mx');
        this.subject.set(seed.subject ?? '');
        this.body.set(seed.body ?? '');
        this.attachments.set(seed.attachments ?? []);
        this.seededAttachments.set(seed.attachments ?? []);
        this.composerTitle.set(seed.title ?? 'Redactar mensaje');
        this.attachmentReset.update((value) => value + 1);
      });
    });
  }
  canSend(): boolean {
    return Boolean(
      this.to().trim() && this.from().trim() && this.subject().trim() && this.body().trim(),
    );
  }
  hasContent(): boolean {
    return Boolean(
      this.to().trim() || this.subject().trim() || this.body().trim() || this.attachments().length,
    );
  }
  /** Aplica la plantilla con las variables ya resueltas contra el registro. */
  applyTemplate(id: string): void {
    const template = this.templates().find((item) => item.id === id);
    if (!template) return;
    const rendered = this.templateStore.render(template, {
      record: this.record() ?? undefined,
      organization: ORGANIZATION,
      userName: 'Andrea Torres',
      formatMoney: (value) =>
        new Intl.NumberFormat(this.i18n.locale(), {
          style: 'currency',
          currency: 'MXN',
          maximumFractionDigits: 2,
        }).format(Number(value) || 0),
      formatDate: (value) => {
        const date = new Date(String(value ?? ''));
        return Number.isNaN(date.getTime())
          ? ''
          : new Intl.DateTimeFormat(this.i18n.locale(), {
              day: '2-digit',
              month: 'long',
              year: 'numeric',
            }).format(date);
      },
    });
    this.subject.set(rendered.subject);
    this.body.set(rendered.body);
  }
  submit(draft: boolean): void {
    if ((draft && !this.hasContent()) || (!draft && !this.canSend())) return;
    this.submitted.emit({
      draft,
      value: {
        to: this.to().trim(),
        cc: this.cc().trim(),
        from: this.from().trim(),
        subject: this.subject().trim() || 'Sin asunto',
        body: this.body().trim(),
        attachments: this.attachments(),
      },
    });
  }
  extension(name: string): string {
    return name.split('.').pop()?.slice(0, 4).toUpperCase() || 'FILE';
  }
  formatSize(size: number): string {
    return size < 1024 * 1024
      ? `${Math.max(1, Math.round(size / 1024))} KB`
      : `${(size / 1024 / 1024).toFixed(1)} MB`;
  }
  @HostListener('document:keydown.escape') closeOnEscape(): void {
    this.closed.emit();
  }
}
