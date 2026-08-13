/**
 * Data Initializer Service
 * Bridges between OperationalDataService and OperationalStore
 * Initializes mock data and populates the operational modules
 */

import { Injectable, inject } from '@angular/core';
import { OperationalStore } from '../../../features/operations/operational-store';
import { OperationalDataService } from './operational-data.service';
import type { OperationalRecord } from '../../../features/operations/operational-modules.data';
import { OPERATIONAL_MODULES } from '../../../features/operations/operational-modules.data';

@Injectable({
  providedIn: 'root',
})
export class DataInitializerService {
  private operationalStore = inject(OperationalStore);
  private dataService = inject(OperationalDataService);

  /**
   * Initialize operational data in the store
   */
  async initializeOperationalData(): Promise<void> {
    try {
      // Initialize the data service with generated data
      await this.dataService.initialize({
        useGeneratedData: true,
        generationConfig: {
          leads: 15,
          equipment: 20,
          assignments: 12,
          contracts: 10,
          invoices: 40,
          payments: 50,
          expenses: 25,
        },
      });

      // Load data into operational store
      this.populateOperationalStore();

      console.log('✅ Operational data initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize operational data:', error);
      throw error;
    }
  }

  /**
   * Load data from service into operational store
   */
  private populateOperationalStore(): void {
    const recordsToLoad: Record<string, OperationalRecord[]> = {
      leads: this.mapLeadsToOperationalRecords(),
      services: this.mapServicesToOperationalRecords(),
      equipment: this.mapEquipmentToOperationalRecords(),
      assignments: this.mapAssignmentsToOperationalRecords(),
      contracts: this.mapContractsToOperationalRecords(),
      invoices: this.mapInvoicesToOperationalRecords(),
      payments: this.mapPaymentsToOperationalRecords(),
      expenses: this.mapExpensesToOperationalRecords(),
      customers: this.mapCustomersToOperationalRecords(),
    };

    // Update store with all records
    this.operationalStore.records.set(recordsToLoad as any);
  }

  /**
   * Map LeadRecord to OperationalRecord format
   */
  private mapLeadsToOperationalRecords(): OperationalRecord[] {
    return this.dataService.leads.getAllSync().map((lead) => ({
      id: lead.id,
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      cellphone: lead.cellphone,
      type: lead.type,
      address: lead.address,
      latitude: lead.latitude,
      longitude: lead.longitude,
      source: lead.source,
      status: lead.status,
      notes: lead.notes,
    } as OperationalRecord));
  }

  /**
   * Map ServiceRecord to OperationalRecord format
   */
  private mapServicesToOperationalRecords(): OperationalRecord[] {
    return this.dataService.services.getAllSync().map((service) => ({
      id: service.id,
      name: service.name,
      description: service.description,
      price: service.price,
      type: service.type,
      status: service.status,
    } as OperationalRecord));
  }

  /**
   * Map EquipmentRecord to OperationalRecord format
   */
  private mapEquipmentToOperationalRecords(): OperationalRecord[] {
    return this.dataService.equipment.getAllSync().map((equipment) => ({
      id: equipment.id,
      name: equipment.name,
      brand: equipment.brand,
      model: equipment.model,
      serialNumber: equipment.serialNumber,
      macAddress: equipment.macAddress,
      status: equipment.status,
      purchaseCost: equipment.purchaseCost,
      purchaseDate: equipment.purchaseDate,
      assignedToId: equipment.assignedToId,
      notes: equipment.notes,
    } as OperationalRecord));
  }

  /**
   * Map AssignmentRecord to OperationalRecord format
   */
  private mapAssignmentsToOperationalRecords(): OperationalRecord[] {
    return this.dataService.assignments.getAllSync().map((assignment) => ({
      id: assignment.id,
      clientId: assignment.clientId,
      client: assignment.client,
      equipmentId: assignment.equipmentId,
      equipment: assignment.equipment,
      assignedAt: assignment.assignedAt,
      returnedAt: assignment.returnedAt,
      status: assignment.status,
      notes: assignment.notes,
    } as OperationalRecord));
  }

  /**
   * Map ContractRecord to OperationalRecord format
   */
  private mapContractsToOperationalRecords(): OperationalRecord[] {
    return this.dataService.contracts.getAllSync().map((contract) => ({
      id: contract.id,
      contractNumber: contract.contractNumber,
      clientId: contract.clientId,
      client: contract.client,
      startDate: contract.startDate,
      endDate: contract.endDate,
      signedAt: contract.signedAt,
      totalMonthly: contract.totalMonthly,
      status: contract.status,
      items: JSON.stringify(contract.items),
      notes: contract.notes,
    } as OperationalRecord));
  }

  /**
   * Map InvoiceRecord to OperationalRecord format
   */
  private mapInvoicesToOperationalRecords(): OperationalRecord[] {
    return this.dataService.invoices.getAllSync().map((invoice) => ({
      id: invoice.id,
      folio: invoice.folio,
      clientId: invoice.clientId,
      client: invoice.client,
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      subtotal: invoice.subtotal,
      taxAmount: invoice.taxAmount,
      total: invoice.total,
      status: invoice.status,
      notes: invoice.notes,
    } as OperationalRecord));
  }

  /**
   * Map PaymentRecord to OperationalRecord format
   */
  private mapPaymentsToOperationalRecords(): OperationalRecord[] {
    return this.dataService.payments.getAllSync().map((payment) => ({
      id: payment.id,
      clientId: payment.clientId,
      client: payment.client,
      invoiceId: payment.invoiceId,
      invoice: payment.invoice,
      amount: payment.amount,
      method: payment.method,
      reference: payment.reference,
      paidAt: payment.paidAt,
      notes: payment.notes,
    } as OperationalRecord));
  }

  /**
   * Map ExpenseRecord to OperationalRecord format
   */
  private mapExpensesToOperationalRecords(): OperationalRecord[] {
    return this.dataService.expenses.getAllSync().map((expense) => ({
      id: expense.id,
      description: expense.description,
      vendor: expense.vendor,
      category: expense.category,
      amount: expense.amount,
      date: expense.date,
    } as OperationalRecord));
  }

  /**
   * Map CustomerRecord to OperationalRecord format
   */
  private mapCustomersToOperationalRecords(): OperationalRecord[] {
    return OPERATIONAL_MODULES.customers.records.map((customer) => customer as OperationalRecord);
  }
}
