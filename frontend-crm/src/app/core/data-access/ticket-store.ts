import { Injectable, computed, signal } from '@angular/core';
import { CrmAttachment, CustomerTicket, TicketComment } from '../models/customer';
import { CUSTOMERS } from './mock-crm-data';

export interface TicketRecord extends CustomerTicket {
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  clientInitials: string;
}

@Injectable({ providedIn: 'root' })
export class TicketStore {
  readonly tickets = signal<ReadonlyArray<TicketRecord>>(
    CUSTOMERS.flatMap((customer) =>
      customer.tickets.map((ticket) => ({
        ...ticket,
        clientName: customer.name,
        clientEmail: customer.email,
        clientPhone: customer.phone,
        clientInitials: customer.initials,
      })),
    ),
  );
  readonly openCount = computed(
    () => this.tickets().filter((ticket) => !['resolved', 'closed'].includes(ticket.status)).length,
  );

  forClient(clientId: string): ReadonlyArray<TicketRecord> {
    return this.tickets().filter((ticket) => ticket.clientId === clientId);
  }

  get(ticketId: string): TicketRecord | undefined {
    return this.tickets().find((ticket) => ticket.id === ticketId);
  }

  add(
    ticket: CustomerTicket,
    client: Pick<TicketRecord, 'clientName' | 'clientEmail' | 'clientPhone' | 'clientInitials'>,
  ): void {
    this.tickets.update((tickets) => [{ ...ticket, ...client }, ...tickets]);
  }

  updateStatus(ticketId: string, status: CustomerTicket['status'], updatedAt: string): void {
    this.tickets.update((tickets) =>
      tickets.map((ticket) =>
        ticket.id === ticketId
          ? {
              ...ticket,
              status,
              updatedAt,
              resolvedAt: ['resolved', 'closed'].includes(status) ? updatedAt : undefined,
            }
          : ticket,
      ),
    );
  }

  update(ticketId: string, changes: Partial<TicketRecord>): void {
    this.tickets.update((tickets) =>
      tickets.map((ticket) =>
        ticket.id === ticketId
          ? { ...ticket, ...changes, updatedAt: new Date().toISOString() }
          : ticket,
      ),
    );
  }

  delete(ticketId: string): void {
    this.tickets.update((tickets) => tickets.filter((ticket) => ticket.id !== ticketId));
  }

  addComment(ticketId: string, comment: TicketComment): void {
    this.tickets.update((tickets) =>
      tickets.map((ticket) =>
        ticket.id === ticketId
          ? { ...ticket, comments: [...ticket.comments, comment], updatedAt: comment.createdAt }
          : ticket,
      ),
    );
  }

  addAttachments(ticketId: string, attachments: ReadonlyArray<CrmAttachment>): void {
    this.tickets.update((tickets) =>
      tickets.map((ticket) =>
        ticket.id === ticketId
          ? { ...ticket, attachments: [...ticket.attachments, ...attachments] }
          : ticket,
      ),
    );
  }
}
