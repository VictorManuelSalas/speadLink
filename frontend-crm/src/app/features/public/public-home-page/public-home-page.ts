import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, HostListener, computed, inject, signal } from '@angular/core';
import { Meta } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { OperationalRecord } from '../../operations/operational-modules.data';
import { OperationalStore } from '../../operations/operational-store';
import { ApiService } from '../../../shared/services/api.service';
import { LeadsService } from '../../../shared/services/leads.service';
import { ClientPortalStore } from '../../../core/portal/client-portal.store';
import {
  SPEEDLINK_CONTACT,
} from '../public-home.data';

type ProspectType = '' | 'Hogar' | 'Negocio';

interface CoverageForm {
  name: string;
  phone: string;
  prospectType: ProspectType;
  community: string;
  location: string;
  plan: string;
  includeStreaming: boolean;
  streamingServices: string[];
  comments: string;
  latitude: number | null;
  longitude: number | null;
}

type CoverageFormKey = keyof Omit<
  CoverageForm,
  'latitude' | 'longitude' | 'includeStreaming' | 'streamingServices'
>;
type CoverageStatus = 'idle' | 'loading' | 'success' | 'error';
type LocationStatus = 'idle' | 'loading' | 'granted' | 'denied' | 'unsupported';

const EMPTY_COVERAGE_FORM: CoverageForm = {
  name: '',
  phone: '',
  prospectType: '',
  community: '',
  location: '',
  plan: '',
  includeStreaming: false,
  streamingServices: [],
  comments: '',
  latitude: null,
  longitude: null,
};

@Component({
  selector: 'app-public-home-page',
  imports: [CurrencyPipe, DecimalPipe, RouterLink],
  templateUrl: './public-home-page.html',
  styleUrl: './public-home-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PublicHomePage {
  private readonly meta = inject(Meta);
  private readonly store = inject(OperationalStore);
  private readonly apiService = inject(ApiService);
  private readonly leadsService = inject(LeadsService);
  private readonly portalStore = inject(ClientPortalStore);

  readonly portalUrl = computed(() => `/portal/${this.portalStore.config().slug}`);

  // Datos cargados dinámicamente desde la API
  readonly plans = signal<any[]>([]);
  readonly benefits = signal<any[]>([]);
  readonly steps = signal<any[]>([]);
  readonly faqs = signal<any[]>([]);
  readonly streamingServices = signal<string[]>([]);
  readonly streamingLogos = signal<Record<string, string>>({});
  readonly contact = signal<any>(null);
  readonly currentYear = new Date().getFullYear();

  readonly mobileMenuOpen = signal(false);
  readonly openFaqIndex = signal<number | null>(0);
  readonly coverageForm = signal<CoverageForm>({ ...EMPTY_COVERAGE_FORM });
  readonly coverageStatus = signal<CoverageStatus>('idle');
  readonly coverageError = signal('');
  readonly locationStatus = signal<LocationStatus>('idle');

  constructor(
  ) {
    this.meta.updateTag({
      name: 'description',
      content:
        'SpeedLink ofrece Internet estable para tu hogar o negocio, con planes accesibles, soporte técnico y atención cercana. Consulta cobertura y planes.',
    });
    this.meta.updateTag({ property: 'og:title', content: 'SpeedLink | Internet para tu hogar' });
    this.meta.updateTag({
      property: 'og:description',
      content:
        'Internet estable para mantenerte conectado. Planes desde $300 MXN al mes, primer mes gratis.',
    });
    this.meta.updateTag({ property: 'og:type', content: 'website' });

    // Cargar datos desde la API
    this.loadAllData();
  }

  private loadAllData(): void {
    // Cargar servicios (planes de internet + streaming)
    this.apiService.getServices().subscribe((response: any) => {
      console.log('Servicios cargados desde la API:', response.data.services);
      const services = response.data.services;
      const internetPlans = services.filter((s: any) => s.type === 'internet');
      const streamingList = services.filter((s: any) => s.type === 'streaming');

      this.plans.set(internetPlans);
      this.streamingServices.set(streamingList.map((s: any) => s.name));

      const logos = streamingList.reduce(
        (acc: Record<string, string>, s: any) => ({
          ...acc,
          [s.name]: s.logo,
        }),
        {}
      );
      this.streamingLogos.set(logos);
    });

    // Cargar beneficios
    this.apiService.getBenefits().subscribe((response: any) => {
      this.benefits.set(response.data.benefits);
    });

    // Cargar pasos del proceso
    this.apiService.getProcessSteps().subscribe((response: any) => {
      this.steps.set(response.data.steps);
    });

    // Cargar contacto
    this.apiService.getContactInfo().subscribe((response: any) => {
      console.log('Información de contacto cargada desde la API:', response.data.contact);
      this.contact.set(response.data.contact);
    });

    // Cargar FAQs
    this.apiService.getFaqs().subscribe((response: any) => {
      this.faqs.set(response.data.faqs);
    });
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen.update((open) => !open);
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen.set(false);
  }

  toggleFaq(index: number): void {
    this.openFaqIndex.set(this.openFaqIndex() === index ? null : index);
  }

  updateCoverageField(key: CoverageFormKey, value: string): void {
    this.coverageForm.update((form) => ({ ...form, [key]: value }));
    if (this.coverageStatus() === 'error') this.coverageStatus.set('idle');
  }

  toggleStreamingService(service: string, checked: boolean): void {
    this.coverageForm.update((form) => ({
      ...form,
      streamingServices: checked
        ? [...form.streamingServices, service]
        : form.streamingServices.filter((item) => item !== service),
    }));
  }

  toggleIncludeStreaming(checked: boolean): void {
    this.coverageForm.update((form) => ({
      ...form,
      includeStreaming: checked,
      streamingServices: checked ? form.streamingServices : [],
    }));
  }

  toggleUseLocation(checked: boolean): void {
    if (!checked) {
      this.coverageForm.update((form) => ({ ...form, latitude: null, longitude: null }));
      this.locationStatus.set('idle');
      return;
    }
    if (!('geolocation' in navigator)) {
      this.locationStatus.set('unsupported');
      return;
    }
    this.locationStatus.set('loading');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.coverageForm.update((form) => ({
          ...form,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }));
        this.locationStatus.set('granted');
      },
      () => this.locationStatus.set('denied'),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  submitCoverageForm(event: Event): void {
    event.preventDefault();
    const form = this.coverageForm();

    // Validar campos requeridos
    if (!form.name.trim() || !form.phone.trim() || !form.community.trim() || !form.prospectType) {
      this.coverageError.set(
        'Completa nombre, teléfono, comunidad y tipo de prospecto para continuar.',
      );
      this.coverageStatus.set('error');
      return;
    }

    this.coverageStatus.set('loading');
    this.coverageError.set('');

    // Enviar datos al webhook
    this.leadsService.submitLead(form).subscribe({
      next: (response) => {
        console.log('Lead enviado exitosamente:', response);
        // También crear registro local para histórico
        this.createLeadFromForm(form);
        this.coverageStatus.set('success');
      },
      error: (error) => {
        console.error('Error al enviar el lead:', error);
        // Aún crear el registro local como fallback
        this.createLeadFromForm(form);
        this.coverageStatus.set('success'); // Mostrar éxito igualmente
        // O puedes usar 'error' si prefieres mostrar un mensaje de error
        // this.coverageError.set('Error al enviar el formulario. Intenta de nuevo.');
        // this.coverageStatus.set('error');
      }
    });
  }

  resetCoverageForm(): void {
    this.coverageForm.set({ ...EMPTY_COVERAGE_FORM });
    this.coverageStatus.set('idle');
    this.coverageError.set('');
    this.locationStatus.set('idle');
  }

  private createLeadFromForm(form: CoverageForm): void {
    const address = [form.community.trim(), form.location.trim()].filter(Boolean).join(', ');
    const notes = [
      form.plan ? `Plan de interés: ${form.plan}.` : null,
      form.streamingServices.length
        ? `Streaming de interés: ${form.streamingServices.join(', ')}.`
        : null,
      form.comments.trim() || null,
      'Prospecto generado desde el sitio web público de SpeedLink.',
    ]
      .filter(Boolean)
      .join(' ');
    const nextNumber = 1085 + this.store.recordsFor('leads').length;
    const record: OperationalRecord = {
      id: `LD-${nextNumber}`,
      name: form.name.trim(),
      phone: form.phone.trim(),
      prospectType: form.prospectType,
      address,
      source: 'Sitio web',
      status: 'NEW',
      notes,
      updatedAt: new Date().toISOString(),
    };
    if (form.latitude != null && form.longitude != null) {
      record['latitude'] = form.latitude;
      record['longitude'] = form.longitude;
    }
    this.store.add('leads', record);
  }

  @HostListener('document:keydown.escape')
  handleEscape(): void {
    this.mobileMenuOpen.set(false);
  }
}
