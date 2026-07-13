import { HydratedDocument } from 'mongoose';
export type NotificationDocument = HydratedDocument<Notification>;
export declare class Notification {
    organizationId: string;
    userId: string;
    type: string;
    title: string;
    message: string;
    isRead: boolean;
    sourceModule?: string;
    sourceRecordId?: string;
}
export declare const NotificationSchema: any;
export declare class ActivityLog {
    organizationId: string;
    userId: string;
    action: string;
    module: string;
    recordId?: string;
    ip?: string;
    userAgent?: string;
}
export declare const ActivityLogSchema: any;
export declare class AuditLog {
    organizationId: string;
    userId: string;
    module: string;
    recordId: string;
    action: string;
    before?: any;
    after?: any;
    ip?: string;
}
export declare const AuditLogSchema: any;
export declare class EmailLog {
    organizationId: string;
    subject: string;
    from: string;
    to: string;
    html?: string;
    text?: string;
    status: string;
}
export declare const EmailLogSchema: any;
