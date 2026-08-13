/**
 * ID Generator Utility
 * Generates consistent, realistic IDs for all record types
 */

export class IdGenerator {
  private static readonly counters = new Map<string, number>();

  /**
   * Reset all counters (useful for testing)
   */
  static reset(): void {
    this.counters.clear();
  }

  /**
   * Get next ID with prefix and counter
   * Example: generateId('INV') -> 'INV-4485'
   */
  static generate(prefix: string, startNumber: number = 1000): string {
    const key = `${prefix}_counter`;
    const current = this.counters.get(key) ?? startNumber;
    this.counters.set(key, current + 1);
    return `${prefix}-${current}`;
  }

  /**
   * Generate payment reference (e.g., ACH-4421A, CASH-1048)
   */
  static generatePaymentReference(method: 'ACH' | 'CASH' | 'VISA'): string {
    const methodPrefixes = {
      'ACH': 'ACH',
      'CASH': 'CASH',
      'VISA': 'VISA',
    };
    const base = IdGenerator.generate(methodPrefixes[method], 4000);
    // Add letter suffix for variety
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const randomLetter = letters[Math.floor(Math.random() * letters.length)];
    return base + randomLetter;
  }

  /**
   * Generate UUID v4 style ID
   */
  static generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * Generate MAC address
   * Format: XX:XX:XX:XX:XX:XX
   */
  static generateMacAddress(): string {
    return Array.from({ length: 6 })
      .map(() => Math.floor(Math.random() * 256).toString(16).padStart(2, '0').toUpperCase())
      .join(':');
  }

  /**
   * Generate IP address (private range)
   * Format: 10.20.x.x or 192.168.x.x
   */
  static generateIpAddress(type: 'private' | 'link-local' = 'private'): string {
    if (type === 'link-local') {
      return `192.168.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`;
    }
    return `10.20.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`;
  }

  /**
   * Set counter to specific value (for testing/seeding)
   */
  static setCounter(prefix: string, value: number): void {
    this.counters.set(`${prefix}_counter`, value);
  }

  /**
   * Get current counter value
   */
  static getCounter(prefix: string): number {
    return this.counters.get(`${prefix}_counter`) ?? 1000;
  }
}
