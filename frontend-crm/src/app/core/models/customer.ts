export type CustomerStatus = 'active' | 'inactive' | 'pending' | 'suspended' | 'cancelled';

export interface EntityUser {
  fullName: string;
  email: string;
  initials: string;
}

export interface BaseEntity {
  id: string;
  organizationId: string;
  createdAt: string;
  createdBy: EntityUser;
  updatedAt: string;
  updatedBy: EntityUser;
}

export interface Customer extends BaseEntity {
  name: string;
  initials: string;
  email: string;
  phone: string;
  cellphone?: string;
  address: string;
  latitude?: number;
  longitude?: number;
  internalNotes?: string;
  community: string;
  status: CustomerStatus;
  plan: string;
  speed: string;
  monthlyFee: number;
  billingDay: number;
  currentBalance: number;
  technician: string;
  lastActivity: string;
  installDate: string;
  gpsLocation: string;
  ipAddress: string;
  equipment: ReadonlyArray<CustomerEquipment>;
  invoices: ReadonlyArray<CustomerInvoice>;
  payments: ReadonlyArray<CustomerPayment>;
  tickets: ReadonlyArray<CustomerTicket>;
  notes: ReadonlyArray<CustomerNote>;
  timeline: ReadonlyArray<TimelineItem>;
}

export interface CustomerEquipment {
  id: string;
  name: string;
  model: string;
  serial: string;
  mac: string;
  ipAddress: string;
  status: 'online' | 'warning' | 'offline';
}
export interface CustomerInvoice {
  id: string;
  issuedAt: string;
  dueAt: string;
  total: number;
  status: 'paid' | 'pending' | 'overdue';
  payments?: ReadonlyArray<CustomerPayment>;
}
export interface CustomerPayment {
  id: string;
  date: string;
  amount: number;
  method: 'Transferencia' | 'Efectivo' | 'Tarjeta';
  reference: string;
}
export interface CustomerTicket {
  id: string;
  clientId: string;
  subject: string;
  description: string;
  category: 'Conectividad' | 'Facturación' | 'Equipo' | 'Instalación' | 'Otro';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'waiting' | 'resolved' | 'closed';
  channel: 'Teléfono' | 'WhatsApp' | 'Correo' | 'Portal';
  assignedTo: string;
  assignedToId?: string;
  createdById: string;
  resolvedAt?: string;
  customFields?: Readonly<Record<string, unknown>>;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  slaDueAt: string;
  requester: string;
  comments: ReadonlyArray<TicketComment>;
  attachments: ReadonlyArray<CrmAttachment>;
}
export interface TicketComment {
  id: string;
  message: string;
  author: EntityUser;
  isInternal: boolean;
  createdAt: string;
  attachments: ReadonlyArray<CrmAttachment>;
}
export interface CrmAttachment {
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
  url: string;
  createdAt: string;
}
export interface CustomerNote {
  id: string;
  content: string;
  createdAt: string;
  author: EntityUser;
  pinned: boolean;
  attachments?: ReadonlyArray<CrmAttachment>;
}
export interface TimelineItem {
  id: string;
  title: string;
  detail: string;
  date: string;
  type: 'service' | 'payment' | 'note' | 'invoice' | 'ticket' | 'call' | 'update';
  author: string;
}

export interface DashboardSummary {
  activeCustomers: number;
  monthlyRecurringRevenue: number;
  pendingInvoices: number;
  overdueInvoices: number;
  paymentsToday: number;
  scheduledInstallations: number;
  availableEquipment: number;
  openTickets: number;
  revenue: ReadonlyArray<{ month: string; value: number }>;
  planDistribution: ReadonlyArray<{ name: string; customers: number; color: string }>;
  recentActivity: ReadonlyArray<{
    title: string;
    detail: string;
    time: string;
    tone: 'blue' | 'green' | 'amber';
  }>;
}
