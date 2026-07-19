import { Module } from '@nestjs/common';
import { TicketsController } from './tickets.controller';
import { AttachmentsController } from './attachments.controller';
import { TicketsService } from './tickets.service';

@Module({
  controllers: [TicketsController, AttachmentsController],
  providers: [TicketsService],
  exports: [TicketsService],
})
export class TicketsModule {}
