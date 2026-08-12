import { Component, Input, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OperationalStore } from '../operational-store';
import { MOCK_SERVICES } from '../../../shared/services/mock-data';

interface ServiceItem {
  id: string;
  serviceId: string;
  name: string;
  type: 'internet' | 'streaming';
  description: string;
  userDescription: string;
}

@Component({
  selector: 'app-interested-services-section',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './interested-services-section.html',
  styleUrl: './interested-services-section.scss'
})
export class InterestedServicesSectionComponent {
  @Input() recordId: string = '';

  private store = inject(OperationalStore);
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

    if (record.plan) {
      const plan = MOCK_SERVICES.data.services.find(
        s => s.type === 'internet' && s.name === record.plan
      );
      if (plan) {
        services.push({
          id: plan.id,
          serviceId: plan.id,
          name: plan.name,
          type: 'internet',
          description: `${(plan as any).speed} - $${(plan as any).monthlyPrice} MXN/mes`,
          userDescription: ''
        });
      }
    }

    if (record.streamingServices && Array.isArray(record.streamingServices)) {
      record.streamingServices.forEach((streamingName: string) => {
        const streaming = MOCK_SERVICES.data.services.find(
          s => s.type === 'streaming' && s.name === streamingName
        );
        if (streaming) {
          services.push({
            id: streaming.id,
            serviceId: streaming.id,
            name: streaming.name,
            type: 'streaming',
            description: '',
            userDescription: ''
          });
        }
      });
    }

    return services;
  }

  getAllServices() {
    return MOCK_SERVICES.data.services;
  }

  addRow(): void {
    this.services.update(s => [
      ...s,
      { id: `temp-${Date.now()}`, serviceId: '', name: '', type: 'streaming', description: '', userDescription: '' }
    ]);
  }

  removeRow(id: string): void {
    this.services.update(s => s.filter(item => item.id !== id));
  }

  onServiceChange(item: ServiceItem, serviceId: string): void {
    const service = MOCK_SERVICES.data.services.find(s => s.id === serviceId);
    if (service) {
      item.serviceId = serviceId;
      item.name = service.name;
      item.type = service.type as 'internet' | 'streaming';
      item.description = service.type === 'internet'
        ? `${(service as any).speed} - $${(service as any).monthlyPrice} MXN/mes`
        : '';
    }
  }

  getAvailableServices(currentRowId: string): any[] {
    const selectedIds = this.services()
      .filter(s => s.id !== currentRowId && s.serviceId)
      .map(s => s.serviceId);

    // Verificar si ya hay un servicio de Internet seleccionado
    const hasInternetSelected = this.services().some(
      s => s.id !== currentRowId && s.serviceId && s.type === 'internet'
    );

    return MOCK_SERVICES.data.services.filter(s => {
      // No mostrar servicios ya seleccionados
      if (selectedIds.includes(s.id)) {
        return false;
      }

      // Si ya hay un Internet seleccionado, no mostrar otros Internets
      if (hasInternetSelected && s.type === 'internet') {
        return false;
      }

      return true;
    });
  }

  removeService(id: string): void {
    this.removeRow(id);
  }

  saveChanges(): void {
    // Solo guarda servicios con serviceId seleccionado
    const savedServices = this.services().filter(s => s.serviceId);

    if (this.recordId) {
      // Solo actualizar los campos de servicios interesados
      const updates: any = {};

      const internetService = savedServices.find(s => s.type === 'internet');
      updates['plan'] = internetService?.name || null;

      const streamingServices = savedServices
        .filter(s => s.type === 'streaming')
        .map(s => s.name);
      updates['streamingServices'] = streamingServices;

      // Pasar SOLO los campos que cambiaron (not el record completo)
      // El store comparará solo estos campos para el timeline
      this.store.update('leads', this.recordId, updates);
    }
  }
}
