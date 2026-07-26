import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, HostListener, inject, signal } from '@angular/core';
import { Meta } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { OperationalRecord } from '../../operations/operational-modules.data';
import { OperationalStore } from '../../operations/operational-store';
import {
  SPEEDLINK_BENEFITS,
  SPEEDLINK_CONTACT,
  SPEEDLINK_FAQS,
  SPEEDLINK_PLANS,
  SPEEDLINK_STEPS,
} from '../public-home.data';

type ProspectType = '' | 'Hogar' | 'Negocio';

interface CoverageForm {
  name: string;
  phone: string;
  prospectType: ProspectType;
  community: string;
  location: string;
  plan: string;
  comments: string;
  latitude: number | null;
  longitude: number | null;
}

type CoverageFormKey = keyof Omit<CoverageForm, 'latitude' | 'longitude'>;
type CoverageStatus = 'idle' | 'loading' | 'success' | 'error';
type LocationStatus = 'idle' | 'loading' | 'granted' | 'denied' | 'unsupported';

const EMPTY_COVERAGE_FORM: CoverageForm = {
  name: '',
  phone: '',
  prospectType: '',
  community: '',
  location: '',
  plan: '',
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
  readonly plans = SPEEDLINK_PLANS;
  readonly benefits = SPEEDLINK_BENEFITS;
  readonly steps = SPEEDLINK_STEPS;
  readonly faqs = SPEEDLINK_FAQS;
  readonly contact = SPEEDLINK_CONTACT;
  readonly currentYear = new Date().getFullYear();

  readonly mobileMenuOpen = signal(false);
  readonly openFaqIndex = signal<number | null>(0);
  readonly coverageForm = signal<CoverageForm>({ ...EMPTY_COVERAGE_FORM });
  readonly coverageStatus = signal<CoverageStatus>('idle');
  readonly coverageError = signal('');
  readonly locationStatus = signal<LocationStatus>('idle');

  constructor() {
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
    if (!form.name.trim() || !form.phone.trim() || !form.community.trim() || !form.prospectType) {
      this.coverageError.set(
        'Completa nombre, teléfono, comunidad y tipo de prospecto para continuar.',
      );
      this.coverageStatus.set('error');
      return;
    }
    this.coverageStatus.set('loading');
    window.setTimeout(() => {
      this.createLeadFromForm(form);
      this.coverageStatus.set('success');
    }, 600);
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
