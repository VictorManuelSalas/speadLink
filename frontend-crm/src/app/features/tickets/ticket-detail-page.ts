import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TicketStore } from '../../core/data-access/ticket-store';
import { LanguageService } from '../../core/i18n/language.service';
import { CrmAttachment, CustomerTicket, TicketComment } from '../../core/models/customer';
import { AttachmentPicker } from '../../shared/attachment-picker';
import {
  RecordDetailLayout,
  RecordHeader,
  RecordInformationCard,
  RecordSummary,
} from '../../shared/record-detail-shell';

@Component({
  selector: 'app-ticket-detail-page',
  imports: [
    AttachmentPicker,
    DatePipe,
    RecordDetailLayout,
    RecordHeader,
    RecordInformationCard,
    RecordSummary,
    RouterLink,
  ],
  template: `
    @if (ticket(); as item) {
      <app-record-header
        [rootLabel]="i18n.t('Tickets')"
        rootRoute="/tickets"
        [recordId]="item.id"
        [title]="item.subject"
        initials="TK"
        accent="#7c3aed"
        [statusLabel]="statusLabel(item.status)"
        [statusTone]="ticketStatusTone(item.status)"
        [subtitle]="item.id + ' · ' + item.clientName + ' · ' + item.category"
      >
        <div record-actions>
          <select
            #statusSelect
            [value]="item.status"
            (change)="changeStatus(item, statusSelect.value)"
          >
            <option value="open">{{ i18n.t('Abierto') }}</option>
            <option value="in_progress">{{ i18n.t('En progreso') }}</option>
            <option value="waiting">{{ i18n.t('En espera') }}</option>
            <option value="resolved">{{ i18n.t('Resuelto') }}</option>
            <option value="closed">{{ i18n.t('Cerrados') }}</option></select
          ><button type="button">✉ Enviar mensaje</button>
        </div>
      </app-record-header>

      <app-record-summary [columns]="5">
        <div class="record-summary-item">
          <small>{{ i18n.t('Estado') }}</small
          ><span class="status status--{{ item.status }}">{{ statusLabel(item.status) }}</span>
        </div>
        <div class="record-summary-item">
          <small>{{ i18n.t('Prioridad') }}</small
          ><b class="priority priority--{{ item.priority }}"
            ><i></i>{{ priorityLabel(item.priority) }}</b
          >
        </div>
        <div class="record-summary-item">
          <small>{{ i18n.t('Responsable') }}</small
          ><span class="person"
            ><span>{{ initials(item.assignedTo) }}</span
            ><b>{{ item.assignedTo }}</b></span
          >
        </div>
        <div class="record-summary-item">
          <small>SLA</small><b [class.danger]="isSlaOverdue(item)">{{ slaLabel(item) }}</b>
        </div>
        <div class="record-summary-item">
          <small>{{ i18n.t('Creado') }}</small
          ><b>{{ item.createdAt | date: 'dd MMM y, HH:mm' : '' : i18n.locale() }}</b>
        </div>
      </app-record-summary>

      <app-record-detail-layout>
        <div record-main>
          <app-record-information-card
            [title]="i18n.t('Detalles del ticket')"
            description="Información proporcionada al abrir la solicitud."
          >
            <p class="record-info-full ticket-description">{{ item.description }}</p>
            @if (item.customFields) {
              <div class="custom-fields record-info-full">
                @for (field of customFields(item); track field[0]) {
                  <span
                    ><small>{{ field[0] }}</small
                    ><b>{{ field[1] }}</b></span
                  >
                }
              </div>
            }
          </app-record-information-card>

          <article class="card conversation-card">
            <header>
              <div>
                <h2>{{ i18n.t('Comentarios') }}</h2>
                <p>{{ item.comments.length }} registros en la conversación.</p>
              </div>
              <div class="comment-tabs">
                <button
                  type="button"
                  [class.is-active]="commentFilter() === 'all'"
                  (click)="commentFilter.set('all')"
                >
                  {{ i18n.t('Todos') }}</button
                ><button
                  type="button"
                  [class.is-active]="commentFilter() === 'internal'"
                  (click)="commentFilter.set('internal')"
                >
                  {{ i18n.t('Notas internas') }}
                </button>
              </div>
            </header>
            <div class="comment-list">
              @for (comment of filteredComments(item); track comment.id) {
                <article class="comment" [class.comment--internal]="comment.isInternal">
                  <span class="avatar">{{ comment.author.initials }}</span>
                  <div>
                    <header>
                      <span
                        ><b>{{ comment.author.fullName }}</b>
                        @if (comment.isInternal) {
                          <em>{{ i18n.t('Notas internas') }}</em>
                        }</span
                      ><time>{{
                        comment.createdAt | date: 'dd MMM y, HH:mm' : '' : i18n.locale()
                      }}</time>
                    </header>
                    <p>{{ comment.message }}</p>
                    @if (comment.attachments.length) {
                      <div class="comment-attachments">
                        @for (file of comment.attachments; track file.id) {
                          <a [href]="file.url" target="_blank" rel="noopener"
                            ><span>{{ file.mimeType.startsWith('image/') ? '▧' : '▤' }}</span
                            ><span
                              ><b>{{ file.fileName }}</b
                              ><small>{{ formatSize(file.size) }}</small></span
                            ></a
                          >
                        }
                      </div>
                    }
                  </div>
                </article>
              } @empty {
                <div class="empty-comments">Todavía no hay comentarios para este filtro.</div>
              }
            </div>
            <div class="comment-composer">
              <textarea
                #commentInput
                rows="4"
                [placeholder]="i18n.t('Agregar comentario') + '…'"
                [value]="commentDraft()"
                (input)="commentDraft.set(commentInput.value)"
              ></textarea>
              <div class="composer-tools">
                <app-attachment-picker
                  [label]="i18n.t('Adjuntar fotos o archivos')"
                  [resetKey]="commentReset()"
                  (attachmentsChange)="commentAttachments.set($event)"
                /><label
                  ><input
                    type="checkbox"
                    [checked]="internalComment()"
                    (change)="internalComment.set(!internalComment())"
                  />{{ i18n.t('Notas internas') }}</label
                ><button
                  class="primary-button"
                  type="button"
                  [disabled]="!commentDraft().trim()"
                  (click)="addComment(item)"
                >
                  {{ i18n.t('Enviar comentario') }}
                </button>
              </div>
            </div>
          </article>
        </div>

        <div record-aside>
          <article class="card client-card">
            <header>
              <h2>{{ i18n.t('Información del cliente') }}</h2>
              <a [routerLink]="['/customers', item.clientId]">{{ i18n.t('Ver cliente') }}</a>
            </header>
            <div class="client-identity">
              <span>{{ item.clientInitials }}</span>
              <div>
                <b>{{ item.clientName }}</b
                ><small>{{ item.clientId }}</small>
              </div>
            </div>
            <dl>
              <div>
                <dt>Correo</dt>
                <dd>{{ item.clientEmail }}</dd>
              </div>
              <div>
                <dt>Teléfono</dt>
                <dd>{{ item.clientPhone }}</dd>
              </div>
              <div>
                <dt>Solicitante</dt>
                <dd>{{ item.requester }}</dd>
              </div>
            </dl>
          </article>
          <article class="card metadata-card">
            <h2>Información</h2>
            <dl>
              <div>
                <dt>Ticket ID</dt>
                <dd>{{ item.id }}</dd>
              </div>
              <div>
                <dt>{{ i18n.t('Creado por') }}</dt>
                <dd>Andrea Torres</dd>
              </div>
              <div>
                <dt>Canal</dt>
                <dd>{{ item.channel }}</dd>
              </div>
              <div>
                <dt>{{ i18n.t('Última actualización') }}</dt>
                <dd>{{ item.updatedAt | date: 'dd MMM y, HH:mm' : '' : i18n.locale() }}</dd>
              </div>
              @if (item.resolvedAt) {
                <div>
                  <dt>{{ i18n.t('Resuelto') }}</dt>
                  <dd>{{ item.resolvedAt | date: 'dd MMM y, HH:mm' : '' : i18n.locale() }}</dd>
                </div>
              }
            </dl>
          </article>
          <article class="card files-card">
            <header>
              <div>
                <h2>Archivos</h2>
                <p>{{ item.attachments.length }} adjuntos</p>
              </div>
            </header>
            @for (file of item.attachments; track file.id) {
              <a [href]="file.url" target="_blank" rel="noopener"
                ><span>{{ file.mimeType.startsWith('image/') ? '▧' : '▤' }}</span
                ><span
                  ><b>{{ file.fileName }}</b
                  ><small>{{ formatSize(file.size) }}</small></span
                ></a
              >
            }
            <app-attachment-picker
              label="Agregar archivos"
              [resetKey]="fileReset()"
              (attachmentsChange)="ticketFiles.set($event)"
            />
            @if (ticketFiles().length) {
              <button class="save-files" type="button" (click)="saveTicketFiles(item.id)">
                {{ i18n.t('Guardar') }} {{ ticketFiles().length }}
              </button>
            }
          </article>
        </div>
      </app-record-detail-layout>
    } @else {
      <section class="not-found">
        <h1>Ticket no encontrado</h1>
        <a class="primary-button" routerLink="/tickets">{{ i18n.t('Volver a tickets') }}</a>
      </section>
    }
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .breadcrumbs {
        margin-bottom: 14px;
        display: flex;
        gap: 8px;
        color: var(--color-text-secondary);
        font-size: 9px;
      }
      .breadcrumbs a {
        color: var(--color-primary);
        text-decoration: none;
      }
      .detail-heading {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 20px;
        margin-bottom: 18px;
      }
      .ticket-title {
        display: flex;
        align-items: center;
        gap: 13px;
      }
      .back {
        width: 37px;
        height: 37px;
        border: 1px solid var(--color-border);
        border-radius: 9px;
        display: grid;
        place-items: center;
        color: var(--color-text-primary);
        text-decoration: none;
      }
      .ticket-title > div > span {
        color: var(--color-primary);
        font-family: ui-monospace, monospace;
        font-size: 9px;
        font-weight: 800;
      }
      .ticket-title h1 {
        margin-top: 3px;
        font-size: 23px;
      }
      .ticket-title p {
        margin-top: 4px;
        color: var(--color-text-secondary);
        font-size: 10px;
      }
      .heading-actions {
        display: flex;
        gap: 8px;
      }
      .heading-actions select,
      .heading-actions button {
        height: 39px;
        padding: 0 12px;
        border: 1px solid var(--color-border);
        border-radius: 9px;
        background: var(--color-surface);
        color: var(--color-text-primary);
        font: inherit;
        font-size: 10px;
        font-weight: 700;
      }
      .ticket-overview {
        margin-bottom: 18px;
        padding: 15px 18px;
        border: 1px solid var(--color-border);
        border-radius: 11px;
        background: var(--color-surface);
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        gap: 0;
      }
      .ticket-overview > div {
        min-height: 42px;
        padding: 0 16px;
        display: flex;
        flex-direction: column;
        justify-content: center;
        gap: 5px;
        border-left: 1px solid var(--color-border);
      }
      .ticket-overview > div:first-child {
        padding-left: 0;
        border: 0;
      }
      .ticket-overview small,
      dt {
        color: var(--color-text-secondary);
        font-size: 8.5px;
      }
      .ticket-overview b {
        font-size: 10px;
      }
      .status {
        width: fit-content;
        padding: 5px 8px;
        border-radius: 99px;
        background: #e2e8f0;
        color: #475569;
        font-size: 8px;
        font-weight: 800;
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
        display: flex;
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
      .person {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .person > span {
        width: 25px;
        height: 25px;
        border-radius: 50%;
        background: #e0e7ff;
        color: #4338ca;
        display: grid;
        place-items: center;
        font-size: 8px;
        font-weight: 800;
      }
      .person b {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .danger {
        color: #dc2626;
      }
      .detail-layout {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 300px;
        align-items: start;
        gap: 16px;
      }
      .detail-layout main,
      .detail-layout aside {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .description-card {
        padding: 20px;
      }
      .description-card > header,
      .conversation-card > header,
      .client-card > header,
      .files-card > header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }
      .description-card h2,
      .conversation-card h2,
      .client-card h2,
      .metadata-card h2,
      .files-card h2 {
        font-size: 14px;
      }
      .description-card header p,
      .conversation-card header p,
      .files-card header p {
        margin-top: 3px;
        color: var(--color-text-secondary);
        font-size: 9px;
      }
      .description-card header button {
        border: 0;
        background: transparent;
        color: var(--color-primary);
        font-weight: 700;
      }
      .description-card > p {
        margin-top: 18px;
        color: var(--color-text-secondary);
        font-size: 11.5px;
        line-height: 1.65;
      }
      .custom-fields {
        margin-top: 16px;
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 10px;
      }
      .custom-fields span {
        padding: 10px;
        border-radius: 8px;
        background: var(--color-muted);
        display: flex;
        flex-direction: column;
      }
      .conversation-card {
        overflow: hidden;
      }
      .conversation-card > header {
        padding: 17px 19px;
        border-bottom: 1px solid var(--color-border);
      }
      .comment-tabs {
        padding: 3px;
        border-radius: 8px;
        background: var(--color-muted);
        display: flex;
      }
      .comment-tabs button {
        height: 29px;
        padding: 0 9px;
        border: 0;
        border-radius: 6px;
        background: transparent;
        color: var(--color-text-secondary);
        font-size: 9px;
        font-weight: 700;
      }
      .comment-tabs button.is-active {
        background: var(--color-surface);
        color: var(--color-primary);
        box-shadow: 0 1px 4px rgba(15, 23, 42, 0.12);
      }
      .comment-list {
        padding: 5px 19px;
      }
      .comment {
        padding: 17px 0;
        display: grid;
        grid-template-columns: 34px 1fr;
        gap: 10px;
        border-bottom: 1px solid var(--color-border);
      }
      .comment--internal {
        margin: 7px -8px;
        padding: 14px 8px;
        border: 1px solid #fde68a;
        border-radius: 9px;
        background: #fffbeb;
      }
      .avatar {
        width: 34px;
        height: 34px;
        border-radius: 50%;
        background: #dbeafe;
        color: #1d4ed8;
        display: grid;
        place-items: center;
        font-size: 9px;
        font-weight: 800;
      }
      .comment > div > header {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .comment header span {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .comment header b {
        font-size: 10.5px;
      }
      .comment header em {
        padding: 3px 5px;
        border-radius: 5px;
        background: #fef3c7;
        color: #b45309;
        font-size: 7px;
        font-style: normal;
        font-weight: 800;
      }
      .comment time {
        color: var(--color-text-secondary);
        font-size: 8.5px;
      }
      .comment p {
        margin-top: 7px;
        font-size: 10.5px;
        line-height: 1.55;
      }
      .comment-attachments {
        margin-top: 9px;
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }
      .comment-attachments a,
      .files-card > a {
        padding: 7px 9px;
        border: 1px solid var(--color-border);
        border-radius: 7px;
        color: var(--color-text-primary);
        display: flex;
        align-items: center;
        gap: 7px;
        text-decoration: none;
      }
      .comment-attachments a > span:last-child,
      .files-card > a > span:last-child {
        display: flex;
        flex-direction: column;
      }
      .comment-attachments b,
      .files-card > a b {
        font-size: 8.5px;
      }
      .comment-attachments small,
      .files-card > a small {
        color: var(--color-text-secondary);
        font-size: 7.5px;
      }
      .empty-comments {
        padding: 45px;
        text-align: center;
        color: var(--color-text-secondary);
      }
      .comment-composer {
        padding: 15px 19px 18px;
        background: var(--color-muted);
      }
      .comment-composer textarea {
        width: 100%;
        padding: 10px;
        border: 1px solid var(--color-border);
        border-radius: 8px;
        outline: 0;
        background: var(--color-surface);
        color: var(--color-text-primary);
        font: inherit;
        font-size: 10.5px;
        resize: vertical;
      }
      .composer-tools {
        margin-top: 9px;
        display: flex;
        align-items: flex-end;
        gap: 10px;
      }
      .composer-tools app-attachment-picker {
        min-width: 0;
        margin-right: auto;
      }
      .composer-tools label {
        display: flex;
        align-items: center;
        gap: 5px;
        color: var(--color-text-secondary);
        font-size: 8.5px;
        white-space: nowrap;
      }
      .primary-button {
        min-height: 36px;
        padding: 0 13px;
        border: 1px solid var(--color-primary);
        border-radius: 8px;
        background: var(--color-primary);
        color: #fff;
        font-weight: 750;
        text-decoration: none;
      }
      .primary-button:disabled {
        opacity: 0.45;
      }
      .client-card,
      .metadata-card,
      .files-card {
        padding: 17px;
      }
      .client-card header a {
        color: var(--color-primary);
        font-size: 9px;
        text-decoration: none;
        font-weight: 700;
      }
      .client-identity {
        margin: 15px 0;
        padding: 12px;
        border-radius: 9px;
        background: var(--color-muted);
        display: flex;
        align-items: center;
        gap: 9px;
      }
      .client-identity > span {
        width: 37px;
        height: 37px;
        border-radius: 50%;
        background: #dbeafe;
        color: #1d4ed8;
        display: grid;
        place-items: center;
        font-size: 10px;
        font-weight: 800;
      }
      .client-identity > div {
        display: flex;
        flex-direction: column;
      }
      .client-identity b {
        font-size: 11px;
      }
      .client-identity small {
        color: var(--color-text-secondary);
        font-size: 8px;
      }
      .client-card dl,
      .metadata-card dl {
        display: flex;
        flex-direction: column;
        gap: 11px;
      }
      .client-card dl div,
      .metadata-card dl div {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      dd {
        margin: 0;
        font-size: 9.5px;
        font-weight: 650;
      }
      .metadata-card h2 {
        margin-bottom: 14px;
      }
      .files-card {
        display: flex;
        flex-direction: column;
        gap: 9px;
      }
      .save-files {
        height: 34px;
        border: 0;
        border-radius: 8px;
        background: var(--color-primary);
        color: #fff;
        font-weight: 700;
      }
      .not-found {
        padding: 100px;
        text-align: center;
      }
      .not-found a {
        display: inline-flex;
        align-items: center;
        margin-top: 15px;
      }
      @media (max-width: 900px) {
        .ticket-overview {
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }
        .ticket-overview > div {
          border: 0;
          padding: 0;
        }
        .detail-layout {
          grid-template-columns: 1fr;
        }
      }
      @media (max-width: 580px) {
        .detail-heading {
          align-items: stretch;
          flex-direction: column;
        }
        .heading-actions {
          overflow-x: auto;
        }
        .ticket-overview {
          grid-template-columns: 1fr 1fr;
        }
        .composer-tools {
          align-items: stretch;
          flex-direction: column;
        }
        .composer-tools app-attachment-picker {
          width: 100%;
        }
        .primary-button {
          width: 100%;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TicketDetailPage {
  readonly store = inject(TicketStore);
  readonly i18n = inject(LanguageService);
  private readonly route = inject(ActivatedRoute);
  readonly ticketId = signal(this.route.snapshot.paramMap.get('id') ?? '');
  readonly ticket = computed(() => this.store.get(this.ticketId()));
  readonly commentFilter = signal<'all' | 'internal'>('all');
  readonly commentDraft = signal('');
  readonly internalComment = signal(false);
  readonly commentAttachments = signal<ReadonlyArray<CrmAttachment>>([]);
  readonly commentReset = signal(0);
  readonly ticketFiles = signal<ReadonlyArray<CrmAttachment>>([]);
  readonly fileReset = signal(0);
  constructor() {
    this.route.paramMap.subscribe((params) => this.ticketId.set(params.get('id') ?? ''));
  }
  changeStatus(ticket: CustomerTicket, status: string): void {
    this.store.updateStatus(
      ticket.id,
      status as CustomerTicket['status'],
      new Date().toISOString(),
    );
  }
  addComment(ticket: CustomerTicket): void {
    const message = this.commentDraft().trim();
    if (!message) return;
    const comment: TicketComment = {
      id: `comment-${Date.now()}`,
      message,
      author: { fullName: 'Andrea Torres', email: 'andrea.torres@speedlink.mx', initials: 'AT' },
      isInternal: this.internalComment(),
      createdAt: new Date().toISOString(),
      attachments: this.commentAttachments(),
    };
    this.store.addComment(ticket.id, comment);
    this.commentDraft.set('');
    this.internalComment.set(false);
    this.commentAttachments.set([]);
    this.commentReset.update((value) => value + 1);
  }
  saveTicketFiles(ticketId: string): void {
    this.store.addAttachments(ticketId, this.ticketFiles());
    this.ticketFiles.set([]);
    this.fileReset.update((value) => value + 1);
  }
  filteredComments(ticket: CustomerTicket): ReadonlyArray<TicketComment> {
    return ticket.comments.filter(
      (comment) => this.commentFilter() === 'all' || comment.isInternal,
    );
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
  ticketStatusTone(status: CustomerTicket['status']): string {
    return status === 'resolved' || status === 'closed'
      ? 'green'
      : status === 'waiting'
        ? 'amber'
        : 'blue';
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
  isSlaOverdue(ticket: CustomerTicket): boolean {
    return (
      !['resolved', 'closed'].includes(ticket.status) &&
      new Date(ticket.slaDueAt).getTime() < Date.now()
    );
  }
  slaLabel(ticket: CustomerTicket): string {
    if (['resolved', 'closed'].includes(ticket.status)) return this.i18n.t('Resuelto');
    if (this.isSlaOverdue(ticket)) return this.i18n.language() === 'en' ? 'Overdue' : 'Vencido';
    const hours = Math.ceil((new Date(ticket.slaDueAt).getTime() - Date.now()) / 3_600_000);
    return `${hours} h`;
  }
  customFields(ticket: CustomerTicket): ReadonlyArray<[string, string]> {
    return Object.entries(ticket.customFields ?? {}).map(([key, value]) => [key, String(value)]);
  }
  formatSize(size: number): string {
    return size < 1024 * 1024
      ? `${Math.ceil(size / 1024)} KB`
      : `${(size / 1024 / 1024).toFixed(1)} MB`;
  }
}
