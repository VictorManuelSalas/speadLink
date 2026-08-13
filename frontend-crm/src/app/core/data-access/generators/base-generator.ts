/**
 * Base Generator
 * Abstract base class for all data generators
 */

import type { BaseOperationalRecord, OperationalRecordType } from '../models/operational-records';

export abstract class BaseGenerator<T extends BaseOperationalRecord> {
  protected userId = 'usr-system-01';
  protected userName = 'Sistema';

  /**
   * Generate a single record
   */
  abstract generate(index?: number): T;

  /**
   * Generate multiple records
   */
  generateMultiple(count: number): T[] {
    return Array.from({ length: count }, (_, i) => this.generate(i));
  }

  /**
   * Create base record with audit fields
   */
  protected createBaseRecord<R extends BaseOperationalRecord>(
    id: string,
    data: Omit<R, keyof BaseOperationalRecord>,
  ): R {
    const now = new Date().toISOString();
    return {
      id,
      createdAt: now,
      updatedAt: now,
      createdBy: this.userId,
      updatedBy: this.userName,
      ...data,
    } as R;
  }

  /**
   * Set user context for audit fields
   */
  setUserContext(userId: string, userName: string): void {
    this.userId = userId;
    this.userName = userName;
  }

  /**
   * Get current user context
   */
  getUserContext(): { userId: string; userName: string } {
    return { userId: this.userId, userName: this.userName };
  }
}
