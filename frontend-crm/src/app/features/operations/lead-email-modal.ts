import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  effect,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { CrmAttachment } from '../../core/models/customer';
import { AttachmentPicker } from '../../shared/attachment-picker';
import { OperationalEmail } from './operational-store';

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

const EMAIL_TEMPLATES = [
  {
    id: 'first-contact',
    name: 'Primer contacto',
    subject: 'Conoce las soluciones de SpeedLink',
    body: 'Hola,\n\nGracias por tu interés en SpeedLink. Nos gustaría conocer tus necesidades de conectividad y ayudarte a encontrar el plan ideal.\n\n¿Podemos agendar una llamada breve?\n\nSaludos,\nAndrea Torres',
  },
  {
    id: 'proposal',
    name: 'Envío de propuesta',
    subject: 'Propuesta comercial de SpeedLink',
    body: 'Hola,\n\nAdjunto encontrarás la propuesta preparada para tu empresa. Incluye cobertura, velocidad, mensualidad y condiciones del servicio.\n\nQuedo atenta a tus comentarios.\n\nSaludos,\nAndrea Torres',
  },
  {
    id: 'follow-up',
    name: 'Seguimiento',
    subject: 'Seguimiento a nuestra propuesta',
    body: 'Hola,\n\nQuería dar seguimiento a la información que te compartimos. ¿Tuviste oportunidad de revisarla? Con gusto puedo resolver cualquier duda.\n\nSaludos,\nAndrea Torres',
  },
] as const;

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
  readonly closed = output<void>();
  readonly submitted = output<{ value: LeadEmailFormValue; draft: boolean }>();
  readonly resend = output<OperationalEmail>();
  readonly forward = output<OperationalEmail>();
  readonly edit = output<OperationalEmail>();
  readonly templates = EMAIL_TEMPLATES;
  readonly to = signal('');
  readonly cc = signal('');
  readonly from = signal('andrea.torres@speedlink.mx');
  readonly subject = signal('');
  readonly body = signal('');
  readonly attachments = signal<ReadonlyArray<CrmAttachment>>([]);
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
  applyTemplate(id: string): void {
    const template = this.templates.find((item) => item.id === id);
    if (!template) return;
    this.subject.set(template.subject);
    this.body.set(template.body);
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
