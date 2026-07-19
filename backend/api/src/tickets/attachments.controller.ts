import { Body, Controller, Post } from '@nestjs/common';
import { CreateAttachmentDto } from './ticket.dto';
import { TicketsService } from './tickets.service';

@Controller({ path: 'attachments', version: '1' })
export class AttachmentsController {
  constructor(private readonly tickets: TicketsService) {}

  @Post()
  create(@Body() dto: CreateAttachmentDto) {
    return this.tickets.addAttachment(dto);
  }
}
