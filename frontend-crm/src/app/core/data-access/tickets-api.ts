import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { CrmAttachment, CustomerTicket, EntityUser, TicketComment } from '../models/customer';
import { runtimeConfig } from '../runtime-config';
import type { TicketRecord } from './ticket-store';

type ApiTicketStatus = 'OPEN' | 'IN_PROGRESS' | 'WAITING_CLIENT' | 'RESOLVED' | 'CLOSED';
type ApiTicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

interface ApiPerson {
  readonly id: string;
  readonly name: string;
  readonly email: string;
}

interface ApiAttachment {
  readonly id: string;
  readonly fileName: string;
  readonly mimeType: string;
  readonly size: number;
  readonly url: string;
  readonly createdAt: string;
}

interface ApiTicketComment {
  readonly id: string;
  readonly message: string;
  readonly author: ApiPerson;
  readonly isInternal: boolean;
  readonly createdAt: string;
  readonly attachments: ReadonlyArray<ApiAttachment>;
}

interface ApiTicket {
  readonly id: string;
  readonly organizationId: string;
  readonly clientId: string;
  readonly subject: string;
  readonly description: string;
  readonly status: ApiTicketStatus;
  readonly priority: ApiTicketPriority;
  readonly assignedToId: string | null;
  readonly assignedTo: ApiPerson | null;
  readonly createdById: string;
  readonly createdBy: ApiPerson;
  readonly resolvedAt: string | null;
  readonly customFields: { category?: string; channel?: string } | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly client: { id: string; name: string; email: string | null; phone: string | null };
  readonly comments: ReadonlyArray<ApiTicketComment>;
  readonly attachments: ReadonlyArray<ApiAttachment>;
}

const STATUS_TO_API: Record<CustomerTicket['status'], ApiTicketStatus> = {
  open: 'OPEN',
  in_progress: 'IN_PROGRESS',
  waiting: 'WAITING_CLIENT',
  resolved: 'RESOLVED',
  closed: 'CLOSED',
};
const STATUS_FROM_API: Record<ApiTicketStatus, CustomerTicket['status']> = {
  OPEN: 'open',
  IN_PROGRESS: 'in_progress',
  WAITING_CLIENT: 'waiting',
  RESOLVED: 'resolved',
  CLOSED: 'closed',
};
const PRIORITY_TO_API: Record<CustomerTicket['priority'], ApiTicketPriority> = {
  low: 'LOW',
  medium: 'MEDIUM',
  high: 'HIGH',
  urgent: 'CRITICAL',
};
const PRIORITY_FROM_API: Record<ApiTicketPriority, CustomerTicket['priority']> = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'urgent',
};

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toLocaleUpperCase();
}

function toAttachment(attachment: ApiAttachment): CrmAttachment {
  return {
    id: attachment.id,
    fileName: attachment.fileName,
    mimeType: attachment.mimeType,
    size: attachment.size,
    url: attachment.url,
    createdAt: attachment.createdAt,
  };
}

function toEntityUser(person: ApiPerson): EntityUser {
  return { fullName: person.name, email: person.email, initials: initialsOf(person.name) };
}

function toComment(comment: ApiTicketComment): TicketComment {
  return {
    id: comment.id,
    message: comment.message,
    author: toEntityUser(comment.author),
    isInternal: comment.isInternal,
    createdAt: comment.createdAt,
    attachments: comment.attachments.map(toAttachment),
  };
}

export function toTicketRecord(ticket: ApiTicket): TicketRecord {
  return {
    id: ticket.id,
    clientId: ticket.clientId,
    subject: ticket.subject,
    description: ticket.description,
    category: (ticket.customFields?.category as CustomerTicket['category']) ?? 'Otro',
    priority: PRIORITY_FROM_API[ticket.priority],
    status: STATUS_FROM_API[ticket.status],
    channel: (ticket.customFields?.channel as CustomerTicket['channel']) ?? 'Portal',
    assignedTo: ticket.assignedTo?.name ?? 'Sin asignar',
    assignedToId: ticket.assignedToId ?? undefined,
    createdById: ticket.createdById,
    resolvedAt: ticket.resolvedAt ?? undefined,
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
    slaDueAt: ticket.resolvedAt ?? ticket.updatedAt,
    requester: ticket.client.name,
    comments: ticket.comments.map(toComment),
    attachments: ticket.attachments.map(toAttachment),
    clientName: ticket.client.name,
    clientEmail: ticket.client.email ?? '',
    clientPhone: ticket.client.phone ?? '',
    clientInitials: initialsOf(ticket.client.name),
  };
}

export interface CreateTicketApiInput {
  readonly organizationId: string;
  readonly clientId: string;
  readonly subject: string;
  readonly description: string;
  readonly status?: CustomerTicket['status'];
  readonly priority?: CustomerTicket['priority'];
  readonly category?: CustomerTicket['category'];
  readonly channel?: CustomerTicket['channel'];
  readonly assignedToId?: string;
  readonly createdById: string;
}

export interface UpdateTicketApiInput {
  readonly subject?: string;
  readonly description?: string;
  readonly status?: CustomerTicket['status'];
  readonly priority?: CustomerTicket['priority'];
  readonly category?: CustomerTicket['category'];
  readonly channel?: CustomerTicket['channel'];
  readonly assignedToId?: string;
}

@Injectable({ providedIn: 'root' })
export class TicketsApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${runtimeConfig().apiBaseUrl ?? ''}/api/v1/tickets`;

  list(organizationId: string): Observable<ReadonlyArray<TicketRecord>> {
    return this.http
      .get<ApiTicket[]>(this.baseUrl, { params: { organizationId } })
      .pipe(map((tickets) => tickets.map(toTicketRecord)));
  }

  create(input: CreateTicketApiInput): Observable<TicketRecord> {
    const { category, channel, ...dto } = input;
    return this.http
      .post<ApiTicket>(this.baseUrl, {
        ...dto,
        status: dto.status ? STATUS_TO_API[dto.status] : undefined,
        priority: dto.priority ? PRIORITY_TO_API[dto.priority] : undefined,
        customFields: { category, channel },
      })
      .pipe(map(toTicketRecord));
  }

  update(id: string, input: UpdateTicketApiInput): Observable<TicketRecord> {
    const { category, channel, ...dto } = input;
    return this.http
      .patch<ApiTicket>(`${this.baseUrl}/${id}`, {
        ...dto,
        status: dto.status ? STATUS_TO_API[dto.status] : undefined,
        priority: dto.priority ? PRIORITY_TO_API[dto.priority] : undefined,
        ...(category !== undefined || channel !== undefined ? { customFields: { category, channel } } : {}),
      })
      .pipe(map(toTicketRecord));
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  addComment(
    ticketId: string,
    input: { message: string; authorId: string; isInternal?: boolean },
  ): Observable<TicketComment> {
    return this.http
      .post<ApiTicketComment>(`${this.baseUrl}/${ticketId}/comments`, input)
      .pipe(map(toComment));
  }
}
