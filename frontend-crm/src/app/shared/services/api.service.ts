import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, delay } from 'rxjs/operators';
import {
  MOCK_SERVICES,
  MOCK_BENEFITS,
  MOCK_STEPS,
  MOCK_FAQS,
  MOCK_CONTACT
} from './mock-data';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  // 🔄 CAMBIAR ESTA URL CUANDO TENGAN LOS ENDPOINTS REALES
  private apiUrl = 'https://api.speedlink.mx/api'; // ← Reemplaza con tu URL real

  // Para desarrollo, descomentar esta línea para usar mock local (TypeScript)
  // private apiUrl = 'MOCK_MODE'; // ← Activa modo mock directo

  private isMockMode = this.apiUrl === 'MOCK_MODE'; // Detecta si estamos usando mock

  constructor(private http: HttpClient) {}

  // Obtener servicios (planes de internet + streaming)
  getServices(): Observable<any> {
    if (this.isMockMode) {
      return of(MOCK_SERVICES).pipe(delay(300));
    }
    return this.http.get(`${this.apiUrl}/services`).pipe(
      delay(300),
      catchError(error => {
        console.error('Error cargando servicios:', error);
        return of(MOCK_SERVICES);
      })
    );
  }

  // Obtener beneficios
  getBenefits(): Observable<any> {
    if (this.isMockMode) {
      return of(MOCK_BENEFITS).pipe(delay(300));
    }
    return this.http.get(`${this.apiUrl}/benefits`).pipe(
      delay(300),
      catchError(error => {
        console.error('Error cargando beneficios:', error);
        return of(MOCK_BENEFITS);
      })
    );
  }

  // Obtener pasos del proceso
  getProcessSteps(): Observable<any> {
    if (this.isMockMode) {
      return of(MOCK_STEPS).pipe(delay(300));
    }
    return this.http.get(`${this.apiUrl}/process-steps`).pipe(
      delay(300),
      catchError(error => {
        console.error('Error cargando pasos del proceso:', error);
        return of(MOCK_STEPS);
      })
    );
  }

  // Obtener FAQs
  getFaqs(): Observable<any> {
    if (this.isMockMode) {
      return of(MOCK_FAQS).pipe(delay(300));
    }
    return this.http.get(`${this.apiUrl}/faqs`).pipe(
      delay(300),
      catchError(error => {
        console.error('Error cargando FAQs:', error);
        return of(MOCK_FAQS);
      })
    );
  }

  // Obtener información de contacto
  getContactInfo(): Observable<any> {
    if (this.isMockMode) {
      return of(MOCK_CONTACT).pipe(delay(300));
    }
    return this.http.get(`${this.apiUrl}/contact-info`).pipe(
      delay(300),
      catchError(error => {
        console.error('Error cargando información de contacto:', error);
        return of(MOCK_CONTACT);
      })
    );
  }
}
