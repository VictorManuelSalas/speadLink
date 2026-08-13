# Data Access Layer Integration Guide

This guide shows how to integrate the new data access layer with your Angular application.

## Step 1: Update App Configuration

In `app.config.ts`, add the `OperationalDataService` provider:

```typescript
import { ApplicationConfig } from '@angular/core';
import { OperationalDataService } from '@core/data-access';

export const appConfig: ApplicationConfig = {
  providers: [
    // ... other providers
    OperationalDataService,
  ],
};
```

## Step 2: Initialize Service in App Component

In your root component or initialization service:

```typescript
import { Component, OnInit } from '@angular/core';
import { OperationalDataService } from '@core/data-access';

@Component({
  selector: 'app-root',
  template: `<router-outlet></router-outlet>`,
})
export class AppComponent implements OnInit {
  constructor(private dataService: OperationalDataService) {}

  ngOnInit() {
    // Initialize with generated data
    this.dataService.initialize({
      useGeneratedData: true,
      generationConfig: {
        leads: 15,
        equipment: 20,
        assignments: 12,
        contracts: 10,
        invoices: 40,
        payments: 50,
        expenses: 35,
      },
    });
  }
}
```

Or create an initialization service:

```typescript
import { Injectable } from '@angular/core';
import { OperationalDataService } from '@core/data-access';

@Injectable({
  providedIn: 'root',
})
export class DataInitializationService {
  constructor(private dataService: OperationalDataService) {}

  async initialize(): Promise<void> {
    await this.dataService.initialize({
      useGeneratedData: true,
      generationConfig: {
        leads: 15,
        equipment: 20,
        assignments: 12,
        contracts: 10,
        invoices: 40,
        payments: 50,
        expenses: 35,
      },
    });
  }
}
```

Then call it in your main:

```typescript
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';
import { DataInitializationService } from '@core/data-access';

bootstrapApplication(AppComponent, appConfig)
  .then((componentRef) => {
    const initService = componentRef.injector.get(DataInitializationService);
    return initService.initialize();
  })
  .catch((err) => console.error(err));
```

## Step 3: Use in Components and Services

### In a Dashboard Component

```typescript
import { Component, OnInit } from '@angular/core';
import { OperationalDataService } from '@core/data-access';

@Component({
  selector: 'app-dashboard',
  template: `
    <div class="dashboard">
      <h1>CRM Dashboard</h1>
      <div *ngIf="summary$ | async as summary">
        <p>Active Leads: {{ summary.activeLeads }}</p>
        <p>Monthly Revenue: {{ summary.monthlyRecurringRevenue | currency }}</p>
        <p>Pending Invoices: {{ summary.pendingInvoices }}</p>
      </div>
    </div>
  `,
})
export class DashboardComponent {
  summary$ = this.dataService.getDashboardSummary();

  constructor(private dataService: OperationalDataService) {}
}
```

### In a Leads Module Service

```typescript
import { Injectable } from '@angular/core';
import { OperationalDataService } from '@core/data-access';

@Injectable({
  providedIn: 'root',
})
export class LeadsService {
  constructor(private dataService: OperationalDataService) {}

  getAllLeads() {
    return this.dataService.leads.getAll();
  }

  getUnqualifiedLeads() {
    return this.dataService.leads.getUnqualified();
  }

  getLeadById(id: string) {
    return this.dataService.leads.getById(id);
  }

  createLead(lead: any) {
    return this.dataService.leads.add(lead);
  }

  updateLead(id: string, changes: any) {
    return this.dataService.leads.update(id, changes);
  }
}
```

### In an Invoices Component

```typescript
import { Component } from '@angular/core';
import { OperationalDataService } from '@core/data-access';

@Component({
  selector: 'app-invoices',
  template: `
    <div>
      <h1>Invoices</h1>
      <div *ngFor="let invoice of invoices$ | async">
        <p>{{ invoice.folio }} - {{ invoice.total | currency }}</p>
      </div>
    </div>
  `,
})
export class InvoicesComponent {
  invoices$ = this.dataService.invoices.getAll();

  constructor(private dataService: OperationalDataService) {}

  getCustomerInvoices(customerId: string) {
    return this.dataService.invoices.getByCustomer(customerId);
  }

  getOverdueInvoices() {
    return this.dataService.invoices.getOverdue();
  }
}
```

## Step 4: Migration Path to API

### Current (Mock Data)

```typescript
await this.dataService.initialize({
  useGeneratedData: true,
});
```

### Future (API)

When your API is ready, create an API service:

```typescript
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { OperationalDataService, OperationalDataServiceConfig } from '@core/data-access';

@Injectable({
  providedIn: 'root',
})
export class OperationalApiService extends OperationalDataService {
  constructor(private http: HttpClient) {
    super();
  }

  override async initialize(config: OperationalDataServiceConfig): Promise<void> {
    try {
      // Fetch all data from API
      const [leads, services, equipment, assignments, contracts, invoices, payments, expenses] =
        await Promise.all([
          this.http.get('/api/leads').toPromise(),
          this.http.get('/api/services').toPromise(),
          this.http.get('/api/equipment').toPromise(),
          this.http.get('/api/assignments').toPromise(),
          this.http.get('/api/contracts').toPromise(),
          this.http.get('/api/invoices').toPromise(),
          this.http.get('/api/payments').toPromise(),
          this.http.get('/api/expenses').toPromise(),
        ]);

      const { createRegistryFromData } = await import('@core/data-access');
      this.registry = createRegistryFromData({
        leads,
        services,
        equipment,
        assignments,
        contracts,
        invoices,
        payments,
        expenses,
      } as any);

      this.initialized$.next(true);
    } catch (error) {
      console.error('Failed to initialize from API:', error);
      this.initialized$.next(false);
      throw error;
    }
  }
}
```

Then update the provider:

```typescript
// app.config.ts
import { OperationalApiService } from '@core/data-access/services/operational-api.service';

export const appConfig: ApplicationConfig = {
  providers: [
    {
      provide: OperationalDataService,
      useClass: OperationalApiService,
    },
    // ... other providers
  ],
};
```

**No other code changes needed!** All components continue using the same service interface.

## Step 5: Testing

### Unit Tests with Mock Data

```typescript
import { TestBed } from '@angular/core/testing';
import { OperationalDataService, createMinimalDataSet } from '@core/data-access';

describe('LeadsService', () => {
  let service: LeadsService;
  let dataService: OperationalDataService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [LeadsService],
    });

    dataService = TestBed.inject(OperationalDataService);
    service = TestBed.inject(LeadsService);

    // Initialize with minimal test data
    const registry = createMinimalDataSet();
    dataService.invoices.replaceAll(registry.leads.getAllSync());
  });

  it('should get all leads', (done) => {
    service.getAllLeads().subscribe((leads) => {
      expect(leads.length).toBeGreaterThan(0);
      done();
    });
  });
});
```

### Integration Tests

```typescript
describe('Dashboard Integration', () => {
  let component: DashboardComponent;
  let dataService: OperationalDataService;

  beforeEach(async () => {
    await TestBed.configureTestingAsync();
    component = TestBed.createComponent(DashboardComponent).componentInstance;
    dataService = TestBed.inject(OperationalDataService);

    await dataService.initialize({
      useGeneratedData: true,
      generationConfig: {
        leads: 10,
        invoices: 20,
        payments: 30,
      },
    });
  });

  it('should display dashboard summary', (done) => {
    component.summary$.subscribe((summary) => {
      expect(summary.monthlyRecurringRevenue).toBeGreaterThan(0);
      expect(summary.pendingInvoices).toBeGreaterThanOrEqual(0);
      done();
    });
  });
});
```

## Step 6: Environment Configuration

Create different initialization configs for different environments:

```typescript
// environments/environment.development.ts
export const environment = {
  production: false,
  dataSource: 'generated',
  dataConfig: {
    leads: 20,
    equipment: 30,
    invoices: 50,
    payments: 100,
  },
};

// environments/environment.production.ts
export const environment = {
  production: true,
  dataSource: 'api',
  apiUrl: 'https://api.speedlink.mx',
};
```

Then use in initialization:

```typescript
import { environment } from '@environments/environment';

async ngOnInit() {
  if (environment.dataSource === 'generated') {
    await this.dataService.initialize({
      useGeneratedData: true,
      generationConfig: environment.dataConfig,
    });
  }
}
```

## Common Patterns

### Pattern 1: Get and Display Data

```typescript
// Component
leads$ = this.dataService.leads.getAll();

// Template
<div *ngFor="let lead of leads$ | async">
  {{ lead.name }}
</div>
```

### Pattern 2: Filter with Custom Logic

```typescript
// Service
getHighValueLeads() {
  return this.dataService.leads.getQualified().pipe(
    map(leads => leads.filter(l => l.source === 'Referido'))
  );
}
```

### Pattern 3: Combine Data from Multiple Modules

```typescript
getCustomerFullProfile(customerId: string) {
  return combineLatest([
    this.dataService.equipment.getByCustomer(customerId),
    this.dataService.invoices.getByCustomer(customerId),
    this.dataService.contracts.getByCustomer(customerId),
  ]).pipe(
    map(([equipment, invoices, contracts]) => ({
      equipment,
      invoices,
      contracts,
    }))
  );
}
```

### Pattern 4: Real-time Updates

```typescript
// Subscribe to live updates
this.dataService.leads.getAll().subscribe(leads => {
  console.log('Leads updated:', leads);
});

// Create new lead
this.dataService.leads.add(newLead);
// Subscribers automatically notified
```

## Next Steps

1. ✅ Integrate into app.config.ts
2. ✅ Initialize in app component or service
3. ✅ Start using repositories in components/services
4. ✅ Create API service implementation when API is ready
5. ✅ Switch provider without changing business logic

---

**Remember**: The data access layer is designed to be transparent. Your components and services don't care whether data comes from mock generators or real APIs - the interface is the same!
