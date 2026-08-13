import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TicketStore } from '../../../core/data-access/ticket-store';
import { LanguageService } from '../../../core/i18n/language.service';
import { CrmAttachment, CustomerTicket, TicketComment } from '../../../core/models/customer';
import { AttachmentPicker } from '../../../shared/attachment-picker';
import { RecordField, RecordFieldConfig } from '../../../shared/record-field';
import {
  RecordDetailLayout,
  RecordHeader,
  RecordInformationCard,
  RecordSummary,
} from '../../../shared/record-detail-shell';

@Component({
  selector: 'app-ticket-detail-page',
  imports: [
    AttachmentPicker,
    DatePipe,
    RecordDetailLayout,
    RecordField,
    RecordHeader,
    RecordInformationCard,
    RecordSummary,
    RouterLink,
  ],
  templateUrl: './ticket-detail-page.html',
  styleUrl: './ticket-detail-page.scss',
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
  ticketFieldConfig(key: string, label: string, kind: RecordFieldConfig['kind'] = 'text'): RecordFieldConfig {
    return { key, label, kind, editable: true };
  }
  updateTicketField(ticketId: string, key: string, value: string): void {
    const update: Partial<CustomerTicket> = {};
    if (key === 'status') {
      update.status = value as CustomerTicket['status'];
    } else if (key === 'priority') {
      update.priority = value as CustomerTicket['priority'];
    } else if (key === 'assignedTo') {
      update.assignedTo = value;
    } else if (key === 'description') {
      update.description = value;
    } else if (key === 'category') {
      update.category = value;
    }
    this.store.update(ticketId, update);
  }
  deleteComment(ticketId: string, commentId: string): void {
    this.store.deleteComment(ticketId, commentId);
  }
}
