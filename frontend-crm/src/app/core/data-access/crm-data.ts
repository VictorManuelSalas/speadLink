import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { Customer, DashboardSummary } from '../models/customer';

export interface CrmDataAccess {
  getDashboard(): Observable<DashboardSummary>;
  getCustomers(): Observable<ReadonlyArray<Customer>>;
  getCustomer(id: string): Observable<Customer | undefined>;
}

export const CRM_DATA = new InjectionToken<CrmDataAccess>('CRM_DATA');
