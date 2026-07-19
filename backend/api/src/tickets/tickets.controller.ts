import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { TicketStatus } from '@prisma/client';
import {
  CreateTicketCommentDto,
  CreateTicketDto,
  UpdateTicketDto,
} from './ticket.dto';
import { TicketsService } from './tickets.service';

@Controller({ path: 'tickets', version: '1' })
export class TicketsController {
  constructor(private readonly tickets: TicketsService) {}

  @Get()
  list(
    @Query('organizationId') organizationId: string,
    @Query('clientId') clientId?: string,
    @Query('status') status?: TicketStatus,
    @Query('search') search?: string,
  ) {
    return this.tickets.list(organizationId, clientId, status, search);
  }

  @Get(':id') get(@Param('id') id: string) {
    return this.tickets.get(id);
  }

  @Post() create(@Body() dto: CreateTicketDto) {
    return this.tickets.create(dto);
  }

  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateTicketDto) {
    return this.tickets.update(id, dto);
  }

  @Delete(':id') remove(@Param('id') id: string) {
    return this.tickets.remove(id);
  }

  @Post(':id/comments') addComment(
    @Param('id') id: string,
    @Body() dto: CreateTicketCommentDto,
  ) {
    return this.tickets.addComment(id, dto);
  }
}
