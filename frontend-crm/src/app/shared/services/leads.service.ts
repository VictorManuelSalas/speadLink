import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

interface LeadData {
  // Información del prospecto
  firstName: string;
  lastName?: string;
  phone: string;
  email?: string;

  // Tipo de prospecto
  prospectType: 'Hogar' | 'Negocio';

  // Ubicación
  community: string;
  locationReference?: string;
  latitude?: number;
  longitude?: number;

  // Interés de servicios
  interestedPlan?: string;
  streamingServices?: string[];

  // Información adicional
  comments?: string;

  // Metadata
  source: 'website';
  timestamp: string;
  timezone?: string;
}

@Injectable({
  providedIn: 'root'
})
export class LeadsService {
  // 🔄 CAMBIAR ESTA URL CUANDO TENGAN LA URL DE PRODUCCIÓN
  private webhookUrl = 'https://hook.us2.make.com/sjyvihe8wahxlna9myf9q8z8hs5plhdw'; // ← URL de prueba

  // Para producción, descomenta y usa:
  // private webhookUrl = 'https://hook.us2.make.com/TU_URL_DE_PRODUCCION';

  constructor(private http: HttpClient) {}

  /**
   * Envía datos del formulario de contacto al webhook
   * @param formData Datos del formulario del usuario
   * @returns Observable con la respuesta del webhook
   */
  submitLead(formData: any): Observable<any> {
    const leadPayload = this.buildLeadPayload(formData);

    return this.http.post(this.webhookUrl, leadPayload, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Construye el JSON con la estructura óptima para el webhook
   * Estructura clara y escalable para Make.com
   */
  private buildLeadPayload(formData: any): LeadData {
    const now = new Date();
    const [firstName, ...lastNameParts] = formData.name.trim().split(' ');
    const lastName = lastNameParts.join(' ') || undefined;

    return {
      // Información del prospecto
      firstName: firstName.trim(),
      lastName: lastName?.trim(),
      phone: formData.phone.trim(),

      // Tipo de prospecto (Hogar o Negocio)
      prospectType: formData.prospectType,

      // Ubicación
      community: formData.community.trim(),
      locationReference: formData.location?.trim() || undefined,
      latitude: formData.latitude || undefined,
      longitude: formData.longitude || undefined,

      // Interés de servicios
      interestedPlan: formData.plan || undefined,
      streamingServices: formData.streamingServices?.length > 0
        ? formData.streamingServices
        : undefined,

      // Información adicional
      comments: formData.comments?.trim() || undefined,

      // Metadata
      source: 'website',
      timestamp: now.toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };
  }

  /**
   * Construye un objeto más detallado si Make.com lo requiere
   * (alternativa con más información estructurada)
   */
  buildDetailedPayload(formData: any): any {
    const leadPayload = this.buildLeadPayload(formData);

    return {
      // Datos del prospecto
      prospect: {
        name: `${leadPayload.firstName}${leadPayload.lastName ? ' ' + leadPayload.lastName : ''}`,
        phone: leadPayload.phone,
        type: leadPayload.prospectType
      },

      // Ubicación
      location: {
        community: leadPayload.community,
        reference: leadPayload.locationReference,
        coordinates: leadPayload.latitude && leadPayload.longitude ? {
          latitude: leadPayload.latitude,
          longitude: leadPayload.longitude
        } : null
      },

      // Servicios de interés
      interests: {
        internetPlan: leadPayload.interestedPlan,
        streamingServices: leadPayload.streamingServices
      },

      // Notas del prospecto
      notes: leadPayload.comments,

      // Información de la solicitud
      request: {
        source: leadPayload.source,
        timestamp: leadPayload.timestamp,
        timezone: leadPayload.timezone
      }
    };
  }
}
