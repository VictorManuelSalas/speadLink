import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CRM_DATA } from '../../core/data-access/crm-data';
import { Customer, CustomerStatus } from '../../core/models/customer';
import { StatusBadge } from '../../shared/status-badge';

@Component({
  selector: 'app-customers-page', imports: [CurrencyPipe, RouterLink, StatusBadge],
  template: `
    <header class="page-header"><div><div class="breadcrumbs"><span>CRM</span><b>›</b><span>Clientes</span></div><h1>Clientes</h1><p>Administra sus servicios, saldos y datos de contacto.</p></div><div class="page-header__actions"><button class="button">⇩ Exportar</button><button class="button button--primary">＋ Nuevo cliente</button></div></header>
    <section class="mini-stats"><div><span>Total de clientes</span><b>{{ customers().length }}</b><small>En esta vista mock</small></div><div><span>Activos</span><b>{{ activeCount() }}</b><small class="success">● Servicios operando</small></div><div><span>Saldo pendiente</span><b>{{ pendingBalance() | currency:'MXN':'symbol-narrow':'1.0-0':'es-MX' }}</b><small>Por cobrar</small></div></section>
    <section class="card customer-table-card">
      <div class="filterbar"><label class="table-search"><span>⌕</span><input #search type="search" placeholder="Buscar por nombre, teléfono o comunidad" (input)="query.set(search.value)" /></label><select #status aria-label="Filtrar por estado" (change)="statusFilter.set(asStatus(status.value))"><option value="all">Todos los estados</option><option value="active">Activos</option><option value="pending">Pendientes</option><option value="suspended">Suspendidos</option><option value="inactive">Inactivos</option></select><button class="button">☷ Filtros</button><span class="filterbar__count">{{ filtered().length }} resultados</span></div>
      @if (loading()) { <div class="table-loading">@for (row of [1,2,3,4,5]; track row) { <div class="skeleton"></div> }</div> }
      @else if (error()) { <div class="state-card"><h2>No pudimos cargar los clientes</h2><button class="button" (click)="load()">Reintentar</button></div> }
      @else if (filtered().length === 0) { <div class="state-card"><span>⌕</span><h2>Sin resultados</h2><p>Prueba con otra búsqueda o limpia los filtros.</p><button class="button" (click)="clearFilters(status)">Limpiar filtros</button></div> }
      @else {
        <div class="table-scroll"><table><thead><tr><th>Cliente</th><th>Estado</th><th>Plan</th><th>Mensualidad</th><th>Facturación</th><th>Saldo</th><th>Zona</th><th>Técnico</th><th aria-label="Acciones"></th></tr></thead><tbody>
          @for (customer of paginated(); track customer.id) { <tr><td><a class="customer-cell" [routerLink]="['/customers', customer.id]"><span class="avatar">{{ customer.initials }}</span><span><b>{{ customer.name }}</b><small>{{ customer.id }} · {{ customer.phone }}</small></span></a></td><td><app-status-badge [status]="customer.status" /></td><td><b class="normal">{{ customer.plan }}</b><small class="block">{{ customer.speed }}</small></td><td>{{ customer.monthlyFee | currency:'MXN':'symbol-narrow':'1.0-0':'es-MX' }}</td><td>Día {{ customer.billingDay }}</td><td><b [class.danger-text]="customer.currentBalance > 0">{{ customer.currentBalance | currency:'MXN':'symbol-narrow':'1.0-0':'es-MX' }}</b></td><td>{{ customer.community }}</td><td>{{ customer.technician }}</td><td><a class="icon-button" [routerLink]="['/customers', customer.id]" [attr.aria-label]="'Ver ' + customer.name">•••</a></td></tr> }
        </tbody></table></div>
        <footer class="pagination"><span>Mostrando {{ pageStart() }}–{{ pageEnd() }} de {{ filtered().length }}</span><div><button class="icon-button" [disabled]="page() === 1" (click)="page.set(page()-1)">‹</button><button class="page-number is-active">{{ page() }}</button><button class="icon-button" [disabled]="pageEnd() === filtered().length" (click)="page.set(page()+1)">›</button></div></footer>
      }
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomersPage {
  private readonly api=inject(CRM_DATA); readonly customers=signal<ReadonlyArray<Customer>>([]); readonly loading=signal(true); readonly error=signal(false); readonly query=signal(''); readonly statusFilter=signal<CustomerStatus|'all'>('all'); readonly page=signal(1); readonly pageSize=5;
  readonly filtered=computed(() => { const q=this.query().trim().toLocaleLowerCase('es-MX'); const status=this.statusFilter(); return this.customers().filter((c) => (status==='all'||c.status===status) && (!q||`${c.name} ${c.phone} ${c.community}`.toLocaleLowerCase('es-MX').includes(q))); });
  readonly paginated=computed(() => this.filtered().slice((this.page()-1)*this.pageSize, this.page()*this.pageSize)); readonly activeCount=computed(() => this.customers().filter((c)=>c.status==='active').length); readonly pendingBalance=computed(()=>this.customers().reduce((sum,c)=>sum+c.currentBalance,0)); readonly pageStart=computed(()=>this.filtered().length ? (this.page()-1)*this.pageSize+1 : 0); readonly pageEnd=computed(()=>Math.min(this.page()*this.pageSize,this.filtered().length));
  constructor(){this.load();} load():void{this.loading.set(true);this.api.getCustomers().subscribe({next:(data)=>{this.customers.set(data);this.loading.set(false);},error:()=>{this.error.set(true);this.loading.set(false);}});} asStatus(value:string):CustomerStatus|'all'{this.page.set(1);return ['active','inactive','pending','suspended','cancelled'].includes(value)?value as CustomerStatus:'all';} clearFilters(select:HTMLSelectElement):void{this.query.set('');this.statusFilter.set('all');select.value='all';}
}
