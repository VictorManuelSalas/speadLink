
// notifications.schema.ts

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

// ============================================================
// NOTIFICATIONS
// ============================================================

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

  @Prop()
  createdSource?: string;
}

export const NotificationSchema =
  SchemaFactory.createForClass(Notification);

// ============================================================
// ACTIVITY LOGS
// ============================================================

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

  @Prop()
  createdSource?: string;
}

export const ActivityLogSchema =
  SchemaFactory.createForClass(ActivityLog);

// ============================================================
// AUDIT LOGS
// ============================================================

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

  @Prop()
  createdSource?: string;
}

export const AuditLogSchema =
  SchemaFactory.createForClass(AuditLog);
