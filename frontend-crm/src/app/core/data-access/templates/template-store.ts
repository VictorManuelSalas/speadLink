import { Injectable, computed, signal } from '@angular/core';
import {
  CrmTemplate,
  RenderContext,
  TemplateChannel,
  TemplateModule,
  htmlToText,
  renderTemplateText,
} from './template.model';

const SEED: ReadonlyArray<CrmTemplate> = [
  {
    id: 'tpl-contract-send',
    name: 'Envío de contrato',
    channel: 'email',
    module: 'contracts',
    format: 'text',
    subject: 'Tu contrato de servicio ${contract.number} · ${org.name}',
    body: [
      'Hola ${contract.client},',
      '',
      'Adjuntamos tu contrato de servicio ${contract.number}. En él encontrarás los servicios contratados, la mensualidad y la vigencia.',
      '',
      'Vigencia: ${contract.startDate} al ${contract.endDate}',
      'Mensualidad: ${contract.total}',
      '',
      'Por favor revísalo y, si todo está correcto, respóndenos con el documento firmado.',
      '',
      'Saludos,',
      '${user.name} · ${org.name}',
      '${org.phone} · ${org.email}',
    ].join('\n'),
    status: 'ACTIVE',
    updatedAt: '2026-08-01T10:00:00-06:00',
  },
  {
    id: 'tpl-contract-whatsapp',
    name: 'Contrato por WhatsApp',
    channel: 'sms',
    module: 'contracts',
    format: 'text',
    subject: '',
    body: [
      'Hola ${contract.client}, te compartimos tu contrato de servicio *${contract.number}* con ${org.name}.',
      '',
      'Vigencia: ${contract.startDate} al ${contract.endDate}',
      'Mensualidad: ${contract.total}',
      '',
      'Cualquier duda, escríbenos a ${org.phone}.',
    ].join('\n'),
    status: 'ACTIVE',
    updatedAt: '2026-08-01T10:00:00-06:00',
  },
  {
    id: 'tpl-invoice-reminder',
    name: 'Recordatorio de pago',
    channel: 'email',
    module: 'invoices',
    format: 'text',
    subject: 'Recordatorio: factura ${invoice.folio} por vencer',
    body: [
      'Hola ${invoice.client},',
      '',
      'Te recordamos que tu factura ${invoice.folio} por ${invoice.total} vence el ${invoice.dueDate}.',
      '',
      'Si ya realizaste el pago, ignora este mensaje.',
      '',
      'Saludos,',
      '${org.name} · ${org.phone}',
    ].join('\n'),
    status: 'ACTIVE',
    updatedAt: '2026-07-28T10:00:00-06:00',
  },
  {
    id: 'tpl-lead-first-contact',
    name: 'Primer contacto',
    channel: 'email',
    module: 'leads',
    format: 'text',
    subject: 'Conoce las soluciones de ${org.name}',
    body: [
      'Hola ${lead.name},',
      '',
      'Gracias por tu interés en ${org.name}. Nos gustaría conocer tus necesidades de conectividad y ayudarte a encontrar el plan ideal.',
      '',
      '¿Podemos agendar una llamada breve?',
      '',
      'Saludos,',
      '${user.name}',
    ].join('\n'),
    status: 'ACTIVE',
    updatedAt: '2026-07-20T10:00:00-06:00',
  },
  {
    id: 'tpl-customer-welcome',
    name: 'Bienvenida al servicio',
    channel: 'email',
    module: 'customers',
    format: 'text',
    subject: '¡Bienvenido a ${org.name}, ${customer.name}!',
    body: [
      'Hola ${customer.name},',
      '',
      'Tu servicio ${customer.plan} ya está activo. A partir de hoy puedes contar con nosotros para cualquier tema de tu conexión.',
      '',
      'Guarda estos datos de contacto:',
      'Teléfono: ${org.phone}',
      'Correo: ${org.email}',
      '',
      'Gracias por elegirnos.',
      '${user.name} · ${org.name}',
    ].join('\n'),
    status: 'ACTIVE',
    updatedAt: '2026-07-10T10:00:00-06:00',
  },
  {
    id: 'tpl-generic-followup',
    name: 'Seguimiento general',
    channel: 'email',
    // Sin módulo: disponible al redactar desde cualquier registro.
    module: '',
    format: 'text',
    subject: 'Seguimiento de ${org.name}',
    body: [
      'Hola,',
      '',
      'Queríamos dar seguimiento al tema que tratamos. ¿Tuviste oportunidad de revisarlo? Con gusto resolvemos cualquier duda.',
      '',
      'Saludos,',
      '${user.name} · ${org.name}',
      '${org.phone}',
    ].join('\n'),
    status: 'ACTIVE',
    updatedAt: '2026-07-05T10:00:00-06:00',
  },
  {
    id: 'tpl-payment-received',
    name: 'Pago recibido',
    channel: 'sms',
    module: 'payments',
    format: 'text',
    subject: '',
    body: 'Hola ${payment.client}, recibimos tu pago de ${payment.amount} el ${payment.date}. Referencia: ${payment.reference}. Gracias. ${org.name}',
    status: 'ACTIVE',
    updatedAt: '2026-07-15T10:00:00-06:00',
  },
];

@Injectable({ providedIn: 'root' })
export class TemplateStore {
  private readonly items = signal<ReadonlyArray<CrmTemplate>>(SEED);
  readonly all = computed(() => this.items());
  readonly activeCount = computed(() => this.items().filter((t) => t.status === 'ACTIVE').length);

  /** Plantillas utilizables desde un módulo: las suyas y las generales. */
  forModule(module: TemplateModule, channel?: TemplateChannel): ReadonlyArray<CrmTemplate> {
    return this.items().filter(
      (template) =>
        template.status === 'ACTIVE' &&
        (!channel || template.channel === channel) &&
        (template.module === module || template.module === ''),
    );
  }

  find(id: string): CrmTemplate | undefined {
    return this.items().find((template) => template.id === id);
  }

  save(template: CrmTemplate): void {
    const stamped = { ...template, updatedAt: new Date().toISOString() };
    this.items.update((items) =>
      items.some((item) => item.id === stamped.id)
        ? items.map((item) => (item.id === stamped.id ? stamped : item))
        : [stamped, ...items],
    );
  }

  remove(id: string): void {
    this.items.update((items) => items.filter((item) => item.id !== id));
  }

  /** Asunto y cuerpo con las variables ya sustituidas. */
  render(
    template: CrmTemplate,
    context: RenderContext,
  ): { subject: string; body: string } {
    const body = renderTemplateText(template.body, template.module, context);
    return {
      subject: renderTemplateText(template.subject, template.module, context),
      // El SMS no admite marcado: si la plantilla es HTML se aplana.
      body: template.channel === 'sms' && template.format === 'html' ? htmlToText(body) : body,
    };
  }
}
