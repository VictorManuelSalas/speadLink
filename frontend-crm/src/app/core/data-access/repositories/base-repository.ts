/**
 * Base Repository
 * Abstract base class for all data repositories
 * Provides common CRUD operations
 */

import type { BaseOperationalRecord } from '../models/operational-records';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export abstract class BaseRepository<T extends BaseOperationalRecord> {
  protected dataSubject = new BehaviorSubject<T[]>([]);
  data$: Observable<T[]> = this.dataSubject.asObservable();

  constructor(initialData: T[] = []) {
    this.dataSubject.next(initialData);
  }

  // ========================================================================
  // READ OPERATIONS
  // ========================================================================

  /**
   * Get all records
   */
  getAll(): Observable<T[]> {
    return this.data$;
  }

  /**
   * Get all records synchronously
   */
  getAllSync(): T[] {
    return this.dataSubject.getValue();
  }

  /**
   * Get single record by ID
   */
  getById(id: string): Observable<T | undefined> {
    return this.data$.pipe(map((data) => data.find((item) => item.id === id)));
  }

  /**
   * Get single record by ID synchronously
   */
  getByIdSync(id: string): T | undefined {
    return this.getAllSync().find((item) => item.id === id);
  }

  /**
   * Filter records
   */
  filter(predicate: (item: T) => boolean): Observable<T[]> {
    return this.data$.pipe(map((data) => data.filter(predicate)));
  }

  /**
   * Filter records synchronously
   */
  filterSync(predicate: (item: T) => boolean): T[] {
    return this.getAllSync().filter(predicate);
  }

  /**
   * Search by multiple fields
   */
  search(query: string, fields: (keyof T)[]): Observable<T[]> {
    return this.data$.pipe(
      map((data) => {
        const lowerQuery = query.toLowerCase();
        return data.filter((item) =>
          fields.some((field) => {
            const value = item[field];
            return String(value).toLowerCase().includes(lowerQuery);
          }),
        );
      }),
    );
  }

  /**
   * Get count of records
   */
  count(): Observable<number> {
    return this.data$.pipe(map((data) => data.length));
  }

  /**
   * Get count synchronously
   */
  countSync(): number {
    return this.getAllSync().length;
  }

  // ========================================================================
  // WRITE OPERATIONS
  // ========================================================================

  /**
   * Add record
   */
  add(record: T): Observable<T> {
    const current = this.dataSubject.getValue();
    const updated = [...current, record];
    this.dataSubject.next(updated);
    return new Promise((resolve) => resolve(record)) as any;
  }

  /**
   * Update record
   */
  update(id: string, changes: Partial<T>): Observable<T | null> {
    const current = this.dataSubject.getValue();
    const index = current.findIndex((item) => item.id === id);

    if (index === -1) {
      return new Promise((resolve) => resolve(null)) as any;
    }

    const updated = { ...current[index], ...changes, updatedAt: new Date().toISOString() };
    const newData = [...current];
    newData[index] = updated;
    this.dataSubject.next(newData);

    return new Promise((resolve) => resolve(updated)) as any;
  }

  /**
   * Delete record (soft delete)
   */
  delete(id: string): Observable<boolean> {
    return this.update(id, { archived: true } as any).pipe(map((result) => result !== null));
  }

  /**
   * Delete record permanently
   */
  hardDelete(id: string): Observable<boolean> {
    const current = this.dataSubject.getValue();
    const filtered = current.filter((item) => item.id !== id);

    if (filtered.length === current.length) {
      return new Promise((resolve) => resolve(false)) as any;
    }

    this.dataSubject.next(filtered);
    return new Promise((resolve) => resolve(true)) as any;
  }

  /**
   * Add multiple records
   */
  addBatch(records: T[]): Observable<T[]> {
    const current = this.dataSubject.getValue();
    const updated = [...current, ...records];
    this.dataSubject.next(updated);
    return new Promise((resolve) => resolve(records)) as any;
  }

  /**
   * Clear all records
   */
  clear(): void {
    this.dataSubject.next([]);
  }

  /**
   * Replace all data
   */
  replaceAll(data: T[]): void {
    this.dataSubject.next(data);
  }

  // ========================================================================
  // UTILITY METHODS
  // ========================================================================

  /**
   * Export data as JSON
   */
  exportJSON(): string {
    return JSON.stringify(this.getAllSync(), null, 2);
  }

  /**
   * Import data from JSON
   */
  importJSON(json: string): boolean {
    try {
      const data = JSON.parse(json) as T[];
      this.replaceAll(data);
      return true;
    } catch (e) {
      console.error('Failed to import JSON', e);
      return false;
    }
  }
}
