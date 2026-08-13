/**
 * Repositories Index
 * Central export point for all repositories
 */

export { BaseRepository } from './base-repository';
export {
  LeadsRepository,
  ServicesRepository,
  EquipmentRepository,
  AssignmentsRepository,
  ContractsRepository,
  InvoicesRepository,
  PaymentsRepository,
  ExpensesRepository,
} from './operational-repositories';

// ============================================================================
// REPOSITORY REGISTRY & FACTORY
// ============================================================================

import { LeadsRepository } from './operational-repositories';
import { ServicesRepository } from './operational-repositories';
import { EquipmentRepository } from './operational-repositories';
import { AssignmentsRepository } from './operational-repositories';
import { ContractsRepository } from './operational-repositories';
import { InvoicesRepository } from './operational-repositories';
import { PaymentsRepository } from './operational-repositories';
import { ExpensesRepository } from './operational-repositories';
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

/**
 * Repository registry containing all repositories
 */
export class RepositoryRegistry {
  leads: LeadsRepository;
  services: ServicesRepository;
  equipment: EquipmentRepository;
  assignments: AssignmentsRepository;
  contracts: ContractsRepository;
  invoices: InvoicesRepository;
  payments: PaymentsRepository;
  expenses: ExpensesRepository;

  constructor(
    leads?: LeadRecord[],
    services?: ServiceRecord[],
    equipment?: EquipmentRecord[],
    assignments?: AssignmentRecord[],
    contracts?: ContractRecord[],
    invoices?: InvoiceRecord[],
    payments?: PaymentRecord[],
    expenses?: ExpenseRecord[],
  ) {
    this.leads = new LeadsRepository(leads);
    this.services = new ServicesRepository(services);
    this.equipment = new EquipmentRepository(equipment);
    this.assignments = new AssignmentsRepository(assignments);
    this.contracts = new ContractsRepository(contracts);
    this.invoices = new InvoicesRepository(invoices);
    this.payments = new PaymentsRepository(payments);
    this.expenses = new ExpensesRepository(expenses);
  }

  /**
   * Get repository by module name
   */
  getRepository(
    moduleName:
      | 'leads'
      | 'services'
      | 'equipment'
      | 'assignments'
      | 'contracts'
      | 'invoices'
      | 'payments'
      | 'expenses',
  ): any {
    return this[moduleName];
  }

  /**
   * Get all repositories as a map
   */
  getAll(): Record<string, any> {
    return {
      leads: this.leads,
      services: this.services,
      equipment: this.equipment,
      assignments: this.assignments,
      contracts: this.contracts,
      invoices: this.invoices,
      payments: this.payments,
      expenses: this.expenses,
    };
  }
}

/**
 * Create empty repository registry
 */
export function createEmptyRegistry(): RepositoryRegistry {
  return new RepositoryRegistry();
}

/**
 * Create repository registry from generated data
 */
export function createRegistryFromData(data: {
  leads: LeadRecord[];
  services: ServiceRecord[];
  equipment: EquipmentRecord[];
  assignments: AssignmentRecord[];
  contracts: ContractRecord[];
  invoices: InvoiceRecord[];
  payments: PaymentRecord[];
  expenses: ExpenseRecord[];
}): RepositoryRegistry {
  return new RepositoryRegistry(
    data.leads,
    data.services,
    data.equipment,
    data.assignments,
    data.contracts,
    data.invoices,
    data.payments,
    data.expenses,
  );
}
