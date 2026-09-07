import { Injectable, signal } from '@angular/core';
import { LeadEmailSeed } from './lead-email-modal/lead-email-modal';

/**
 * Correo preparado en un módulo que debe abrirse en la ficha de otro registro.
 *
 * Se pasa por aquí y no por la URL porque el borrador lleva cuerpo y adjuntos
 * (un PDF como blob) que no caben ni tienen sentido en un query param. El
 * consumidor lo toma una sola vez con `take()`, así una recarga no vuelve a
 * abrir el mismo borrador.
 */
@Injectable({ providedIn: 'root' })
export class PendingEmailService {
  private readonly pending = signal<{ recordId: string; seed: LeadEmailSeed } | null>(null);

  queue(recordId: string, seed: LeadEmailSeed): void {
    this.pending.set({ recordId, seed });
  }

  take(recordId: string): LeadEmailSeed | null {
    const current = this.pending();
    if (!current || current.recordId !== recordId) return null;
    this.pending.set(null);
    return current.seed;
  }
}
