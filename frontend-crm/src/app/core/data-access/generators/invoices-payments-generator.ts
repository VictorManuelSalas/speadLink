/**
 * Invoices & Payments Generator
 * Generates billing and payment records with relationships
 */

import { BaseGenerator } from './base-generator';
import type { InvoiceRecord, PaymentRecord } from '../models/operational-records';
import { IdGenerator } from '../utils/id-generator';
import { FakerHelpers } from '../utils/faker-helpers';
import { LookupMapper } from '../utils/lookup-mapper';

// ============================================================================
// INVOICES GENERATOR
// ============================================================================

export class InvoicesGenerator extends BaseGenerator<InvoiceRecord> {
  private customerIds = ['SL-1040', 'SL-1041', 'SL-1042', 'SL-1043', 'SL-1044'];

  generate(index: number = 0): InvoiceRecord {
    const customerId = this.customerIds[index % this.customerIds.length];
    const subtotal = FakerHelpers.randomAmount(500, 3000);
    const taxAmount = Math.round(subtotal * 0.16 * 100) / 100; // 16% VAT
    const total = subtotal + taxAmount;

    // Vary status distribution: 50% paid, 30% pending, 15% overdue, 5% draft
    const status = FakerHelpers.weightedRandomElement(
      ['PAID', 'PENDING', 'OVERDUE', 'DRAFT'] as const,
      [0.5, 0.3, 0.15, 0.05],
    );

    const issueDate = FakerHelpers.randomDate(90);
    const dueDate = new Date(issueDate);
    dueDate.setDate(dueDate.getDate() + 10); // 10 days payment term
    const dueDateStr = dueDate.toISOString().split('T')[0];

    return this.createBaseRecord<InvoiceRecord>(
      IdGenerator.generate('INV', 4480 + index),
      {
        folio: `FAC-${customerId}-${index}`,
        clientId: customerId,
        client: LookupMapper.getCustomerName(customerId),
        issueDate: issueDate,
        dueDate: dueDateStr,
        subtotal: subtotal,
        taxAmount: taxAmount,
        total: total,
        status: status,
        notes: `Factura por servicios de Internet del mes`,
      },
    );
  }

  /**
   * Generate invoices for customer with relationship to contracts
   */
  generateForCustomer(
    customerId: string,
    count: number,
    monthsBack: number = 3,
  ): InvoiceRecord[] {
    const invoices: InvoiceRecord[] = [];

    for (let i = 0; i < count; i++) {
      const daysAgo = (monthsBack - i) * 30;
      const issueDate = FakerHelpers.randomDate(daysAgo + 30);
      const dueDate = new Date(issueDate);
      dueDate.setDate(dueDate.getDate() + 10);

      const subtotal = FakerHelpers.randomAmount(500, 3000);
      const taxAmount = Math.round(subtotal * 0.16 * 100) / 100;

      const invoice: InvoiceRecord = this.createBaseRecord<InvoiceRecord>(
        IdGenerator.generate('INV', 4480 + i),
        {
          folio: `FAC-${customerId}-${i}`,
          clientId: customerId,
          client: LookupMapper.getCustomerName(customerId),
          issueDate: issueDate,
          dueDate: dueDate.toISOString().split('T')[0],
          subtotal: subtotal,
          taxAmount: taxAmount,
          total: subtotal + taxAmount,
          status: 'PAID',
          notes: `Factura de servicio del mes`,
        },
      );

      invoices.push(invoice);
    }

    return invoices;
  }
}

// ============================================================================
// PAYMENTS GENERATOR
// ============================================================================

export class PaymentsGenerator extends BaseGenerator<PaymentRecord> {
  private customerIds = ['SL-1040', 'SL-1041', 'SL-1042', 'SL-1043', 'SL-1044'];

  generate(index: number = 0): PaymentRecord {
    const customerId = this.customerIds[index % this.customerIds.length];
    const invoiceId = IdGenerator.generate('INV', 4480 + index);
    const method = FakerHelpers.randomElement([
      'CASH',
      'BANK_TRANSFER',
      'CREDIT_CARD',
      'DEBIT_CARD',
    ] as const);

    return this.createBaseRecord<PaymentRecord>(
      IdGenerator.generate('PAY', 74000 + index),
      {
        clientId: customerId,
        client: LookupMapper.getCustomerName(customerId),
        invoiceId: invoiceId,
        invoice: `FAC-${customerId}-${index}`,
        amount: FakerHelpers.randomAmount(300, 3500),
        method: method,
        reference: FakerHelpers.randomPaymentReference(),
        paidAt: FakerHelpers.randomDate(30),
        notes: `Pago por servicios de Internet`,
      },
    );
  }

  /**
   * Generate payments for an invoice (partial or full)
   */
  generateForInvoice(
    invoiceId: string,
    customerId: string,
    invoiceTotal: number,
    partial: boolean = false,
  ): PaymentRecord[] {
    const payments: PaymentRecord[] = [];

    if (partial) {
      // Create 2 partial payments
      const firstPayment = Math.round((invoiceTotal * 0.5) * 100) / 100;
      const secondPayment = invoiceTotal - firstPayment;

      payments.push(
        this.createBaseRecord<PaymentRecord>(
          IdGenerator.generate('PAY', 74000),
          {
            clientId: customerId,
            client: LookupMapper.getCustomerName(customerId),
            invoiceId: invoiceId,
            invoice: invoiceId,
            amount: firstPayment,
            method: 'BANK_TRANSFER' as const,
            reference: FakerHelpers.randomPaymentReference(),
            paidAt: FakerHelpers.randomDate(60),
            notes: 'Primer pago parcial',
          },
        ),
      );

      payments.push(
        this.createBaseRecord<PaymentRecord>(
          IdGenerator.generate('PAY', 74001),
          {
            clientId: customerId,
            client: LookupMapper.getCustomerName(customerId),
            invoiceId: invoiceId,
            invoice: invoiceId,
            amount: secondPayment,
            method: 'CASH' as const,
            reference: FakerHelpers.randomPaymentReference(),
            paidAt: FakerHelpers.randomDate(30),
            notes: 'Segundo pago parcial',
          },
        ),
      );
    } else {
      // Full payment
      payments.push(
        this.createBaseRecord<PaymentRecord>(
          IdGenerator.generate('PAY', 74002),
          {
            clientId: customerId,
            client: LookupMapper.getCustomerName(customerId),
            invoiceId: invoiceId,
            invoice: invoiceId,
            amount: invoiceTotal,
            method: 'BANK_TRANSFER' as const,
            reference: FakerHelpers.randomPaymentReference(),
            paidAt: FakerHelpers.randomDate(30),
            notes: 'Pago completo',
          },
        ),
      );
    }

    return payments;
  }

  /**
   * Generate multiple payments with distribution
   */
  generateBatch(
    count: number,
    customerIds?: string[],
  ): PaymentRecord[] {
    const customers = customerIds || this.customerIds;
    const payments: PaymentRecord[] = [];

    for (let i = 0; i < count; i++) {
      const record = this.generate(i);
      const customerId = customers[i % customers.length];
      record.clientId = customerId;
      record.client = LookupMapper.getCustomerName(customerId);
      payments.push(record);
    }

    return payments;
  }
}
