/**
 * Data Relationships Manager
 * Manages relationships between operational modules
 * Ensures referential integrity and dependency management
 */

import type {
  LeadRecord,
  ServiceRecord,
  EquipmentRecord,
  AssignmentRecord,
  ContractRecord,
  ContractItem,
  InvoiceRecord,
  PaymentRecord,
  ExpenseRecord,
} from '../models/operational-records';
import { assignmentFolio } from '../models/operational-records';

export interface RelationshipRegistry {
  leads: Map<string, LeadRecord>;
  services: Map<string, ServiceRecord>;
  equipment: Map<string, EquipmentRecord>;
  assignments: Map<string, AssignmentRecord>;
  contracts: Map<string, ContractRecord>;
  invoices: Map<string, InvoiceRecord>;
  payments: Map<string, PaymentRecord>;
  expenses: Map<string, ExpenseRecord>;
  customers: Map<string, any>; // External customer data
}

export class DataRelationships {
  constructor(private registry: RelationshipRegistry) {}

  // ========================================================================
  // VALIDATION & INTEGRITY CHECKS
  // ========================================================================

  /**
   * Validate that all foreign key references exist
   */
  validateReferentialIntegrity(): ValidationResult {
    const errors: string[] = [];

    // Check Assignments
    for (const assignment of this.registry.assignments.values()) {
      if (!this.registry.customers.has(assignment.clientId)) {
        errors.push(`Assignment ${assignment.id}: Customer ${assignment.clientId} not found`);
      }
      if (!this.registry.equipment.has(assignment.equipmentId)) {
        errors.push(`Assignment ${assignment.id}: Equipment ${assignment.equipmentId} not found`);
      }
    }

    // Check Contracts
    for (const contract of this.registry.contracts.values()) {
      if (!this.registry.customers.has(contract.clientId)) {
        errors.push(`Contract ${contract.id}: Customer ${contract.clientId} not found`);
      }
      for (const item of contract.items) {
        if (!this.registry.services.has(item.serviceId)) {
          errors.push(`Contract ${contract.id}: Service ${item.serviceId} not found`);
        }
      }
    }

    // Check Invoices
    for (const invoice of this.registry.invoices.values()) {
      if (!this.registry.customers.has(invoice.clientId)) {
        errors.push(`Invoice ${invoice.id}: Customer ${invoice.clientId} not found`);
      }
    }

    // Check Payments
    for (const payment of this.registry.payments.values()) {
      if (!this.registry.customers.has(payment.clientId)) {
        errors.push(`Payment ${payment.id}: Customer ${payment.clientId} not found`);
      }
      if (payment.invoiceId && !this.registry.invoices.has(payment.invoiceId)) {
        errors.push(`Payment ${payment.id}: Invoice ${payment.invoiceId} not found`);
      }
    }

    // Check Equipment assignedTo
    for (const equip of this.registry.equipment.values()) {
      if (equip.assignedToId && !this.registry.customers.has(equip.assignedToId)) {
        errors.push(`Equipment ${equip.id}: Customer ${equip.assignedToId} not found`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // ========================================================================
  // RELATIONSHIP QUERIES
  // ========================================================================

  /**
   * Get all assignments for a customer
   */
  getCustomerAssignments(customerId: string): AssignmentRecord[] {
    return Array.from(this.registry.assignments.values()).filter(
      (a) => a.clientId === customerId,
    );
  }

  /**
   * Get all contracts for a customer
   */
  getCustomerContracts(customerId: string): ContractRecord[] {
    return Array.from(this.registry.contracts.values()).filter(
      (c) => c.clientId === customerId,
    );
  }

  /**
   * Get all invoices for a customer
   */
  getCustomerInvoices(customerId: string): InvoiceRecord[] {
    return Array.from(this.registry.invoices.values()).filter((i) => i.clientId === customerId);
  }

  /**
   * Get all payments for a customer
   */
  getCustomerPayments(customerId: string): PaymentRecord[] {
    return Array.from(this.registry.payments.values()).filter((p) => p.clientId === customerId);
  }

  /**
   * Get all payments for an invoice
   */
  getInvoicePayments(invoiceId: string): PaymentRecord[] {
    return Array.from(this.registry.payments.values()).filter((p) => p.invoiceId === invoiceId);
  }

  /**
   * Get total paid on an invoice
   */
  getInvoicePaidAmount(invoiceId: string): number {
    return this.getInvoicePayments(invoiceId).reduce((sum, p) => sum + p.amount, 0);
  }

  /**
   * Get remaining amount on an invoice
   */
  getInvoiceRemainingAmount(invoiceId: string): number {
    const invoice = this.registry.invoices.get(invoiceId);
    if (!invoice) return 0;
    const paid = this.getInvoicePaidAmount(invoiceId);
    return Math.max(0, invoice.total - paid);
  }

  /**
   * Get equipment assigned to customer
   */
  getCustomerEquipment(customerId: string): EquipmentRecord[] {
    return Array.from(this.registry.equipment.values()).filter(
      (e) => e.assignedToId === customerId,
    );
  }

  /**
   * Get services in a contract
   */
  getContractServices(contractId: string): (ServiceRecord & { quantity: number; unitPrice: number })[] {
    const contract = this.registry.contracts.get(contractId);
    if (!contract) return [];

    return contract.items
      .map((item) => {
        const service = this.registry.services.get(item.serviceId);
        return service
          ? {
              ...service,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
            }
          : null;
      })
      .filter((s) => s !== null) as any[];
  }

  /**
   * Calculate contract total from items
   */
  calculateContractTotal(items: ContractItem[]): number {
    return items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  }

  /**
   * Get all active assignments
   */
  getActiveAssignments(): AssignmentRecord[] {
    return Array.from(this.registry.assignments.values()).filter((a) => a.status === 'ACTIVE');
  }

  /**
   * Get equipment not assigned
   */
  getAvailableEquipment(): EquipmentRecord[] {
    return Array.from(this.registry.equipment.values()).filter((e) => e.status === 'AVAILABLE');
  }

  /**
   * Check if equipment is available for assignment
   */
  isEquipmentAvailable(equipmentId: string): boolean {
    const equipment = this.registry.equipment.get(equipmentId);
    if (!equipment) return false;

    // Equipment must be AVAILABLE and not have active assignment
    if (equipment.status !== 'AVAILABLE') return false;

    const hasActiveAssignment = this.getActiveAssignments().some(
      (a) => a.equipmentId === equipmentId,
    );
    return !hasActiveAssignment;
  }

  /**
   * Get monthly revenue from contracts
   */
  getMonthlyRecurringRevenue(): number {
    return Array.from(this.registry.contracts.values())
      .filter((c) => c.status === 'ACTIVE')
      .reduce((sum, c) => sum + c.totalMonthly, 0);
  }

  /**
   * Get total expenses
   */
  getTotalExpenses(fromDate?: string, toDate?: string): number {
    return Array.from(this.registry.expenses.values())
      .filter((e) => {
        if (fromDate && e.date < fromDate) return false;
        if (toDate && e.date > toDate) return false;
        return true;
      })
      .reduce((sum, e) => sum + e.amount, 0);
  }

  /**
   * Get unpaid invoices
   */
  getUnpaidInvoices(): InvoiceRecord[] {
    return Array.from(this.registry.invoices.values()).filter((i) => {
      const paid = this.getInvoicePaidAmount(i.id);
      return paid < i.total && i.status !== 'CANCELLED';
    });
  }

  /**
   * Get overdue invoices
   */
  getOverdueInvoices(asOfDate: string = new Date().toISOString().split('T')[0]): InvoiceRecord[] {
    return this.getUnpaidInvoices().filter((i) => i.dueDate < asOfDate);
  }

  // ========================================================================
  // CASCADE OPERATIONS
  // ========================================================================

  /**
   * When equipment is assigned to customer, create assignment record
   */
  cascadeEquipmentAssignment(equipmentId: string, customerId: string): AssignmentRecord | null {
    const equipment = this.registry.equipment.get(equipmentId);
    if (!equipment || !this.isEquipmentAvailable(equipmentId)) {
      return null;
    }

    return {
      id: `ASG-${Date.now()}`,
      name: assignmentFolio(this.registry.assignments.size + 1, new Date().getFullYear()),
      clientId: customerId,
      equipmentId: equipmentId,
      assignedAt: new Date().toISOString().split('T')[0],
      status: 'ACTIVE' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'system',
      updatedBy: 'system',
    };
  }

  /**
   * When invoice is marked paid, update related payments
   */
  cascadeInvoicePaid(invoiceId: string): void {
    const invoice = this.registry.invoices.get(invoiceId);
    if (!invoice) return;

    const paid = this.getInvoicePaidAmount(invoiceId);
    if (paid >= invoice.total) {
      invoice.status = 'PAID';
      invoice.updatedAt = new Date().toISOString();
    }
  }

  /**
   * When payment is deleted, recalculate invoice status
   */
  cascadePaymentDeletion(paymentId: string): void {
    const payment = this.registry.payments.get(paymentId);
    if (!payment || !payment.invoiceId) return;

    const invoice = this.registry.invoices.get(payment.invoiceId);
    if (!invoice) return;

    const paid = this.getInvoicePaidAmount(payment.invoiceId);
    if (paid < invoice.total) {
      invoice.status = paid > 0 ? 'PENDING' : 'PENDING';
      invoice.updatedAt = new Date().toISOString();
    }
  }
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}
