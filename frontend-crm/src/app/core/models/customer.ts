export type CustomerStatus = 'active' | 'inactive' | 'pending' | 'suspended' | 'cancelled';

export interface BaseEntity {
  id: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Customer extends BaseEntity {
  name: string;
  initials: string;
  email: string;
  phone: string;
  address: string;
  community: string;
  status: CustomerStatus;
  plan: string;
  speed: string;
  monthlyFee: number;
  billingDay: number;
  currentBalance: number;
  technician: string;
  lastActivity: string;
  installationDate: string;
  gpsLocation: string;
  ipAddress: string;
  equipment: ReadonlyArray<CustomerEquipment>;
  invoices: ReadonlyArray<CustomerInvoice>;
  payments: ReadonlyArray<CustomerPayment>;
  timeline: ReadonlyArray<TimelineItem>;
}

export interface CustomerEquipment { name: string; model: string; serial: string; mac: string; status: 'online' | 'warning' | 'offline'; }
export interface CustomerInvoice { id: string; issuedAt: string; dueAt: string; total: number; status: 'paid' | 'pending' | 'overdue'; }
export interface CustomerPayment { id: string; date: string; amount: number; method: 'Transferencia' | 'Efectivo' | 'Tarjeta'; reference: string; }
export interface TimelineItem { id: string; title: string; detail: string; date: string; type: 'service' | 'payment' | 'note' | 'invoice'; }

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
  recentActivity: ReadonlyArray<{ title: string; detail: string; time: string; tone: 'blue' | 'green' | 'amber' }>;
}
