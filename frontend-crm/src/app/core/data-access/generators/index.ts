/**
 * Data Generators Index
 * Central export point for all data generators
 */

export { BaseGenerator } from './base-generator';
export { LeadsGenerator } from './leads-generator';
export { ServicesGenerator } from './services-generator';
export { EquipmentGenerator } from './equipment-generator';
export { InvoicesGenerator, PaymentsGenerator } from './invoices-payments-generator';
export { ContractsGenerator, AssignmentsGenerator, ExpensesGenerator } from './other-modules-generator';

// ============================================================================
// DATA GENERATION ORCHESTRATOR
// ============================================================================

import { LeadsGenerator } from './leads-generator';
import { ServicesGenerator } from './services-generator';
import { EquipmentGenerator } from './equipment-generator';
import { InvoicesGenerator, PaymentsGenerator } from './invoices-payments-generator';
import { ContractsGenerator, AssignmentsGenerator, ExpensesGenerator } from './other-modules-generator';
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
 * Comprehensive data generation configuration
 */
export interface DataGenerationConfig {
  // Operational counts
  leads: number;
  services: number;
  equipment: number;
  assignments: number;
  contracts: number;
  invoices: number;
  payments: number;
  expenses: number;

  // Seed for consistent randomization
  seed?: number;

  // User context
  userId?: string;
  userName?: string;
}

export interface GeneratedDataSet {
  leads: LeadRecord[];
  services: ServiceRecord[];
  equipment: EquipmentRecord[];
  assignments: AssignmentRecord[];
  contracts: ContractRecord[];
  invoices: InvoiceRecord[];
  payments: PaymentRecord[];
  expenses: ExpenseRecord[];
}

/**
 * Data generation orchestrator
 * Generates all data with proper relationships
 */
export class DataGenerator {
  private leadsGen = new LeadsGenerator();
  private servicesGen = new ServicesGenerator();
  private equipmentGen = new EquipmentGenerator();
  private assignmentsGen = new AssignmentsGenerator();
  private contractsGen = new ContractsGenerator();
  private invoicesGen = new InvoicesGenerator();
  private paymentsGen = new PaymentsGenerator();
  private expensesGen = new ExpensesGenerator();

  /**
   * Generate complete dataset with relationships
   */
  generate(config: DataGenerationConfig): GeneratedDataSet {
    // Set user context if provided
    if (config.userId && config.userName) {
      this.leadsGen.setUserContext(config.userId, config.userName);
      this.servicesGen.setUserContext(config.userId, config.userName);
      this.equipmentGen.setUserContext(config.userId, config.userName);
      this.assignmentsGen.setUserContext(config.userId, config.userName);
      this.contractsGen.setUserContext(config.userId, config.userName);
      this.invoicesGen.setUserContext(config.userId, config.userName);
      this.paymentsGen.setUserContext(config.userId, config.userName);
      this.expensesGen.setUserContext(config.userId, config.userName);
    }

    // Generate all data
    const leads = this.leadsGen.generateMultiple(config.leads);
    const services = this.servicesGen.generateStandard(); // Always generate standard services
    const equipment = this.equipmentGen.generateMultiple(config.equipment);
    // Las asignaciones referencian equipo real del inventario recién generado.
    this.assignmentsGen.setEquipmentPool(equipment);
    const assignments = this.assignmentsGen.generateMultiple(config.assignments);
    // El equipo asignado deja de estar disponible.
    const assignedIds = new Set(assignments.filter((a) => a.status === 'ACTIVE').map((a) => a.equipmentId));
    equipment.forEach((unit) => {
      if (assignedIds.has(unit.id) && unit.status === 'AVAILABLE') unit.status = 'ASSIGNED';
    });
    // Los contratos referencian servicios reales del catálogo recién generado.
    this.contractsGen.setServiceCatalog(services);
    const contracts = this.contractsGen.generateMultiple(config.contracts);
    const invoices = this.invoicesGen.generateMultiple(config.invoices);
    const payments = this.paymentsGen.generateBatch(config.payments);
    const expenses = this.expensesGen.generateMultiple(config.expenses);

    return {
      leads,
      services,
      equipment,
      assignments,
      contracts,
      invoices,
      payments,
      expenses,
    };
  }

  /**
   * Generate recommended dataset for development
   */
  generateRecommended(): GeneratedDataSet {
    return this.generate({
      leads: 10,
      services: 1, // Will be overridden by generateStandard()
      equipment: 15,
      assignments: 10,
      contracts: 10,
      invoices: 30,
      payments: 40,
      expenses: 25,
      userId: 'usr-system-01',
      userName: 'Sistema',
    });
  }
}

/**
 * Get generator instances by type
 */
export const GeneratorInstances = {
  leads: () => new LeadsGenerator(),
  services: () => new ServicesGenerator(),
  equipment: () => new EquipmentGenerator(),
  assignments: () => new AssignmentsGenerator(),
  contracts: () => new ContractsGenerator(),
  invoices: () => new InvoicesGenerator(),
  payments: () => new PaymentsGenerator(),
  expenses: () => new ExpensesGenerator(),
};
