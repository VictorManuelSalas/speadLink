import { Component, Input, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OperationalStore } from '../operational-store';
import { MOCK_SERVICES } from '../../../shared/services/mock-data';

interface ServiceItem {
  id: number;
  name: string;
  type: 'internet' | 'streaming';
  description?: string;
}

@Component({
  selector: 'app-interested-services-section',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="record-section interested-services">
      <div class="section-header">
        <h3>Servicios de Interés</h3>
        <button class="button button--small" type="button" (click)="toggleAddService()">
          {{ showAddService() ? '— Cancelar' : '+ Agregar servicio' }}
        </button>
      </div>

      @if (services().length > 0) {
        <div class="services-table">
          <table>
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Servicio</th>
                <th>Descripción</th>
                <th style="width: 60px;">Acción</th>
              </tr>
            </thead>
            <tbody>
              @for (service of services(); track service.id) {
                <tr>
                  <td>
                    <span class="service-type" [class]="'type-' + service.type">
                      {{ service.type === 'internet' ? 'Internet' : 'Streaming' }}
                    </span>
                  </td>
                  <td><b>{{ service.name }}</b></td>
                  <td>{{ getServiceDescription(service) || '—' }}</td>
                  <td>
                    <button
                      class="button button--small button--ghost"
                      type="button"
                      aria-label="Eliminar servicio"
                      (click)="removeService(service.id)"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      } @else {
        <div class="empty-state">
          <p>No hay servicios de interés registrados</p>
        </div>
      }

      @if (showAddService()) {
        <div class="add-service-panel">
          <h4>Seleccionar servicio</h4>

          <div class="service-options">
            <div class="services-group">
              <h5>Planes de Internet</h5>
              @for (service of availableInternetPlans(); track service.id) {
                <button
                  class="service-option"
                  type="button"
                  (click)="addService(service)"
                  [disabled]="isServiceAdded(service.id)"
                >
                  <span class="name">{{ service.name }}</span>
                  <span class="speed" *ngIf="service.speed">({{ service.speed }})</span>
                </button>
              }
            </div>

            <div class="services-group">
              <h5>Servicios de Streaming</h5>
              @for (service of availableStreamingServices(); track service.id) {
                <button
                  class="service-option"
                  type="button"
                  (click)="addService(service)"
                  [disabled]="isServiceAdded(service.id)"
                >
                  <span class="name">{{ service.name }}</span>
                </button>
              }
            </div>
          </div>
        </div>
      }
    </section>
  `,
  styles: [`
    .interested-services {
      padding: 24px;
      border-top: 1px solid var(--border-color);

      .section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;

        h3 {
          font-size: 16px;
          font-weight: 600;
          margin: 0;
        }
      }

      .services-table {
        overflow-x: auto;

        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;

          thead {
            background: var(--bg-secondary);
            th {
              padding: 12px;
              text-align: left;
              font-weight: 600;
              color: var(--text-secondary);
              border-bottom: 1px solid var(--border-color);
            }
          }

          tbody {
            tr {
              border-bottom: 1px solid var(--border-color);

              &:hover {
                background: var(--bg-hover);
              }

              td {
                padding: 12px;

                .service-type {
                  display: inline-block;
                  padding: 4px 8px;
                  border-radius: 4px;
                  font-size: 12px;
                  font-weight: 600;
                  white-space: nowrap;

                  &.type-internet {
                    background: #E8F5FF;
                    color: #0066CC;
                  }

                  &.type-streaming {
                    background: #FFF3E0;
                    color: #E65100;
                  }
                }

                b {
                  font-weight: 600;
                }
              }
            }
          }
        }
      }

      .empty-state {
        padding: 40px 20px;
        text-align: center;
        color: var(--text-secondary);
        font-size: 14px;
      }

      .add-service-panel {
        margin-top: 20px;
        padding: 20px;
        border: 1px solid var(--border-color);
        border-radius: 8px;
        background: var(--bg-secondary);

        h4 {
          margin: 0 0 16px 0;
          font-size: 14px;
          font-weight: 600;
        }

        .service-options {
          display: flex;
          flex-direction: column;
          gap: 20px;

          .services-group {
            h5 {
              margin: 0 0 12px 0;
              font-size: 12px;
              font-weight: 600;
              color: var(--text-secondary);
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }

            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 8px;
          }

          .service-option {
            padding: 12px;
            border: 1px solid var(--border-color);
            border-radius: 6px;
            background: var(--bg-primary);
            cursor: pointer;
            font-size: 13px;
            transition: all 0.2s;
            text-align: left;

            display: flex;
            flex-direction: column;
            gap: 4px;

            .name {
              font-weight: 600;
            }

            .speed {
              font-size: 12px;
              color: var(--text-secondary);
            }

            &:hover:not(:disabled) {
              border-color: #0066CC;
              background: #F0F8FF;
            }

            &:disabled {
              opacity: 0.5;
              cursor: not-allowed;
              background: var(--bg-secondary);
            }
          }
        }
      }
    }
  `]
})
export class InterestedServicesSectionComponent {
  @Input() recordId: string = '';

  private store = inject(OperationalStore);
  showAddService = signal(false);
  services = signal<ServiceItem[]>([]);

  constructor() {
    this.loadServices();
  }

  private loadServices(): void {
    const record = this.store.recordsFor('leads').find(r => r.id === this.recordId);
    if (record) {
      this.services.set(this.extractServices(record));
    }
  }

  private extractServices(record: any): ServiceItem[] {
    const services: ServiceItem[] = [];

    // Extraer plan de internet
    if (record.plan) {
      const plan = MOCK_SERVICES.data.services.find(
        s => s.type === 'internet' && s.name === record.plan
      );
      if (plan) {
        services.push({
          id: plan.id,
          name: plan.name,
          type: 'internet',
          description: `${(plan as any).speed} - $${(plan as any).monthlyPrice} MXN/mes`
        });
      }
    }

    // Extraer servicios de streaming
    if (record.streamingServices && Array.isArray(record.streamingServices)) {
      record.streamingServices.forEach((streamingName: string) => {
        const streaming = MOCK_SERVICES.data.services.find(
          s => s.type === 'streaming' && s.name === streamingName
        );
        if (streaming) {
          services.push({
            id: streaming.id,
            name: streaming.name,
            type: 'streaming'
          });
        }
      });
    }

    return services;
  }

  availableInternetPlans() {
    return MOCK_SERVICES.data.services.filter(s => s.type === 'internet');
  }

  availableStreamingServices() {
    return MOCK_SERVICES.data.services.filter(s => s.type === 'streaming');
  }

  getServiceDescription(service: ServiceItem): string {
    const mockService = MOCK_SERVICES.data.services.find(s => s.id === service.id);
    if (mockService?.type === 'internet') {
      return `${(mockService as any).speed} - $${(mockService as any).monthlyPrice} MXN/mes`;
    }
    return '';
  }

  isServiceAdded(serviceId: number): boolean {
    return this.services().some(s => s.id === serviceId);
  }

  addService(service: any): void {
    const newService: ServiceItem = {
      id: service.id,
      name: service.name,
      type: service.type,
      description: this.getServiceDescription({ id: service.id, name: service.name, type: service.type })
    };

    this.services.update(services => [...services, newService]);
    this.updateRecordServices();
  }

  removeService(serviceId: number): void {
    this.services.update(services => services.filter(s => s.id !== serviceId));
    this.updateRecordServices();
  }

  toggleAddService(): void {
    this.showAddService.update(v => !v);
  }

  private updateRecordServices(): void {
    // Actualizar el registro con los servicios seleccionados
    const record = this.store.recordsFor('leads').find(r => r.id === this.recordId);
    if (record) {
      const updatedRecord = { ...record };

      // Actualizar plan
      const internetPlan = this.services().find(s => s.type === 'internet');
      if (internetPlan) {
        updatedRecord['plan'] = internetPlan.name;
      }

      // Actualizar servicios de streaming
      const streamingServices = this.services()
        .filter(s => s.type === 'streaming')
        .map(s => s.name);
      updatedRecord['streamingServices'] = streamingServices;

      this.store.update('leads', updatedRecord.id, updatedRecord);
    }
  }
}
