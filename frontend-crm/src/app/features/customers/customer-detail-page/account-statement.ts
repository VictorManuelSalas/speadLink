/**
 * Estado de cuenta del cliente.
 *
 * Es el documento que se le manda al cliente cuando pregunta cuánto debe:
 * saldo, facturas del periodo y pagos aplicados en una sola hoja. A diferencia
 * del CSV de Exportar —pensado para conciliar en Excel— éste no se procesa,
 * se lee y se archiva.
 */

import { Customer } from '../../../core/models/customer';
import { PrintableDocument } from '../../operations/printable-document/printable-document.data';

export interface AccountStatementFormatters {
  readonly formatMoney: (value: number) => string;
  readonly formatDate: (value: string) => string;
  readonly invoiceStatusLabel: (status: string) => string;
}

export function buildAccountStatement(
  customer: Customer,
  format: AccountStatementFormatters,
): PrintableDocument {
  const invoices = [...customer.invoices].sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));
  const payments = [...customer.payments].sort((a, b) => b.date.localeCompare(a.date));

  const billed = invoices.reduce((sum, invoice) => sum + invoice.total, 0);
  const paid = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const pendingCount = invoices.filter((invoice) => invoice.status !== 'paid').length;
  // El saldo sale de `currentBalance`, el mismo que muestran el encabezado del
  // cliente y el listado. Derivarlo de las facturas daría otra cifra y el
  // documento contradiría a la pantalla.
  const pending = customer.currentBalance;

  return {
    title: 'Estado de cuenta',
    reference: customer.id,
    issuedAt: format.formatDate(new Date().toISOString()),
    sections: [
      {
        title: 'Cliente',
        rows: [
          { label: 'Nombre', value: customer.name, strong: true },
          { label: 'Clave de cliente', value: customer.id },
          { label: 'Dirección', value: customer.address },
        ],
      },
      {
        title: 'Servicio',
        rows: [
          { label: 'Plan', value: `${customer.plan} · ${customer.speed}` },
          { label: 'Mensualidad', value: format.formatMoney(customer.monthlyFee) },
          { label: 'Día de cobro', value: `Día ${customer.billingDay} de cada mes` },
        ],
      },
      {
        title: 'Resumen del periodo',
        rows: [
          { label: 'Facturado', value: format.formatMoney(billed) },
          { label: 'Pagado', value: format.formatMoney(paid) },
          {
            label: 'Facturas por pagar',
            value: pendingCount === 1 ? '1 factura' : `${pendingCount} facturas`,
          },
        ],
      },
    ],
    tables: [
      {
        title: 'Facturas',
        columns: [
          { label: 'Folio' },
          { label: 'Emisión' },
          { label: 'Vencimiento' },
          { label: 'Total', align: 'right' },
          { label: 'Estado', align: 'right' },
        ],
        rows: invoices.map((invoice) => [
          invoice.id,
          format.formatDate(invoice.issuedAt),
          format.formatDate(invoice.dueAt),
          format.formatMoney(invoice.total),
          format.invoiceStatusLabel(invoice.status),
        ]),
        empty: 'Sin facturas emitidas.',
      },
      {
        title: 'Pagos aplicados',
        columns: [
          { label: 'Referencia' },
          { label: 'Fecha' },
          { label: 'Método' },
          { label: 'Monto', align: 'right' },
        ],
        rows: payments.map((payment) => [
          payment.reference,
          format.formatDate(payment.date),
          payment.method,
          format.formatMoney(payment.amount),
        ]),
        empty: 'Sin pagos registrados.',
      },
    ],
    total: {
      label: pending > 0 ? 'Saldo pendiente' : 'Saldo a la fecha',
      value: format.formatMoney(pending),
      strong: true,
    },
    notes:
      pending > 0
        ? `El siguiente cargo se genera el día ${customer.billingDay} por ${format.formatMoney(customer.monthlyFee)}.`
        : `Cuenta al corriente. El siguiente cargo se genera el día ${customer.billingDay}.`,
    disclaimer:
      'Documento informativo emitido por el CRM con corte a la fecha indicada. No es un comprobante fiscal digital (CFDI).',
  };
}
