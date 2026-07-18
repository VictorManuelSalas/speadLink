import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CustomerStatus } from '../core/models/customer';

@Component({ selector: 'app-status-badge', template: `<span class="status status--{{ status() }}"><i></i>{{ labels[status()] }}</span>`, changeDetection: ChangeDetectionStrategy.OnPush })
export class StatusBadge { readonly status = input.required<CustomerStatus>(); readonly labels: Record<CustomerStatus, string> = { active: 'Activo', inactive: 'Inactivo', pending: 'Pendiente', suspended: 'Suspendido', cancelled: 'Cancelado' }; }
