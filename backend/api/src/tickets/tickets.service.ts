import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TicketStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateAttachmentDto,
  CreateTicketCommentDto,
  CreateTicketDto,
  UpdateTicketDto,
} from './ticket.dto';

const ticketInclude = {
  client: { select: { id: true, name: true, email: true, phone: true } },
  assignedTo: { select: { id: true, name: true, email: true } },
  createdBy: { select: { id: true, name: true, email: true } },
  comments: {
    where: { deletedAt: null },
    orderBy: { createdAt: 'asc' as const },
    include: {
      author: { select: { id: true, name: true, email: true } },
      attachments: { where: { deletedAt: null } },
    },
  },
  attachments: { where: { deletedAt: null } },
};

@Injectable()
export class TicketsService {
  constructor(private readonly prisma: PrismaService) {}

  list(organizationId: string, clientId?: string, status?: TicketStatus, search?: string) {
    return this.prisma.ticket.findMany({
      where: {
        organizationId,
        clientId,
        status,
        deletedAt: null,
        ...(search
          ? {
              OR: [
                { subject: { contains: search, mode: 'insensitive' as const } },
                { description: { contains: search, mode: 'insensitive' as const } },
                { client: { name: { contains: search, mode: 'insensitive' as const } } },
              ],
            }
          : {}),
      },
      include: ticketInclude,
      orderBy: [{ priority: 'desc' }, { updatedAt: 'desc' }],
    });
  }

  async get(id: string) {
    const ticket = await this.prisma.ticket.findFirst({
      where: { id, deletedAt: null },
      include: ticketInclude,
    });
    if (!ticket) throw new NotFoundException('Ticket not found');
    return ticket;
  }

  create(dto: CreateTicketDto) {
    return this.prisma.ticket.create({
      data: {
        ...dto,
        customFields: dto.customFields as Prisma.InputJsonValue | undefined,
      },
      include: ticketInclude,
    });
  }

  async update(id: string, dto: UpdateTicketDto) {
    await this.get(id);
    const resolved = dto.status === TicketStatus.RESOLVED || dto.status === TicketStatus.CLOSED;
    return this.prisma.ticket.update({
      where: { id },
      data: {
        ...dto,
        customFields: dto.customFields as Prisma.InputJsonValue | undefined,
        ...(dto.status ? { resolvedAt: resolved ? new Date() : null } : {}),
      },
      include: ticketInclude,
    });
  }

  async remove(id: string) {
    await this.get(id);
    return this.prisma.ticket.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  async addComment(ticketId: string, dto: CreateTicketCommentDto) {
    await this.get(ticketId);
    return this.prisma.ticketComment.create({
      data: { ticketId, ...dto },
      include: {
        author: { select: { id: true, name: true, email: true } },
        attachments: true,
      },
    });
  }

  async addAttachment(dto: CreateAttachmentDto) {
    const parents = [dto.noteId, dto.ticketId, dto.ticketCommentId].filter(Boolean);
    if (parents.length !== 1) {
      throw new BadRequestException('An attachment must belong to exactly one parent');
    }
    return this.prisma.attachment.create({ data: dto });
  }
}
