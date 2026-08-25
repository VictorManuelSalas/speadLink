/**
 * Operational Records Models
 * Defines all data models for the operational modules
 * These models are mapped from the form structure to actual storage
 */

// ============================================================================
// BASE TYPES & ENUMS
// ============================================================================

export type LeadStatus = 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'LOST' | 'CONVERTED';
export type LeadSource = 'Referido' | 'Redes sociales' | 'Sitio web' | 'Llamada';
export type ProspectType = 'Hogar' | 'Negocio';

export type ServiceType = 'Internet' | 'Streaming' | 'Complemento';
export type ServiceStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';

export type EquipmentStatus = 'AVAILABLE' | 'ASSIGNED' | 'DAMAGED' | 'RETIRED' | 'IN_REPAIR';

export type AssignmentStatus = 'ACTIVE' | 'RETURNED' | 'INACTIVE';

export type ContractStatus = 'PENDING_SIGNATURE' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED';

export type InvoiceStatus = 'DRAFT' | 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED';

export type PaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'CHECK' | 'OTHER';

export type ExpenseCategory =
  | 'ELECTRICITY'
  | 'INTERNET'
  | 'CABLE'
  | 'EQUIPMENT'
  | 'RENT'
  | 'SALARY'
  | 'MAINTENANCE'
  | 'OTHER';

// ============================================================================
// BASE RECORD INTERFACE
// ============================================================================

export interface BaseOperationalRecord {
  id: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
  archived?: boolean;
}

// ============================================================================
// LEADS
// ============================================================================

export interface LeadRecord extends BaseOperationalRecord {
  // Form field mappings
  name: string;
  email: string;
  phone: string;
  cellphone?: string;
  type: ProspectType; // Tipo de prospecto (Hogar | Negocio)
  address: string;
  latitude?: number;
  longitude?: number;
  source: LeadSource;
  status: LeadStatus;
  /** Id del usuario del sistema responsable del lead (ver SYSTEM_USERS). */
  owner?: string;
  description?: string;
}

// ============================================================================
// SERVICES
// ============================================================================

export interface ServiceRecord extends BaseOperationalRecord {
  name: string;
  description?: string;
  price: number;
  type: ServiceType;
  status: ServiceStatus;
  isInternetService?: boolean; // Convenience flag for Internet services
}

// ============================================================================
// EQUIPMENT
// ============================================================================

export interface EquipmentRecord extends BaseOperationalRecord {
  name: string;
  brand?: string;
  model?: string;
  serialNumber?: string;
  macAddress: string;
  status: EquipmentStatus;
  purchaseCost?: number;
  purchaseDate?: string;
  assignedToId?: string; // Links to Customer ID
  notes?: string;
}

// ============================================================================
// ASSIGNMENTS
// ============================================================================

export interface AssignmentRecord extends BaseOperationalRecord {
  /** Folio del registro, asignado al crearlo. Ver `assignmentFolio`. */
  name: string;
  clientId: string;
  client?: string; // Lookup: Customer name
  equipmentId: string;
  equipment?: string; // Lookup: Equipment name/model
  /** Serie de la unidad instalada; se copia del equipo al asignarlo. */
  serial?: string;
  assignedAt: string;
  returnedAt?: string;
  status: AssignmentStatus;
  description?: string;
}

/**
 * Folio de una asignación: `ASG-<año>-<consecutivo>`.
 *
 * Se calcula UNA sola vez al crear el registro y no vuelve a tocarse. No se
 * deriva del cliente ni del equipo justamente porque ésos pueden cambiar y el
 * folio debe seguir identificando al mismo registro.
 */
export function assignmentFolio(sequence: number, year: number): string {
  return `ASG-${year}-${String(sequence).padStart(4, '0')}`;
}

// ============================================================================
// CONTRACTS
// ============================================================================

export interface ContractItem {
  serviceId: string;
  quantity: number;
  unitPrice: number;
  locked?: boolean; // For Internet services
}

export interface ContractRecord extends BaseOperationalRecord {
  contractNumber: string;
  clientId: string;
  client?: string; // Lookup: Customer name
  startDate: string;
  endDate?: string;
  signedAt?: string;
  totalMonthly: number;
  status: ContractStatus;
  items: ContractItem[];
  notes?: string;
}

// ============================================================================
// INVOICES
// ============================================================================

export interface InvoiceRecord extends BaseOperationalRecord {
  folio: string;
  clientId: string;
  client?: string; // Lookup: Customer name
  issueDate: string;
  dueDate: string;
  subtotal: number;
  taxAmount: number;
  total: number;
  status: InvoiceStatus;
  notes?: string;
  // Computed/related
  paidAmount?: number; // Total of all payments
  remainingAmount?: number; // total - paidAmount
}

// ============================================================================
// PAYMENTS
// ============================================================================

export interface PaymentRecord extends BaseOperationalRecord {
  clientId: string;
  client?: string; // Lookup: Customer name
  invoiceId?: string;
  invoice?: string; // Lookup: Invoice folio
  amount: number;
  method: PaymentMethod;
  reference?: string;
  paidAt: string;
  notes?: string;
}

// ============================================================================
// EXPENSES
// ============================================================================

export interface ExpenseRecord extends BaseOperationalRecord {
  description: string;
  vendor?: string;
  category: ExpenseCategory;
  amount: number;
  date: string;
}

// ============================================================================
// UNION TYPE FOR ALL OPERATIONAL RECORDS
// ============================================================================

export type OperationalRecordType =
  | LeadRecord
  | ServiceRecord
  | EquipmentRecord
  | AssignmentRecord
  | ContractRecord
  | InvoiceRecord
  | PaymentRecord
  | ExpenseRecord;
