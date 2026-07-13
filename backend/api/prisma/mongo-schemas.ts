
// notifications.schema.ts

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type NotificationDocument = HydratedDocument<Notification>;

@Schema({
  timestamps: true,
})
export class Notification {
  @Prop()
  organizationId: string;

  @Prop()
  userId: string;

  @Prop()
  type: string;

  @Prop()
  title: string;

  @Prop()
  message: string;

  @Prop({ default: false })
  isRead: boolean;

  @Prop()
  sourceModule?: string;

  @Prop()
  sourceRecordId?: string;
}

export const NotificationSchema =
  SchemaFactory.createForClass(Notification);

// ========================================
// activity-log.schema.ts
// ========================================

@Schema({
  timestamps: true,
})
export class ActivityLog {
  @Prop()
  organizationId: string;

  @Prop()
  userId: string;

  @Prop()
  action: string;

  @Prop()
  module: string;

  @Prop()
  recordId?: string;

  @Prop()
  ip?: string;

  @Prop()
  userAgent?: string;
}

export const ActivityLogSchema =
  SchemaFactory.createForClass(ActivityLog);

// ========================================
// audit-log.schema.ts
// ========================================

@Schema({
  timestamps: true,
})
export class AuditLog {
  @Prop()
  organizationId: string;

  @Prop()
  userId: string;

  @Prop()
  module: string;

  @Prop()
  recordId: string;

  @Prop()
  action: string;

  @Prop()
  before?: any;

  @Prop()
  after?: any;

  @Prop()
  ip?: string;
}

export const AuditLogSchema =
  SchemaFactory.createForClass(AuditLog);

// ========================================
// email-log.schema.ts
// ========================================

@Schema({
  timestamps: true,
})
export class EmailLog {
  @Prop()
  organizationId: string;

  @Prop()
  subject: string;

  @Prop()
  from: string;

  @Prop()
  to: string;

  @Prop()
  html?: string;

  @Prop()
  text?: string;

  @Prop()
  status: string;
}

export const EmailLogSchema =
  SchemaFactory.createForClass(EmailLog);
