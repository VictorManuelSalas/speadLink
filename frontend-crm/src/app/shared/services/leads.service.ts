import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { MOCK_SERVICES } from './mock-data';

interface ServiceInterest {
  id: number;
  name: string;
}

interface StreamingServiceInterest {
  id: number;
  name: string;
}

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

  // Interés de servicios con IDs
  interestedPlan?: ServiceInterest;
  streamingServices?: StreamingServiceInterest[];

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
   * Incluye IDs de servicios de internet y streaming
   */
  private buildLeadPayload(formData: any): LeadData {
    const now = new Date();
    const [firstName, ...lastNameParts] = formData.name.trim().split(' ');
    const lastName = lastNameParts.join(' ') || undefined;

    // Obtener ID del plan de internet seleccionado
    const interestedPlan = formData.plan
      ? this.getInternetPlanWithId(formData.plan)
      : undefined;

    // Obtener IDs de los servicios de streaming seleccionados
    const streamingServices = formData.streamingServices?.length > 0
      ? this.getStreamingServicesWithIds(formData.streamingServices)
      : undefined;

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

      // Interés de servicios (con IDs)
      interestedPlan,
      streamingServices,

      // Información adicional
      comments: formData.comments?.trim() || undefined,

      // Metadata
      source: 'website',
      timestamp: now.toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };
  }

  /**
   * Encuentra el plan de internet y retorna su ID y nombre
   */
  private getInternetPlanWithId(planName: string): ServiceInterest | undefined {
    const services = MOCK_SERVICES.data.services;
    const plan = services.find(
      s => s.type === 'internet' && s.name === planName
    );
    return plan ? { id: plan.id, name: plan.name } : undefined;
  }

  /**
   * Encuentra los servicios de streaming y retorna sus IDs y nombres
   */
  private getStreamingServicesWithIds(streamingNames: string[]): StreamingServiceInterest[] {
    const services = MOCK_SERVICES.data.services;
    return streamingNames
      .map(name => {
        const service = services.find(
          s => s.type === 'streaming' && s.name === name
        );
        return service ? { id: service.id, name: service.name } : null;
      })
      .filter((s): s is StreamingServiceInterest => s !== null);
  }

  /**
   * Construye un objeto más detallado si Make.com lo requiere
   * Versión expandida con más información estructurada
   */
  buildDetailedPayload(formData: any): any {
    const leadPayload = this.buildLeadPayload(formData);

    return {
      // Datos del prospecto
      prospect: {
        firstName: leadPayload.firstName,
        lastName: leadPayload.lastName,
        fullName: `${leadPayload.firstName}${leadPayload.lastName ? ' ' + leadPayload.lastName : ''}`,
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

      // Servicios de interés (con IDs)
      interests: {
        internetPlan: leadPayload.interestedPlan ? {
          id: leadPayload.interestedPlan.id,
          name: leadPayload.interestedPlan.name
        } : null,
        streamingServices: leadPayload.streamingServices && leadPayload.streamingServices.length > 0
          ? leadPayload.streamingServices.map(s => ({
            id: s.id,
            name: s.name
          }))
          : []
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
