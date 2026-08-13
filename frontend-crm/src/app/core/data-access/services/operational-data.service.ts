/**
 * Operational Data Service
 * Centralized data service providing access to all operational modules
 * This service bridges repositories with the rest of the application
 * and can be easily swapped for API-based implementation
 */

import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, combineLatest } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';

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

import {
  RepositoryRegistry,
  createRegistryFromData,
  createEmptyRegistry,
} from '../repositories';

import {
  LeadsRepository,
  ServicesRepository,
  EquipmentRepository,
  AssignmentsRepository,
  ContractsRepository,
  InvoicesRepository,
  PaymentsRepository,
  ExpensesRepository,
} from '../repositories/operational-repositories';

import { DataGenerator } from '../generators';
import { DataRelationships } from '../utils/data-relationships';

/**
 * Service configuration
 */
export interface OperationalDataServiceConfig {
  useGeneratedData: boolean;
  generationConfig?: {
    leads: number;
    equipment: number;
    assignments: number;
    contracts: number;
    invoices: number;
    payments: number;
    expenses: number;
  };
}

@Injectable({
  providedIn: 'root',
})
export class OperationalDataService {
  private registry: RepositoryRegistry;
  private initialized$ = new BehaviorSubject<boolean>(false);
  private dataRelationships: DataRelationships | null = null;

  // ========================================================================
  // PUBLIC API - Module Repositories
  // ========================================================================

  get leads(): LeadsRepository {
    return this.registry.leads;
  }

  get services(): ServicesRepository {
    return this.registry.services;
  }

  get equipment(): EquipmentRepository {
    return this.registry.equipment;
  }

  get assignments(): AssignmentsRepository {
    return this.registry.assignments;
  }

  get contracts(): ContractsRepository {
    return this.registry.contracts;
  }

  get invoices(): InvoicesRepository {
    return this.registry.invoices;
  }

  get payments(): PaymentsRepository {
    return this.registry.payments;
  }

  get expenses(): ExpensesRepository {
    return this.registry.expenses;
  }

  constructor() {
    this.registry = createEmptyRegistry();
  }

  // ========================================================================
  // INITIALIZATION
  // ========================================================================

  /**
   * Initialize service with configuration
   */
  async initialize(config: OperationalDataServiceConfig): Promise<void> {
    try {
      if (config.useGeneratedData) {
        const generator = new DataGenerator();
        const generatedData = generator.generate({
          leads: config.generationConfig?.leads ?? 10,
          services: 1, // Handled by generator
          equipment: config.generationConfig?.equipment ?? 15,
          assignments: config.generationConfig?.assignments ?? 10,
          contracts: config.generationConfig?.contracts ?? 10,
          invoices: config.generationConfig?.invoices ?? 30,
          payments: config.generationConfig?.payments ?? 40,
          expenses: config.generationConfig?.expenses ?? 25,
          userId: 'usr-system-01',
          userName: 'Sistema',
        });

        this.registry = createRegistryFromData(generatedData);
        this.dataRelationships = this.createDataRelationships();

        // Validate data integrity
        const validation = this.dataRelationships.validateReferentialIntegrity();
        if (!validation.isValid) {
          console.warn('Data integrity issues found:', validation.errors);
        }
      } else {
        this.registry = createEmptyRegistry();
      }

      this.initialized$.next(true);
    } catch (error) {
      console.error('Failed to initialize OperationalDataService:', error);
      this.initialized$.next(false);
      throw error;
    }
  }

  /**
   * Check if service is initialized
   */
  isInitialized(): Observable<boolean> {
    return this.initialized$.asObservable();
  }

  // ========================================================================
  // DATA RELATIONSHIPS
  // ========================================================================

  /**
   * Get data relationships helper
   */
  getRelationships(): DataRelationships | null {
    return this.dataRelationships;
  }

  private createDataRelationships(): DataRelationships {
    return new DataRelationships({
      leads: new Map(this.registry.leads.getAllSync().map((r) => [r.id, r])),
      services: new Map(this.registry.services.getAllSync().map((r) => [r.id, r])),
      equipment: new Map(this.registry.equipment.getAllSync().map((r) => [r.id, r])),
      assignments: new Map(this.registry.assignments.getAllSync().map((r) => [r.id, r])),
      contracts: new Map(this.registry.contracts.getAllSync().map((r) => [r.id, r])),
      invoices: new Map(this.registry.invoices.getAllSync().map((r) => [r.id, r])),
      payments: new Map(this.registry.payments.getAllSync().map((r) => [r.id, r])),
      expenses: new Map(this.registry.expenses.getAllSync().map((r) => [r.id, r])),
      customers: new Map(), // TODO: Add customer data
    });
  }

  // ========================================================================
  // DASHBOARD & SUMMARY DATA
  // ========================================================================

  /**
   * Get dashboard summary statistics
   */
  getDashboardSummary(): Observable<{
    activeLeads: number;
    activeContracts: number;
    monthlyRecurringRevenue: number;
    pendingInvoices: number;
    overdueInvoices: number;
    unreceivedPayments: number;
    totalExpenses: number;
    availableEquipment: number;
  }> {
    return combineLatest([
      this.leads.getUnqualified().pipe(map((leads) => leads.length)),
      this.contracts.getActive().pipe(map((contracts) => contracts.length)),
      this.contracts.getTotalMonthlyRevenue(),
      this.invoices.getUnpaid().pipe(map((invoices) => invoices.length)),
      this.invoices.getOverdue().pipe(map((invoices) => invoices.length)),
      this.payments.data$.pipe(map((payments) => payments.length)),
      this.expenses.data$.pipe(map((expenses) => expenses.reduce((sum, e) => sum + e.amount, 0))),
      this.equipment.getAvailable().pipe(map((equipment) => equipment.length)),
    ]).pipe(
      map(
        ([
          activeLeads,
          activeContracts,
          mrr,
          pendingCount,
          overdueCount,
          paymentCount,
          totalExpenses,
          availableEq,
        ]) => ({
          activeLeads,
          activeContracts,
          monthlyRecurringRevenue: mrr,
          pendingInvoices: pendingCount,
          overdueInvoices: overdueCount,
          unreceivedPayments: paymentCount,
          totalExpenses,
          availableEquipment: availableEq,
        }),
      ),
      shareReplay(1),
    );
  }

  // ========================================================================
  // EXPORT & IMPORT
  // ========================================================================

  /**
   * Export all data as JSON
   */
  exportAllData(): string {
    const allRepositories = this.registry.getAll();
    const exportData: Record<string, any> = {};

    for (const [name, repo] of Object.entries(allRepositories)) {
      exportData[name] = repo.getAllSync();
    }

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Import all data from JSON
   */
  importAllData(json: string): boolean {
    try {
      const data = JSON.parse(json);
      const allRepositories = this.registry.getAll();

      for (const [name, repo] of Object.entries(allRepositories)) {
        if (data[name]) {
          repo.replaceAll(data[name]);
        }
      }

      // Rebuild relationships
      this.dataRelationships = this.createDataRelationships();
      return true;
    } catch (error) {
      console.error('Failed to import data:', error);
      return false;
    }
  }

  // ========================================================================
  // RESET & CLEAR
  // ========================================================================

  /**
   * Clear all data
   */
  clearAll(): void {
    const allRepositories = this.registry.getAll();
    for (const repo of Object.values(allRepositories)) {
      repo.clear();
    }
    this.dataRelationships = this.createDataRelationships();
  }

  /**
   * Reset to initial state
   */
  async reset(config: OperationalDataServiceConfig): Promise<void> {
    this.clearAll();
    await this.initialize(config);
  }
}
