import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe, CurrencyPipe } from '@angular/common';
import { CustomerStore } from '../../../core/data-access/customer-store';
import { LanguageService } from '../../../core/i18n/language.service';
import { CustomerInvoice, CustomerPayment } from '../../../core/models/customer';
import {
  RecordDetailLayout,
  RecordHeader,
  RecordInformationCard,
  RecordSummary,
} from '../../../shared/record-detail-shell';

@Component({
  selector: 'app-invoice-detail-page',
  imports: [
    DatePipe,
    CurrencyPipe,
    RecordDetailLayout,
    RecordHeader,
    RecordInformationCard,
    RecordSummary,
    RouterLink,
  ],
  templateUrl: './invoice-detail-page.html',
  styleUrl: './invoice-detail-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InvoiceDetailPage {
  readonly store = inject(CustomerStore);
  readonly i18n = inject(LanguageService);
  private readonly route = inject(ActivatedRoute);

  readonly customerId = signal(this.route.snapshot.paramMap.get('customerId') ?? '');
  readonly invoiceId = signal(this.route.snapshot.paramMap.get('invoiceId') ?? '');
  readonly activeTab = signal<'details' | 'payments'>('details');

  readonly customer = computed(() => this.store.get(this.customerId()));
  readonly invoice = computed(() => {
    const c = this.customer();
    if (!c) return undefined;
    return c.invoices.find((inv) => inv.id === this.invoiceId());
  });

  readonly linkedPayments = computed(() => {
    const inv = this.invoice();
    if (!inv) return [];
    // Simular pagos enlazados a la factura basados en el ID
    return inv.payments ?? [];
  });

  readonly paidAmount = computed(() => {
    return this.linkedPayments().reduce((sum, p) => sum + p.amount, 0);
  });

  readonly remainingAmount = computed(() => {
    const inv = this.invoice();
    if (!inv) return 0;
    return Math.max(0, inv.total - this.paidAmount());
  });

  readonly paymentProgress = computed(() => {
    const inv = this.invoice();
    if (!inv || inv.total === 0) return 0;
    return (this.paidAmount() / inv.total) * 100;
  });

  constructor() {
    this.route.paramMap.subscribe((params) => {
      this.customerId.set(params.get('customerId') ?? '');
      this.invoiceId.set(params.get('invoiceId') ?? '');
    });
  }

  statusLabel(status: CustomerInvoice['status']): string {
    return this.i18n.t({
      paid: 'Pagada',
      pending: 'Pendiente',
      overdue: 'Vencida',
    }[status]);
  }

  statusTone(status: CustomerInvoice['status']): string {
    switch (status) {
      case 'paid':
        return 'green';
      case 'pending':
        return 'blue';
      case 'overdue':
        return 'red';
    }
  }

  paymentMethodIcon(method: string): string {
    switch (method) {
      case 'Transferencia':
        return '🏦';
      case 'Efectivo':
        return '💵';
      case 'Tarjeta':
        return '💳';
      default:
        return '💰';
    }
  }

  initials(name: string): string {
    return name
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase();
  }
}
