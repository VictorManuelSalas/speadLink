import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CRM_DATA } from '../../core/data-access/crm-data';
import { LanguageService } from '../../core/i18n/language.service';
import { DashboardSummary } from '../../core/models/customer';
import { KpiCard } from '../../shared/kpi-card';

@Component({
  selector: 'app-dashboard-page',
  imports: [CurrencyPipe, DecimalPipe, RouterLink, KpiCard],
  templateUrl: './dashboard-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPage {
  readonly i18n = inject(LanguageService);
  private readonly api = inject(CRM_DATA);
  readonly data = signal<DashboardSummary | null>(null);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly skeletons = [1, 2, 3, 4];
  readonly maxRevenue = computed(() =>
    Math.max(...(this.data()?.revenue.map((point) => point.value) ?? [1])),
  );
  constructor() {
    this.load();
  }
  load(): void {
    this.loading.set(true);
    this.error.set(false);
    this.api.getDashboard().subscribe({
      next: (data) => {
        this.data.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }
  barHeight(value: number): number {
    return Math.round((value / this.maxRevenue()) * 100);
  }
}
