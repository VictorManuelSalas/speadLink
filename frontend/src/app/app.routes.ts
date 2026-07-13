import { Routes } from '@angular/router';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { OrganizationComponent } from './pages/organization/organization.component';
import { ComingSoonComponent } from './pages/coming-soon/coming-soon.component';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'settings/organization', component: OrganizationComponent },
  { path: 'settings/:section', component: ComingSoonComponent },
  { path: ':section', component: ComingSoonComponent },
  { path: '**', redirectTo: 'dashboard' }
];
