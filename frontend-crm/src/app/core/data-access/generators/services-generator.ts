/**
 * Services Generator
 * Generates internet plans and add-on services
 */

import { BaseGenerator } from './base-generator';
import type { ServiceRecord } from '../models/operational-records';
import { IdGenerator } from '../utils/id-generator';

export class ServicesGenerator extends BaseGenerator<ServiceRecord> {
  /**
   * Internet plans with standard pricing
   */
  private internetPlans = [
    { name: 'Internet Basic 10 Mbps', price: 399, speed: '10 Mbps' },
    { name: 'Internet Standard 20 Mbps', price: 549, speed: '20 Mbps' },
    { name: 'Internet Premium 50 Mbps', price: 799, speed: '50 Mbps' },
    { name: 'Internet Elite 100 Mbps', price: 1199, speed: '100 Mbps' },
    { name: 'Internet Ultra 150 Mbps', price: 1599, speed: '150 Mbps' },
  ];

  /**
   * Add-on services
   */
  private addOns = [
    { name: 'Streaming Plus', price: 49, description: 'Acceso a servicios de streaming' },
    { name: 'Protección Online', price: 79, description: 'Antivirus y protección de datos' },
    { name: 'Support Premium', price: 99, description: 'Soporte técnico prioritario' },
    { name: 'IP Pública Estática', price: 149, description: 'IP dedicada para negocio' },
  ];

  generate(index: number = 0): ServiceRecord {
    const isInternet = index < this.internetPlans.length;

    if (isInternet) {
      const plan = this.internetPlans[index];
      return this.createBaseRecord<ServiceRecord>(
        IdGenerator.generate('SRV', 5000 + index),
        {
          name: plan.name,
          description: `${plan.speed} Internet inalámbrico de alta velocidad`,
          price: plan.price,
          type: 'Internet' as const,
          status: 'ACTIVE' as const,
          isInternetService: true,
        },
      );
    }

    const addonIndex = index - this.internetPlans.length;
    const addon = this.addOns[addonIndex % this.addOns.length];

    return this.createBaseRecord<ServiceRecord>(
      IdGenerator.generate('SRV', 5100 + addonIndex),
      {
        name: addon.name,
        description: addon.description,
        price: addon.price,
        type: 'Complemento' as const,
        status: 'ACTIVE' as const,
      },
    );
  }

  /**
   * Generate all standard services
   */
  generateStandard(): ServiceRecord[] {
    return [
      ...this.internetPlans.map((plan, i) => {
        const record = this.generate(i);
        return record;
      }),
      ...this.addOns.map((addon, i) => {
        const record = this.generate(this.internetPlans.length + i);
        return record;
      }),
    ];
  }

  /**
   * Get internet service by speed
   */
  getInternetServiceBySpeed(speed: string): ServiceRecord {
    const plan = this.internetPlans.find((p) => p.speed === speed);
    if (!plan) {
      return this.generate(0); // Return basic plan
    }
    const index = this.internetPlans.indexOf(plan);
    return this.generate(index);
  }
}
