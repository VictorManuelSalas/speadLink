import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, delay, map, tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  // 🔄 CAMBIAR ESTA URL CUANDO TENGAN LOS ENDPOINTS REALES
  private apiUrl = 'https://api.speedlink.mx/api'; // ← Reemplaza con tu URL real

  // Para desarrollo, descomentar esta línea para usar mock local
  // private apiUrl = '/assets/mock-api.json';

  private mockDataCache: any = null;
  private isMockMode = false; // Detecta si estamos usando mock

  constructor(private http: HttpClient) {
    // Detectar si estamos en modo mock
    this.isMockMode = this.apiUrl === '/assets/mock-api.json';
  }

  // Cargar datos del mock (se cachea después de la primera carga)
  private loadMockData(): Observable<any> {
    if (this.mockDataCache) {
      return of(this.mockDataCache);
    }
    return this.http.get('/assets/mock-api.json').pipe(
      delay(300),
      tap(data => (this.mockDataCache = data)),
      catchError(() => {
        console.warn('No se pudo cargar mock-api.json, usando datos embebidos');
        return of(this.getEmbeddedMockData());
      })
    );
  }

  // Obtener servicios (planes de internet + streaming)
  getServices(): Observable<any> {
    if (this.isMockMode) {
      return this.loadMockData().pipe(
        map(data => data.services || this.getMockServices())
      );
    }
    return this.http.get(`${this.apiUrl}/services`).pipe(
      delay(300),
      catchError(error => {
        console.error('Error cargando servicios:', error);
        return of(this.getMockServices());
      })
    );
  }

  // Obtener beneficios
  getBenefits(): Observable<any> {
    if (this.isMockMode) {
      return this.loadMockData().pipe(
        map(data => data.benefits || this.getMockBenefits())
      );
    }
    return this.http.get(`${this.apiUrl}/benefits`).pipe(
      delay(300),
      catchError(error => {
        console.error('Error cargando beneficios:', error);
        return of(this.getMockBenefits());
      })
    );
  }

  // Obtener pasos del proceso
  getProcessSteps(): Observable<any> {
    if (this.isMockMode) {
      return this.loadMockData().pipe(
        map(data => data['process-steps'] || this.getMockProcessSteps())
      );
    }
    return this.http.get(`${this.apiUrl}/process-steps`).pipe(
      delay(300),
      catchError(error => {
        console.error('Error cargando pasos del proceso:', error);
        return of(this.getMockProcessSteps());
      })
    );
  }

  // Obtener FAQs
  getFaqs(): Observable<any> {
    if (this.isMockMode) {
      return this.loadMockData().pipe(
        map(data => data.faqs || this.getMockFaqs())
      );
    }
    return this.http.get(`${this.apiUrl}/faqs`).pipe(
      delay(300),
      catchError(error => {
        console.error('Error cargando FAQs:', error);
        return of(this.getMockFaqs());
      })
    );
  }

  // Obtener información de contacto
  getContactInfo(): Observable<any> {
    if (this.isMockMode) {
      return this.loadMockData().pipe(
        map(data => data['contact-info'] || this.getMockContactInfo())
      );
    }
    return this.http.get(`${this.apiUrl}/contact-info`).pipe(
      delay(300),
      catchError(error => {
        console.error('Error cargando información de contacto:', error);
        return of(this.getMockContactInfo());
      })
    );
  }

  // ==================== DATOS MOCK (fallback) ====================

  private getEmbeddedMockData() {
    return {
      services: this.getMockServices(),
      benefits: this.getMockBenefits(),
      'process-steps': this.getMockProcessSteps(),
      faqs: this.getMockFaqs(),
      'contact-info': this.getMockContactInfo(),
    };
  }

  private getMockServices() {
    return {
      success: true,
      data: {
        services: [
          {
            type: 'internet',
            id: 1,
            name: 'Plan Básico',
            speed: '25 Mbps',
            monthlyPrice: 399,
            installationPrice: 499,
            recommended: false,
            audience: [
              'Perfecto para redes sociales',
              'Navegación web fluida',
              'Streaming en 1080p',
              'Ideal para hogar pequeño'
            ]
          },
          {
            type: 'internet',
            id: 2,
            name: 'Plan Pro',
            speed: '100 Mbps',
            monthlyPrice: 599,
            installationPrice: 299,
            recommended: true,
            audience: [
              'Videollamadas sin cortes',
              'Múltiples dispositivos simultáneamente',
              'Gaming online fluido',
              '4K streaming',
              'Ideal para familias'
            ]
          },
          {
            type: 'internet',
            id: 3,
            name: 'Plan Empresarial',
            speed: '300 Mbps',
            monthlyPrice: 999,
            installationPrice: 0,
            recommended: false,
            audience: [
              'Capacidad ilimitada',
              'Soporte prioritario 24/7',
              'SLA garantizado',
              'IP estática',
              'Para negocios y oficinas'
            ]
          },
          {
            type: 'streaming',
            id: 101,
            name: 'Netflix',
            monthlyPrice: 199,
            logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/08/Netflix_2015_logo.svg/1198px-Netflix_2015_logo.svg.png'
          },
          {
            type: 'streaming',
            id: 102,
            name: 'Disney+',
            monthlyPrice: 149,
            logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/Disney_Plus_Logo.svg/1024px-Disney_Plus_Logo.svg.png'
          },
          {
            type: 'streaming',
            id: 103,
            name: 'Amazon Prime',
            monthlyPrice: 249,
            logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/13/Prime_Video.jpg/440px-Prime_Video.jpg'
          },
          {
            type: 'streaming',
            id: 104,
            name: 'Paramount+',
            monthlyPrice: 179,
            logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/Paramount%2B_logo.svg/1024px-Paramount%2B_logo.svg.png'
          },
          {
            type: 'streaming',
            id: 105,
            name: 'HBO Max',
            monthlyPrice: 189,
            logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5f/HBO_Max_Logo.svg/1024px-HBO_Max_Logo.svg.png'
          },
          {
            type: 'streaming',
            id: 106,
            name: 'Apple TV+',
            monthlyPrice: 99,
            logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3c/Apple_TV_Plus_Logo.svg/1024px-Apple_TV_Plus_Logo.svg.png'
          },
          {
            type: 'streaming',
            id: 107,
            name: 'Spotify',
            monthlyPrice: 119,
            logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/84/Spotify_icon.svg/1024px-Spotify_icon.svg.png'
          },
          {
            type: 'streaming',
            id: 108,
            name: 'YouTube Premium',
            monthlyPrice: 179,
            logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b1/YouTube_quadrat.svg/1024px-YouTube_quadrat.svg.png'
          }
        ]
      }
    };
  }

  private getMockBenefits() {
    return {
      success: true,
      data: {
        benefits: [
          {
            title: 'Velocidad Garantizada',
            description: 'Disfruta de velocidades estables y confiables en todo momento. Sin sorpresas, sin caídas.',
            icon: 'https://icons.getbootstrap.com/assets/icons/lightning-fill.svg'
          },
          {
            title: 'Soporte Local 24/7',
            description: 'Equipo de expertos disponible siempre para resolver tus dudas. Soporte cercano y de confianza.',
            icon: 'https://icons.getbootstrap.com/assets/icons/headset.svg'
          },
          {
            title: 'Instalación Rápida',
            description: 'Desde tu solicitud hasta conectarte en menos de 48 horas. Proceso ágil y sin complicaciones.',
            icon: 'https://icons.getbootstrap.com/assets/icons/lightning.svg'
          },
          {
            title: 'Precios Transparentes',
            description: 'Conoce exactamente qué pagas. Sin cargos ocultos, sin sorpresas en la factura.',
            icon: 'https://icons.getbootstrap.com/assets/icons/wallet2.svg'
          },
          {
            title: 'Primer Mes Gratis',
            description: 'Prueba nuestro servicio sin compromiso. Cancela cuando quieras si no estás satisfecho.',
            icon: 'https://icons.getbootstrap.com/assets/icons/gift.svg'
          },
          {
            title: 'Router Incluido',
            description: 'Equipo de última tecnología incluido en tu plan. Mantén tu hogar conectado siempre.',
            icon: 'https://icons.getbootstrap.com/assets/icons/wifi.svg'
          }
        ]
      }
    };
  }

  private getMockProcessSteps() {
    return {
      success: true,
      data: {
        steps: [
          {
            step: 1,
            title: 'Consulta Cobertura',
            description: 'Verifica si nuestro servicio está disponible en tu zona. Comparte tu ubicación y nosotros confirmamos.'
          },
          {
            step: 2,
            title: 'Elige tu Plan',
            description: 'Selecciona el plan que mejor se adapte a tus necesidades. Todos incluyen el primer mes gratis.'
          },
          {
            step: 3,
            title: 'Confirma Instalación',
            description: 'Nuestro equipo te contactará para agendar la instalación en tu hogar o negocio.'
          },
          {
            step: 4,
            title: '¡Conectado!',
            description: 'Disfruta de internet de alta velocidad. Acceso inmediato a todos tus contenidos favoritos.'
          }
        ]
      }
    };
  }

  private getMockFaqs() {
    return {
      success: true,
      data: {
        faqs: [
          {
            question: '¿Cuáles son los requisitos para contratar?',
            answer: 'Solo necesitas tener una conexión eléctrica en el punto de instalación. Nuestro equipo se encargará del resto. Puede haber restricciones según tu zona de cobertura.'
          },
          {
            question: '¿Cuánto tiempo tarda la instalación?',
            answer: 'La instalación típicamente toma entre 1 y 3 horas. Nuestro equipo técnico se presentará en la fecha y hora acordada con todo el equipo necesario.'
          },
          {
            question: '¿Puedo cambiar de plan?',
            answer: 'Sí, puedes cambiar de plan en cualquier momento. Los cambios surten efecto en el siguiente ciclo de facturación sin cargos adicionales.'
          },
          {
            question: '¿Hay contrato de permanencia?',
            answer: 'No hay contrato obligatorio. Puedes cancelar tu servicio en cualquier momento con solo 30 días de aviso previo.'
          },
          {
            question: '¿Qué pasa si no hay cobertura en mi zona?',
            answer: 'Si actualmente no hay cobertura, dejamos registrada tu solicitud. Nuestro equipo te contactará cuando la cobertura llegue a tu zona.'
          },
          {
            question: '¿El router está incluido?',
            answer: 'Sí, todos nuestros planes incluyen router WiFi de última tecnología. El equipo es nuestro y realizamos mantenimiento sin costo.'
          },
          {
            question: '¿Hay descuentos para negocios?',
            answer: 'Sí, tenemos planes especiales para empresas con SLA garantizado, IP estática y soporte prioritario. Contáctanos para más detalles.'
          },
          {
            question: '¿Puedo compartir mi internet con mis vecinos?',
            answer: 'No está permitido según nuestros términos de servicio. El servicio es exclusivo para tu hogar o negocio registrado.'
          }
        ]
      }
    };
  }

  private getMockContactInfo() {
    return {
      success: true,
      data: {
        contact: {
          phone: '+52 123 456 7890',
          whatsapp: '1234567890',
          email: 'contacto@speedlink.mx',
          address: 'Calle Principal 123, Apartado 45, Comunidad XYZ',
          facebook: 'facebook.com/speedlink',
          instagram: '@speedlink_mx',
          businessHours: {
            weekday: '8:00 AM - 8:00 PM',
            weekend: '9:00 AM - 6:00 PM'
          }
        }
      }
    };
  }
}
