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
  template: `
    @if (preview(); as email) {
      <button
        class="preview-backdrop"
        type="button"
        aria-label="Cerrar"
        (click)="closed.emit()"
      ></button>
      <section
        class="preview-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="preview-title"
      >
        <header>
          <div>
            <span>CORREO</span>
            <h2 id="preview-title">{{ email.subject }}</h2>
          </div>
          <button type="button" aria-label="Cerrar" (click)="closed.emit()">×</button>
        </header>
        <div class="preview-meta">
          <span class="sender-avatar">AT</span>
          <div>
            <b>{{ email.sentBy }}</b
            ><small>De: {{ email.from }}</small
            ><small
              >Para: {{ email.to }}
              @if (email.cc) {
                · CC: {{ email.cc }}
              }
            </small>
          </div>
          <time>{{ email.sentAt | date: 'dd MMM y, HH:mm' }}</time>
        </div>
        <article class="message-preview">{{ email.body }}</article>
        @if (email.attachments.length) {
          <div class="preview-attachments">
            <b>{{ email.attachments.length }} adjunto(s)</b>
            @for (file of email.attachments; track file.id) {
              <a [href]="file.url" target="_blank" rel="noopener"
                ><span>{{ extension(file.fileName) }}</span
                ><span
                  ><b>{{ file.fileName }}</b
                  ><small>{{ formatSize(file.size) }}</small></span
                ></a
              >
            }
          </div>
        }
        <footer>
          @if (email.status === 'DRAFT') {
            <button class="button" type="button" (click)="edit.emit(email)">
              ✎ Editar borrador
            </button>
          } @else {
            <button class="button" type="button" (click)="resend.emit(email)">↻ Reenviar</button>
          }
          <button class="button button--primary" type="button" (click)="forward.emit(email)">
            → Reenviar a…
          </button>
        </footer>
      </section>
    } @else {
      <section class="composer" role="dialog" aria-label="Redactar correo">
        <header>
          <div>
            <span>NUEVO CORREO</span>
            <h2>{{ composerTitle() }}</h2>
          </div>
          <button type="button" aria-label="Cerrar" (click)="closed.emit()">×</button>
        </header>
        <div class="composer-fields">
          <label
            ><span>Para</span
            ><input
              #toInput
              type="email"
              [value]="to()"
              (input)="to.set(toInput.value)"
              placeholder="destinatario@empresa.com"
          /></label>
          <label
            ><span>CC</span
            ><input
              #ccInput
              type="email"
              [value]="cc()"
              (input)="cc.set(ccInput.value)"
              placeholder="Opcional"
          /></label>
          <label
            ><span>De</span
            ><input #fromInput type="email" [value]="from()" (input)="from.set(fromInput.value)"
          /></label>
          <label
            ><span>Plantilla</span
            ><select #template (change)="applyTemplate(template.value)">
              <option value="">Sin plantilla</option>
              @for (item of templates; track item.id) {
                <option [value]="item.id">{{ item.name }}</option>
              }
            </select></label
          >
          <label
            ><span>Asunto</span
            ><input
              #subjectInput
              [value]="subject()"
              (input)="subject.set(subjectInput.value)"
              placeholder="Asunto del mensaje"
          /></label>
          <textarea
            #bodyInput
            [value]="body()"
            (input)="body.set(bodyInput.value)"
            placeholder="Escribe tu mensaje…"
          ></textarea>
          <app-attachment-picker
            label="Adjuntar archivos"
            [resetKey]="attachmentReset()"
            (attachmentsChange)="attachments.set($event)"
          />
        </div>
        <footer>
          <button
            class="draft-button"
            type="button"
            [disabled]="!hasContent()"
            (click)="submit(true)"
          >
            Guardar borrador</button
          ><button
            class="button button--primary"
            type="button"
            [disabled]="!canSend()"
            (click)="submit(false)"
          >
            ✉ Enviar email
          </button>
        </footer>
      </section>
    }
  `,
  styles: [
    `
      .composer {
        position: fixed;
        right: 22px;
        bottom: 0;
        z-index: 1050;
        width: min(570px, calc(100vw - 28px));
        max-height: calc(100vh - 30px);
        overflow: auto;
        border: 1px solid var(--color-border);
        border-radius: 14px 14px 0 0;
        background: var(--color-surface);
        box-shadow: 0 20px 65px rgba(15, 23, 42, 0.3);
      }
      .composer > header,
      .preview-modal > header {
        padding: 14px 17px;
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        border-bottom: 1px solid var(--color-border);
      }
      header span {
        color: var(--color-primary);
        font-size: 8px;
        font-weight: 800;
        letter-spacing: 0.08em;
      }
      header h2 {
        margin-top: 2px;
        font-size: 16px;
      }
      header > button {
        width: 29px;
        height: 29px;
        border: 0;
        border-radius: 7px;
        background: transparent;
        color: var(--color-text-secondary);
        font-size: 19px;
      }
      header > button:hover {
        background: var(--color-muted);
      }
      .composer-fields label {
        min-height: 42px;
        padding: 0 17px;
        border-bottom: 1px solid var(--color-border);
        display: grid;
        grid-template-columns: 65px 1fr;
        align-items: center;
      }
      .composer-fields label > span {
        color: var(--color-text-secondary);
        font-size: 10px;
        font-weight: 700;
      }
      .composer-fields input,
      .composer-fields select,
      .composer-fields textarea {
        width: 100%;
        border: 0;
        outline: 0;
        background: transparent;
        color: var(--color-text-primary);
        font: inherit;
        font-size: 11px;
      }
      .composer-fields textarea {
        min-height: 165px;
        padding: 14px 17px;
        resize: vertical;
      }
      .composer-fields app-attachment-picker {
        padding: 0 17px 13px;
      }
      .composer > footer,
      .preview-modal > footer {
        padding: 12px 17px;
        border-top: 1px solid var(--color-border);
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 8px;
      }
      .draft-button {
        min-height: 36px;
        padding: 0 11px;
        border: 0;
        background: transparent;
        color: var(--color-text-secondary);
        font: inherit;
        font-size: 10px;
        font-weight: 700;
      }
      .draft-button:hover {
        color: var(--color-primary);
      }
      .preview-backdrop {
        position: fixed;
        inset: 0;
        z-index: 1090;
        border: 0;
        background: rgba(15, 23, 42, 0.52);
        backdrop-filter: blur(2px);
      }
      .preview-modal {
        position: fixed;
        left: 50%;
        top: 50%;
        z-index: 1091;
        width: min(720px, calc(100vw - 28px));
        max-height: calc(100vh - 28px);
        overflow: auto;
        border: 1px solid var(--color-border);
        border-radius: 15px;
        background: var(--color-surface);
        box-shadow: 0 30px 80px rgba(15, 23, 42, 0.32);
        transform: translate(-50%, -50%);
      }
      .preview-meta {
        padding: 16px 20px;
        display: grid;
        grid-template-columns: 38px 1fr auto;
        align-items: center;
        gap: 10px;
        border-bottom: 1px solid var(--color-border);
      }
      .sender-avatar {
        width: 38px;
        height: 38px;
        border-radius: 50%;
        background: #dbeafe;
        color: #1d4ed8;
        display: grid;
        place-items: center;
        font-size: 10px;
        font-weight: 800;
      }
      .preview-meta > div {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .preview-meta small,
      .preview-meta time {
        color: var(--color-text-secondary);
        font-size: 9px;
      }
      .message-preview {
        min-height: 210px;
        padding: 25px 30px;
        color: var(--color-text-primary);
        font-size: 12px;
        line-height: 1.75;
        white-space: pre-wrap;
      }
      .preview-attachments {
        padding: 14px 20px;
        border-top: 1px solid var(--color-border);
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
      .preview-attachments > b {
        width: 100%;
        font-size: 10px;
      }
      .preview-attachments a {
        min-width: 205px;
        padding: 7px;
        border: 1px solid var(--color-border);
        border-radius: 8px;
        color: var(--color-text-primary);
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .preview-attachments a > span:first-child {
        width: 34px;
        height: 34px;
        border-radius: 6px;
        background: var(--color-muted);
        color: var(--color-primary);
        display: grid;
        place-items: center;
        font-size: 8px;
        font-weight: 800;
      }
      .preview-attachments a > span:last-child {
        min-width: 0;
        display: flex;
        flex-direction: column;
      }
      .preview-attachments a b {
        max-width: 180px;
        overflow: hidden;
        font-size: 9px;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .preview-attachments a small {
        color: var(--color-text-secondary);
        font-size: 8px;
      }
      @media (max-width: 600px) {
        .composer {
          right: 0;
          width: 100%;
          max-height: 100vh;
        }
        .preview-meta {
          grid-template-columns: 38px 1fr;
        }
        .preview-meta time {
          grid-column: 2;
        }
        .message-preview {
          padding: 20px;
        }
      }
    `,
  ],
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
