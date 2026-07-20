import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CustomerStatus } from '../core/models/customer';

@Component({
  selector: 'app-status-badge',
  templateUrl: './status-badge.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusBadge {
  readonly status = input.required<CustomerStatus>();
  readonly labels: Record<CustomerStatus, string> = {
    active: 'Activo',
    inactive: 'Inactivo',
    pending: 'Pendiente',
    suspended: 'Suspendido',
    cancelled: 'Cancelado',
  };
}
