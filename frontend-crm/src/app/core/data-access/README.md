# CRM Data Access Layer

Comprehensive data access layer for SpeedLink CRM with mock data generation, repositories, and services. Designed to be easily swappable with API-based implementation.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│  Application Components (UI, Services, etc.)                │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  OperationalDataService (Facade)                            │
│  - Centralized access point                                 │
│  - Module repositories as properties                        │
│  - Dashboard/summary data                                   │
│  - Import/export functionality                              │
└────────────────────┬────────────────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
        ▼            ▼            ▼
    Repositories  Generators   Relationships
    ────────────  ──────────   ─────────────
    - Base        - Base       - Validation
    - Typed       - Typed      - Queries
    - Domain      - Batch      - Cascades
    queries       operations


│
└─── Data Models (TypeScript Interfaces)
│
└─── Utilities (ID Generator, Faker, Relationships)
```

## Directory Structure

```
data-access/
├── models/
│   └── operational-records.ts          # All record type definitions
├── generators/
│   ├── base-generator.ts              # Abstract base class
│   ├── leads-generator.ts             # Lead data generation
│   ├── services-generator.ts          # Service data generation
│   ├── equipment-generator.ts         # Equipment data generation
│   ├── invoices-payments-generator.ts # Billing data generation
│   ├── other-modules-generator.ts     # Contracts, Assignments, Expenses
│   └── index.ts                       # Generator exports & orchestrator
├── repositories/
│   ├── base-repository.ts             # Generic CRUD operations
│   ├── operational-repositories.ts    # Module-specific repositories
│   └── index.ts                       # Repository registry & factory
├── services/
│   └── operational-data.service.ts    # Main service facade
├── utils/
│   ├── id-generator.ts               # ID generation utilities
│   ├── faker-helpers.ts              # Realistic data generation
│   └── data-relationships.ts         # Relationship management
├── seed-data.ts                      # Pre-configured datasets
└── crm-data.ts                       # DI token (existing)
```

## Key Concepts

### 1. Models (operational-records.ts)

Define all record types with proper TypeScript interfaces:

```typescript
interface LeadRecord extends BaseOperationalRecord {
  name: string;
  email: string;
  phone: string;
  type: 'Hogar' | 'Negocio';
  status: LeadStatus;
  // ...
}
```

**Features:**
- Type-safe record definitions
- Extends `BaseOperationalRecord` for audit fields
- Enum types for status, methods, categories
- Proper relationships via foreign keys

### 2. Generators

Create realistic test data with relationships:

```typescript
const generator = new DataGenerator();
const data = generator.generate({
  leads: 10,
  equipment: 20,
  invoices: 50,
  payments: 100,
  // ...
});
```

**Generators:**
- **BaseGenerator**: Abstract base with audit field handling
- **LeadsGenerator**: Creates prospects with conversion capability
- **ServicesGenerator**: Internet plans and add-ons
- **EquipmentGenerator**: Network equipment with assignments
- **InvoicesGenerator**: Billing records with relationships
- **PaymentsGenerator**: Payment records linked to invoices
- **ContractsGenerator**: Service agreements
- **AssignmentsGenerator**: Equipment-to-customer mapping
- **ExpensesGenerator**: Operating costs

**Features:**
- Seeded randomization for reproducibility
- Realistic data (names, addresses, phone numbers)
- Status distribution (weighted random selection)
- Relationship injection (IDs linking records)

### 3. Repositories

Generic CRUD operations with domain-specific queries:

```typescript
const leads = this.registry.leads.getUnqualified();
const invoices = this.registry.invoices.getOverdue();
const revenue = this.registry.contracts.getTotalMonthlyRevenue();
```

**BaseRepository Features:**
- Observable-based API (RxJS)
- Synchronous methods (Sync suffix)
- Filter, search, count operations
- Add, update, delete (soft & hard)
- Batch operations
- JSON import/export

**Module Repositories:**
- **LeadsRepository**: Status/source filtering, conversion tracking
- **ServicesRepository**: Type and price-based queries
- **EquipmentRepository**: Status, customer, brand filtering
- **AssignmentsRepository**: Active/returned tracking, equipment validation
- **ContractsRepository**: Revenue calculations, status filters
- **InvoicesRepository**: Overdue detection, revenue summaries
- **PaymentsRepository**: Payment tracking, date ranges
- **ExpensesRepository**: Category analysis, expense summaries

### 4. Relationships

Manage inter-module dependencies and cascading operations:

```typescript
const relationships = this.dataService.getRelationships();
const customerInvoices = relationships.getCustomerInvoices(customerId);
const totalPaid = relationships.getInvoicePaidAmount(invoiceId);
```

**Features:**
- Referential integrity validation
- Relationship queries (N:1, 1:N, M:N)
- Cascade operations (update invoice on payment)
- Revenue/expense calculations
- Overdue detection

### 5. Service (OperationalDataService)

Centralized facade providing access to all repositories:

```typescript
@Injectable()
export class OperationalDataService {
  leads: LeadsRepository;
  services: ServicesRepository;
  equipment: EquipmentRepository;
  invoices: InvoicesRepository;
  payments: PaymentsRepository;
  // ...
}
```

**Initialization:**
```typescript
const service = inject(OperationalDataService);
await service.initialize({
  useGeneratedData: true,
  generationConfig: {
    leads: 10,
    invoices: 50,
    payments: 100,
  }
});
```

## Usage Examples

### Example 1: Basic Data Access

```typescript
import { OperationalDataService } from '@core/data-access';

constructor(private dataService: OperationalDataService) {}

getLeads() {
  return this.dataService.leads.getAll();
}

getCustomerInvoices(customerId: string) {
  return this.dataService.invoices.getByCustomer(customerId);
}
```

### Example 2: Dashboard Summary

```typescript
getDashboard() {
  return this.dataService.getDashboardSummary();
}

// Returns:
// {
//   activeLeads: 8,
//   monthlyRecurringRevenue: 45000,
//   pendingInvoices: 12,
//   totalExpenses: 15000,
//   // ...
// }
```

### Example 3: Custom Queries with Relationships

```typescript
async getCustomerFinancialSummary(customerId: string) {
  const relationships = this.dataService.getRelationships();
  
  const invoices = relationships.getCustomerInvoices(customerId);
  const totalInvoiced = invoices.reduce((sum, i) => sum + i.total, 0);
  
  const payments = relationships.getCustomerPayments(customerId);
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  
  return {
    totalInvoiced,
    totalPaid,
    balance: totalInvoiced - totalPaid,
  };
}
```

### Example 4: Data Generation & Seeding

```typescript
import { seedApplicationData } from '@core/data-access/seed-data';

// Initialize with development data
await seedApplicationData(this.dataService, 'development');

// Or with custom configuration
await seedApplicationData(this.dataService, 'custom', {
  leads: 20,
  invoices: 100,
  payments: 150,
});
```

## Switching to API Implementation

When ready to use real API:

1. **Create API service implementing same interface:**

```typescript
@Injectable()
export class OperationalApiService extends OperationalDataService {
  constructor(private http: HttpClient) {
    super();
  }

  async initialize(config: OperationalDataServiceConfig): Promise<void> {
    // Fetch from API instead of generating
    const data = await this.http.get('/api/operational-data').toPromise();
    this.registry = createRegistryFromData(data);
  }
}
```

2. **Update provider in app.config.ts:**

```typescript
providers: [
  {
    provide: OperationalDataService,
    useClass: OperationalApiService,
  },
]
```

3. **No other code changes needed** - Service interface remains the same!

## Data Generation Features

### Seeded Randomization

All data generation is deterministic with seeds for reproducible tests:

```typescript
const generator = new DataGenerator();
FakerHelpers.reset(12345); // Same seed = same data every time
```

### Realistic Data

- Full names from person/company name pools
- Email addresses based on names
- Phone numbers with realistic formatting
- Geographic coordinates (around Monterrey, Mexico)
- Equipment brands and models
- Currency amounts with proper decimals
- Weighted status distributions

### Relationship Injection

Generators automatically inject relationships:

```typescript
// Invoices reference correct customer IDs
const invoice = invoicesGen.generate(0);
// invoice.clientId = 'SL-1040'

// Payments reference correct invoices
const payment = paymentsGen.generate(0);
// payment.invoiceId = 'INV-4480', payment.clientId = 'SL-1040'
```

## Performance Considerations

### In-Memory Repositories

Current implementation keeps all data in memory for fast operations:

- **Pros**: No latency, instant filtering, good for development
- **Cons**: Limited to ~10K records per module

### Optimization for Large Datasets

For performance testing:

```typescript
// Use createLargeDataSet() which generates 1000+ records
const registry = createLargeDataSet();

// Or generate selectively
const data = generator.generate({
  invoices: 1000,
  payments: 2000,
  // other modules as needed
});
```

### Future API Migration

When using real API, implement pagination:

```typescript
getInvoices(page: number = 1, pageSize: number = 50) {
  return this.http.get('/api/invoices', {
    params: { page, pageSize }
  });
}
```

## Testing

### Unit Tests with Mock Data

```typescript
beforeEach(() => {
  const registry = createMinimalDataSet();
  TestBed.configureTestingModule({
    providers: [
      {
        provide: OperationalDataService,
        useValue: {
          leads: registry.leads,
          invoices: registry.invoices,
          // ...
        },
      },
    ],
  });
});
```

### Integration Tests

```typescript
it('should calculate correct financial summary', fakeAsync(async () => {
  const service = TestBed.inject(OperationalDataService);
  await service.initialize({
    useGeneratedData: true,
    generationConfig: { invoices: 10, payments: 15 },
  });

  const summary = await service.getDashboardSummary().toPromise();
  expect(summary.pendingInvoices).toBeLessThan(10);
}));
```

## Troubleshooting

### Data Integrity Errors

Check validation results during initialization:

```typescript
const relationships = this.dataService.getRelationships();
const validation = relationships.validateReferentialIntegrity();

if (!validation.isValid) {
  console.error('Validation errors:', validation.errors);
}
```

### Performance Issues

Profile repository operations:

```typescript
console.time('getCustomerInvoices');
const invoices = this.dataService.invoices.getByCustomer(customerId).toPromise();
console.timeEnd('getCustomerInvoices');
```

## Contributing

When adding new modules:

1. Add model interface to `operational-records.ts`
2. Create generator in `generators/`
3. Create repository in `repositories/operational-repositories.ts`
4. Add to `RepositoryRegistry` in `repositories/index.ts`
5. Update `DataRelationships` for integrity checks
6. Export from service

---

**Status**: Ready for development. Designed for easy transition to API backend.
