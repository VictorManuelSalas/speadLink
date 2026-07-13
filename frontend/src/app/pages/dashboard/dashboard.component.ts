import { Component } from '@angular/core';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent {
  readonly metrics = [
    { icon: '/icons/dashboard/fi-br-earnings.svg', label: 'dashboard.totalRevenue', value: '$ 500.50', trend: '-12%', detail: 'dashboard.lastMonth', tone: 'danger' },
    { icon: '/icons/dashboard/fi-sr-money.svg', label: 'dashboard.totalExpenses', value: '$ 1,500.50', trend: '25%', detail: 'dashboard.lastMonth', tone: 'success' },
    { icon: '/icons/dashboard/fi-br-chart-histogram.svg', label: 'dashboard.netProfit', value: '$ 1,900.50', trend: '25%', detail: 'dashboard.lastMonth', tone: 'success' },
    { icon: '/icons/status/fi-sr-exclamation.svg', label: 'dashboard.outstandingAmount', value: '$ 1,000.50', trend: 'dashboard.invoicesCount', detail: '', tone: 'warning' }
  ];
  readonly installations = [
    { day: '25', name: 'Karime Galves Sanchez', time: '15:00 - 16:30', color: '#264b9c' },
    { day: '05', name: 'Perla Ramirez', time: '15:00 - 16:30', color: '#f40e1d' },
    { day: '10', name: 'Miriam Guerrero Salaza', time: '15:00 - 16:30', color: '#2fb400' },
    { day: '31', name: 'Ivet Martinez', time: '15:00 - 16:30', color: '#ff8c22' }
  ];
  readonly bars = [42, 69, 28, 39, 82, 74, 18, 0, 0, 0, 0, 0];
}
