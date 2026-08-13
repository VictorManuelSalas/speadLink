/**
 * Operational Repositories
 * Specific repositories for each operational module with domain-specific methods
 */

import { BaseRepository } from './base-repository';
import type {
  LeadRecord,
  ServiceRecord,
  EquipmentRecord,
  AssignmentRecord,
  ContractRecord,
  InvoiceRecord,
  PaymentRecord,
  ExpenseRecord,
} from '../models/operational-records';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

// ============================================================================
// LEADS REPOSITORY
// ============================================================================

export class LeadsRepository extends BaseRepository<LeadRecord> {
  /**
   * Get leads by status
   */
  getByStatus(status: string): Observable<LeadRecord[]> {
    return this.filter((lead) => lead.status === status);
  }

  /**
   * Get leads by source
   */
  getBySource(source: string): Observable<LeadRecord[]> {
    return this.filter((lead) => lead.source === source);
  }

  /**
   * Get converted leads
   */
  getConverted(): Observable<LeadRecord[]> {
    return this.getByStatus('CONVERTED');
  }

  /**
   * Get unqualified leads
   */
  getUnqualified(): Observable<LeadRecord[]> {
    return this.filter((lead) => lead.status === 'NEW' || lead.status === 'CONTACTED');
  }
}

// ============================================================================
// SERVICES REPOSITORY
// ============================================================================

export class ServicesRepository extends BaseRepository<ServiceRecord> {
  /**
   * Get internet services
   */
  getInternetServices(): Observable<ServiceRecord[]> {
    return this.filter((service) => service.type === 'Internet');
  }

  /**
   * Get add-on services
   */
  getAddOns(): Observable<ServiceRecord[]> {
    return this.filter((service) => service.type === 'Complemento');
  }

  /**
   * Get active services
   */
  getActive(): Observable<ServiceRecord[]> {
    return this.filter((service) => service.status === 'ACTIVE');
  }

  /**
   * Get service by price range
   */
  getByPriceRange(min: number, max: number): Observable<ServiceRecord[]> {
    return this.filter((service) => service.price >= min && service.price <= max);
  }
}

// ============================================================================
// EQUIPMENT REPOSITORY
// ============================================================================

export class EquipmentRepository extends BaseRepository<EquipmentRecord> {
  /**
   * Get available equipment
   */
  getAvailable(): Observable<EquipmentRecord[]> {
    return this.filter((eq) => eq.status === 'AVAILABLE');
  }

  /**
   * Get assigned equipment
   */
  getAssigned(): Observable<EquipmentRecord[]> {
    return this.filter((eq) => eq.status === 'ASSIGNED');
  }

  /**
   * Get equipment by customer
   */
  getByCustomer(customerId: string): Observable<EquipmentRecord[]> {
    return this.filter((eq) => eq.assignedToId === customerId);
  }

  /**
   * Get equipment by status
   */
  getByStatus(status: string): Observable<EquipmentRecord[]> {
    return this.filter((eq) => eq.status === status);
  }

  /**
   * Get equipment by brand
   */
  getByBrand(brand: string): Observable<EquipmentRecord[]> {
    return this.filter((eq) => eq.brand === brand);
  }
}

// ============================================================================
// ASSIGNMENTS REPOSITORY
// ============================================================================

export class AssignmentsRepository extends BaseRepository<AssignmentRecord> {
  /**
   * Get active assignments
   */
  getActive(): Observable<AssignmentRecord[]> {
    return this.filter((a) => a.status === 'ACTIVE');
  }

  /**
   * Get assignments for customer
   */
  getByCustomer(customerId: string): Observable<AssignmentRecord[]> {
    return this.filter((a) => a.clientId === customerId);
  }

  /**
   * Get assignments for equipment
   */
  getByEquipment(equipmentId: string): Observable<AssignmentRecord[]> {
    return this.filter((a) => a.equipmentId === equipmentId);
  }

  /**
   * Get returned equipment
   */
  getReturned(): Observable<AssignmentRecord[]> {
    return this.filter((a) => a.status === 'RETURNED');
  }

  /**
   * Check if equipment has active assignment
   */
  hasActiveAssignment(equipmentId: string): Observable<boolean> {
    return this.getByEquipment(equipmentId).pipe(
      map((assignments) => assignments.some((a) => a.status === 'ACTIVE')),
    );
  }
}

// ============================================================================
// CONTRACTS REPOSITORY
// ============================================================================

export class ContractsRepository extends BaseRepository<ContractRecord> {
  /**
   * Get active contracts
   */
  getActive(): Observable<ContractRecord[]> {
    return this.filter((c) => c.status === 'ACTIVE');
  }

  /**
   * Get contracts for customer
   */
  getByCustomer(customerId: string): Observable<ContractRecord[]> {
    return this.filter((c) => c.clientId === customerId);
  }

  /**
   * Get contracts by status
   */
  getByStatus(status: string): Observable<ContractRecord[]> {
    return this.filter((c) => c.status === status);
  }

  /**
   * Get expired contracts
   */
  getExpired(): Observable<ContractRecord[]> {
    return this.getByStatus('EXPIRED');
  }

  /**
   * Calculate total monthly revenue
   */
  getTotalMonthlyRevenue(): Observable<number> {
    return this.data$.pipe(
      map((contracts) =>
        contracts
          .filter((c) => c.status === 'ACTIVE')
          .reduce((sum, c) => sum + c.totalMonthly, 0),
      ),
    );
  }
}

// ============================================================================
// INVOICES REPOSITORY
// ============================================================================

export class InvoicesRepository extends BaseRepository<InvoiceRecord> {
  /**
   * Get invoices for customer
   */
  getByCustomer(customerId: string): Observable<InvoiceRecord[]> {
    return this.filter((i) => i.clientId === customerId);
  }

  /**
   * Get invoices by status
   */
  getByStatus(status: string): Observable<InvoiceRecord[]> {
    return this.filter((i) => i.status === status);
  }

  /**
   * Get unpaid invoices
   */
  getUnpaid(): Observable<InvoiceRecord[]> {
    return this.filter((i) => i.status !== 'PAID' && i.status !== 'CANCELLED');
  }

  /**
   * Get overdue invoices
   */
  getOverdue(asOfDate: string = new Date().toISOString().split('T')[0]): Observable<InvoiceRecord[]> {
    return this.filter((i) => i.status !== 'PAID' && i.dueDate < asOfDate);
  }

  /**
   * Get invoices in date range
   */
  getByDateRange(startDate: string, endDate: string): Observable<InvoiceRecord[]> {
    return this.filter((i) => i.issueDate >= startDate && i.issueDate <= endDate);
  }

  /**
   * Calculate total outstanding amount
   */
  getTotalOutstanding(): Observable<number> {
    return this.data$.pipe(
      map((invoices) =>
        invoices
          .filter((i) => i.status !== 'PAID' && i.status !== 'CANCELLED')
          .reduce((sum, i) => sum + i.total, 0),
      ),
    );
  }
}

// ============================================================================
// PAYMENTS REPOSITORY
// ============================================================================

export class PaymentsRepository extends BaseRepository<PaymentRecord> {
  /**
   * Get payments for customer
   */
  getByCustomer(customerId: string): Observable<PaymentRecord[]> {
    return this.filter((p) => p.clientId === customerId);
  }

  /**
   * Get payments for invoice
   */
  getByInvoice(invoiceId: string): Observable<PaymentRecord[]> {
    return this.filter((p) => p.invoiceId === invoiceId);
  }

  /**
   * Get payments by method
   */
  getByMethod(method: string): Observable<PaymentRecord[]> {
    return this.filter((p) => p.method === method);
  }

  /**
   * Get payments in date range
   */
  getByDateRange(startDate: string, endDate: string): Observable<PaymentRecord[]> {
    return this.filter((p) => p.paidAt >= startDate && p.paidAt <= endDate);
  }

  /**
   * Calculate total paid in date range
   */
  getTotalPaidInRange(
    startDate: string,
    endDate: string,
  ): Observable<number> {
    return this.getByDateRange(startDate, endDate).pipe(
      map((payments) => payments.reduce((sum, p) => sum + p.amount, 0)),
    );
  }

  /**
   * Calculate total paid for invoice
   */
  getTotalPaidForInvoice(invoiceId: string): Observable<number> {
    return this.getByInvoice(invoiceId).pipe(
      map((payments) => payments.reduce((sum, p) => sum + p.amount, 0)),
    );
  }
}

// ============================================================================
// EXPENSES REPOSITORY
// ============================================================================

export class ExpensesRepository extends BaseRepository<ExpenseRecord> {
  /**
   * Get expenses by category
   */
  getByCategory(category: string): Observable<ExpenseRecord[]> {
    return this.filter((e) => e.category === category);
  }

  /**
   * Get expenses by vendor
   */
  getByVendor(vendor: string): Observable<ExpenseRecord[]> {
    return this.filter((e) => e.vendor === vendor);
  }

  /**
   * Get expenses in date range
   */
  getByDateRange(startDate: string, endDate: string): Observable<ExpenseRecord[]> {
    return this.filter((e) => e.date >= startDate && e.date <= endDate);
  }

  /**
   * Calculate total expenses by category
   */
  getTotalByCategory(category: string): Observable<number> {
    return this.getByCategory(category).pipe(
      map((expenses) => expenses.reduce((sum, e) => sum + e.amount, 0)),
    );
  }

  /**
   * Calculate total expenses in date range
   */
  getTotalInRange(startDate: string, endDate: string): Observable<number> {
    return this.getByDateRange(startDate, endDate).pipe(
      map((expenses) => expenses.reduce((sum, e) => sum + e.amount, 0)),
    );
  }
}
