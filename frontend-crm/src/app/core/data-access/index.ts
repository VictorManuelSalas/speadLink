/**
 * Data Access Layer - Main Export
 * Central hub for all data access functionality
 */

// ============================================================================
// MODELS
// ============================================================================

export * from './models/operational-records';

// ============================================================================
// GENERATORS
// ============================================================================

export {
  BaseGenerator,
  LeadsGenerator,
  ServicesGenerator,
  EquipmentGenerator,
  InvoicesGenerator,
  PaymentsGenerator,
  ContractsGenerator,
  AssignmentsGenerator,
  ExpensesGenerator,
  DataGenerator,
  GeneratorInstances,
} from './generators/index';

export type {
  DataGenerationConfig,
  GeneratedDataSet,
} from './generators/index';

// ============================================================================
// REPOSITORIES
// ============================================================================

export {
  BaseRepository,
  LeadsRepository,
  ServicesRepository,
  EquipmentRepository,
  AssignmentsRepository,
  ContractsRepository,
  InvoicesRepository,
  PaymentsRepository,
  ExpensesRepository,
  RepositoryRegistry,
  createEmptyRegistry,
  createRegistryFromData,
} from './repositories/index';

// ============================================================================
// SERVICES
// ============================================================================

export { OperationalDataService } from './services/operational-data.service';
export type { OperationalDataServiceConfig } from './services/operational-data.service';
export { DataInitializerService } from './services/data-initializer.service';

// ============================================================================
// UTILITIES
// ============================================================================

export { IdGenerator } from './utils/id-generator';
export { FakerHelpers } from './utils/faker-helpers';
export { DataRelationships } from './utils/data-relationships';
export { LookupMapper } from './utils/lookup-mapper';

export type { ValidationResult } from './utils/data-relationships';

// ============================================================================
// SEED DATA
// ============================================================================

export {
  createDevelopmentDataSet,
  createMinimalDataSet,
  createLargeDataSet,
  createCustomDataSet,
  SeedScenarios,
  seedApplicationData,
} from './seed-data';

// ============================================================================
// INJECTION TOKEN
// ============================================================================

export { CRM_DATA } from './crm-data';
export type { CrmDataAccess } from './crm-data';
