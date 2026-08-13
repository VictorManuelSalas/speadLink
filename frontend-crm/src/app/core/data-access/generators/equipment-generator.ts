/**
 * Equipment Generator
 * Generates network equipment and hardware data
 */

import { BaseGenerator } from './base-generator';
import type { EquipmentRecord } from '../models/operational-records';
import { IdGenerator } from '../utils/id-generator';
import { FakerHelpers } from '../utils/faker-helpers';

export class EquipmentGenerator extends BaseGenerator<EquipmentRecord> {
  private equipmentTypes = [
    {
      name: 'Antena CPE',
      models: ['Ubiquiti LiteBeam 5AC', 'Ubiquiti NanoStation 5AC', 'Mikrotik LHG 5'],
      cost: 1200,
    },
    {
      name: 'Router Wi-Fi',
      models: ['TP-Link Archer C6', 'TP-Link C3150', 'Netgear Nighthawk'],
      cost: 800,
    },
    {
      name: 'Switch de Red',
      models: ['Cisco 2950', 'TP-Link LS105G', 'Netgear GS105'],
      cost: 400,
    },
    {
      name: 'Fuente de Poder',
      models: ['PoE Injector 48V', 'Fuente 12V 2A', 'Fuente 24V 1A'],
      cost: 150,
    },
  ];

  generate(index: number = 0): EquipmentRecord {
    const typeIndex = index % this.equipmentTypes.length;
    const type = this.equipmentTypes[typeIndex];
    const model = type.models[Math.floor(index / this.equipmentTypes.length) % type.models.length];

    const status = FakerHelpers.weightedRandomElement(
      ['AVAILABLE', 'ASSIGNED', 'DAMAGED', 'RETIRED'] as const,
      [0.6, 0.25, 0.1, 0.05],
    );

    const purchaseDate = FakerHelpers.randomDate(180);

    return this.createBaseRecord<EquipmentRecord>(
      IdGenerator.generate('EQ', 1000 + index),
      {
        name: type.name,
        brand: FakerHelpers.randomBrand(),
        model: model,
        serialNumber: FakerHelpers.randomSerialNumber(),
        macAddress: IdGenerator.generateMacAddress(),
        status,
        purchaseCost: type.cost + Math.floor(Math.random() * 500),
        purchaseDate: purchaseDate,
        assignedToId: status === 'ASSIGNED' ? `SL-${1040 + index % 5}` : undefined,
        notes: `Equipo de ${type.name.toLowerCase()} modelo ${model}`,
      },
    );
  }

  /**
   * Generate with specific customer assignments
   */
  generateWithAssignments(
    count: number,
    customerIds: string[],
  ): EquipmentRecord[] {
    const records: EquipmentRecord[] = [];

    for (let i = 0; i < count; i++) {
      const record = this.generate(i);

      // Assign 60% of equipment
      if (Math.random() < 0.6) {
        record.status = 'ASSIGNED';
        record.assignedToId = customerIds[i % customerIds.length];
      }

      records.push(record);
    }

    return records;
  }
}
