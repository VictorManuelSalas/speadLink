/**
 * Seed Data Factory
 * Provides pre-configured datasets for development and testing
 */

import { DataGenerator } from './generators';
import { RepositoryRegistry, createRegistryFromData } from './repositories';

/**
 * Development dataset with realistic data
 */
export function createDevelopmentDataSet(): RepositoryRegistry {
  const generator = new DataGenerator();
  const data = generator.generate({
    leads: 15,
    services: 1, // Handled by generator
    equipment: 20,
    assignments: 12,
    contracts: 10,
    invoices: 40,
    payments: 50,
    expenses: 35,
    userId: 'usr-system-01',
    userName: 'Sistema',
  });

  return createRegistryFromData(data);
}

/**
 * Minimal dataset for quick testing
 */
export function createMinimalDataSet(): RepositoryRegistry {
  const generator = new DataGenerator();
  const data = generator.generate({
    leads: 3,
    services: 1,
    equipment: 5,
    assignments: 3,
    contracts: 3,
    invoices: 5,
    payments: 5,
    expenses: 5,
    userId: 'usr-system-01',
    userName: 'Sistema',
  });

  return createRegistryFromData(data);
}

/**
 * Large dataset for performance testing
 */
export function createLargeDataSet(): RepositoryRegistry {
  const generator = new DataGenerator();
  const data = generator.generate({
    leads: 100,
    services: 1,
    equipment: 200,
    assignments: 150,
    contracts: 100,
    invoices: 500,
    payments: 1000,
    expenses: 300,
    userId: 'usr-system-01',
    userName: 'Sistema',
  });

  return createRegistryFromData(data);
}

/**
 * Custom dataset with specified counts
 */
export function createCustomDataSet(config: {
  leads?: number;
  equipment?: number;
  assignments?: number;
  contracts?: number;
  invoices?: number;
  payments?: number;
  expenses?: number;
}): RepositoryRegistry {
  const generator = new DataGenerator();
  const data = generator.generate({
    leads: config.leads ?? 10,
    services: 1,
    equipment: config.equipment ?? 15,
    assignments: config.assignments ?? 10,
    contracts: config.contracts ?? 10,
    invoices: config.invoices ?? 30,
    payments: config.payments ?? 40,
    expenses: config.expenses ?? 25,
    userId: 'usr-system-01',
    userName: 'Sistema',
  });

  return createRegistryFromData(data);
}

/**
 * Seed data for specific testing scenarios
 */
export const SeedScenarios = {
  /**
   * Scenario: Customer with unpaid invoices
   */
  unpaidInvoices: () => {
    const registry = createMinimalDataSet();
    // TODO: Customize for unpaid scenario
    return registry;
  },

  /**
   * Scenario: Complete customer lifecycle
   */
  customerLifecycle: () => {
    const registry = createDevelopmentDataSet();
    // TODO: Customize for lifecycle scenario
    return registry;
  },

  /**
   * Scenario: Equipment inventory
   */
  equipmentInventory: () => {
    const generator = new DataGenerator();
    const data = generator.generate({
      leads: 0,
      services: 1,
      equipment: 100,
      assignments: 50,
      contracts: 0,
      invoices: 0,
      payments: 0,
      expenses: 0,
      userId: 'usr-system-01',
      userName: 'Sistema',
    });
    return createRegistryFromData(data);
  },

  /**
   * Scenario: Financial analysis
   */
  financialAnalysis: () => {
    const generator = new DataGenerator();
    const data = generator.generate({
      leads: 0,
      services: 1,
      equipment: 0,
      assignments: 0,
      contracts: 50,
      invoices: 200,
      payments: 300,
      expenses: 100,
      userId: 'usr-system-01',
      userName: 'Sistema',
    });
    return createRegistryFromData(data);
  },
};

/**
 * Export seed function to initialize app with data
 */
export async function seedApplicationData(
  dataService: any,
  scenario: 'development' | 'minimal' | 'large' | 'custom' = 'development',
  customConfig?: Parameters<typeof createCustomDataSet>[0],
): Promise<void> {
  let config: any;

  switch (scenario) {
    case 'minimal':
      config = { useGeneratedData: true, generationConfig: {} };
      break;
    case 'large':
      config = { useGeneratedData: true, generationConfig: {} };
      break;
    case 'custom':
      config = { useGeneratedData: true, generationConfig: customConfig };
      break;
    case 'development':
    default:
      config = { useGeneratedData: true, generationConfig: {} };
  }

  await dataService.initialize(config);
}
