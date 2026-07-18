import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CRM_DATA } from '../../core/data-access/crm-data';
import { DashboardSummary } from '../../core/models/customer';
import { KpiCard } from '../../shared/kpi-card';

@Component({
  selector: 'app-dashboard-page', imports: [CurrencyPipe, DecimalPipe, RouterLink, KpiCard],
  template: `
    <header class="page-header"><div><div class="breadcrumbs"><span>SpeedLink CRM</span><b>›</b><span>Dashboard</span></div><h1>Buenos días, Andrea</h1><p>Este es el resumen de tu operación hoy, 14 de julio.</p></div><div class="page-header__actions"><button class="button">⇩ Exportar</button><a class="button button--primary" routerLink="/customers">＋ Nuevo cliente</a></div></header>
    @if (loading()) { <div class="kpi-grid">@for (item of skeletons; track item) { <div class="card skeleton kpi-skeleton"></div> }</div><div class="card skeleton chart-skeleton"></div> }
    @else if (error()) { <section class="state-card"><span>!</span><h2>No pudimos cargar el dashboard</h2><button class="button button--primary" (click)="load()">Reintentar</button></section> }
    @else if (data(); as dashboard) {
      <section class="kpi-grid">
        <app-kpi-card label="Clientes activos" [value]="dashboard.activeCustomers" icon="♙" trend="+3.8%" note="46 nuevos este mes" />
        <app-kpi-card label="Ingreso mensual recurrente" [value]="dashboard.monthlyRecurringRevenue" icon="$" trend="+5.4%" note="vs. mes anterior" tone="green" [currency]="true" />
        <app-kpi-card label="Facturas pendientes" [value]="dashboard.pendingInvoices" icon="▤" trend="−8.2%" note="23 están vencidas" tone="amber" />
        <app-kpi-card label="Pagos recibidos hoy" [value]="dashboard.paymentsToday" icon="✓" trend="+12.6%" note="52 movimientos" tone="violet" [currency]="true" />
      </section>
      <section class="dashboard-grid">
        <article class="card revenue-card">
          <div class="card-heading"><div><h2>Ingresos recurrentes</h2><p>Últimos 12 meses · miles de MXN</p></div><span class="chip">Mensual⌄</span></div>
          <div class="revenue-total"><strong>{{ dashboard.monthlyRecurringRevenue | currency:'MXN':'symbol-narrow':'1.0-0':'es-MX' }}</strong><span>↑ 5.4%</span></div>
          <div class="bar-chart" role="img" aria-label="Ingresos crecientes durante los últimos 12 meses">
            @for (point of dashboard.revenue; track point.month) { <div class="bar-chart__item"><div class="bar" [style.height.%]="barHeight(point.value)"><span>{{ point.value }}</span></div><small>{{ point.month }}</small></div> }
          </div>
        </article>
        <article class="card plan-card">
          <div class="card-heading"><div><h2>Distribución de planes</h2><p>{{ dashboard.activeCustomers | number:'1.0-0':'es-MX' }} servicios activos</p></div><button class="icon-button">•••</button></div>
          <div class="donut" role="img" aria-label="Distribución: 44 por ciento Intermedio, 34 por ciento Básico y 22 por ciento Custom"><div><strong>1,248</strong><small>Total</small></div></div>
          <div class="legend">@for (plan of dashboard.planDistribution; track plan.name) { <div><i [style.background]="plan.color"></i><span>{{ plan.name }}</span><b>{{ plan.customers }}</b></div> }</div>
        </article>
      </section>
      <section class="lower-grid">
        <article class="card activity-card"><div class="card-heading"><div><h2>Actividad reciente</h2><p>Actualizaciones de la operación</p></div><button class="link-button">Ver toda</button></div><div class="activity-list">@for (activity of dashboard.recentActivity; track activity.title + activity.time) { <div class="activity"><span class="activity__icon activity__icon--{{ activity.tone }}">•</span><span><b>{{ activity.title }}</b><small>{{ activity.detail }}</small></span><time>{{ activity.time }}</time></div> }</div></article>
        <article class="card operations-card"><div class="card-heading"><div><h2>Operación de hoy</h2><p>Elementos que necesitan atención</p></div></div><div class="operation"><span class="kpi__icon kpi__icon--blue">⌂</span><span><b>{{ dashboard.scheduledInstallations }}</b><small>Instalaciones programadas</small></span><em>Ver agenda →</em></div><div class="operation"><span class="kpi__icon kpi__icon--amber">!</span><span><b>{{ dashboard.openTickets }}</b><small>Tickets de soporte abiertos</small></span><em>Revisar →</em></div><div class="operation"><span class="kpi__icon kpi__icon--green">▣</span><span><b>{{ dashboard.availableEquipment }}</b><small>Equipos disponibles</small></span><em>Inventario →</em></div></article>
      </section>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPage {
  private readonly api = inject(CRM_DATA);
  readonly data = signal<DashboardSummary | null>(null); readonly loading = signal(true); readonly error = signal(false); readonly skeletons = [1,2,3,4];
  readonly maxRevenue = computed(() => Math.max(...(this.data()?.revenue.map((point) => point.value) ?? [1])));
  constructor() { this.load(); }
  load(): void { this.loading.set(true); this.error.set(false); this.api.getDashboard().subscribe({ next: (data) => { this.data.set(data); this.loading.set(false); }, error: () => { this.error.set(true); this.loading.set(false); } }); }
  barHeight(value: number): number { return Math.round((value / this.maxRevenue()) * 100); }
}
