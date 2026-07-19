import { TicketPriority, TicketStatus } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateTicketDto {
  @IsString() @IsNotEmpty() organizationId: string;
  @IsString() @IsNotEmpty() clientId: string;
  @IsString() @IsNotEmpty() @MaxLength(160) subject: string;
  @IsString() @IsNotEmpty() description: string;
  @IsEnum(TicketStatus) @IsOptional() status?: TicketStatus;
  @IsEnum(TicketPriority) @IsOptional() priority?: TicketPriority;
  @IsString() @IsOptional() assignedToId?: string;
  @IsString() @IsNotEmpty() createdById: string;
  @IsObject() @IsOptional() customFields?: Record<string, unknown>;
}

export class UpdateTicketDto {
  @IsString() @IsOptional() @MaxLength(160) subject?: string;
  @IsString() @IsOptional() description?: string;
  @IsEnum(TicketStatus) @IsOptional() status?: TicketStatus;
  @IsEnum(TicketPriority) @IsOptional() priority?: TicketPriority;
  @IsString() @IsOptional() assignedToId?: string;
  @IsObject() @IsOptional() customFields?: Record<string, unknown>;
}

export class CreateTicketCommentDto {
  @IsString() @IsNotEmpty() message: string;
  @IsString() @IsNotEmpty() authorId: string;
  @IsBoolean() @IsOptional() isInternal?: boolean;
}

export class CreateAttachmentDto {
  @IsString() @IsNotEmpty() organizationId: string;
  @IsString() @IsNotEmpty() fileName: string;
  @IsString() @IsNotEmpty() mimeType: string;
  @IsInt() @Min(0) size: number;
  @IsUrl({ require_tld: false }) url: string;
  @IsString() @IsNotEmpty() uploadedById: string;
  @IsString() @IsOptional() noteId?: string;
  @IsString() @IsOptional() ticketId?: string;
  @IsString() @IsOptional() ticketCommentId?: string;
}
