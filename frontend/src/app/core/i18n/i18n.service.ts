import { Injectable, signal } from '@angular/core';

export interface UserLocalePreferences {
  language?: string | null;
  timezone?: string | null;
  currency?: string | null;
}

type Dictionary = Record<string, unknown>;

@Injectable({ providedIn: 'root' })
export class I18nService {
  private readonly supportedLocales = ['es-MX', 'en-US'] as const;
  private readonly dictionary = signal<Dictionary>({});

  readonly locale = signal('es-MX');
  readonly timezone = signal('America/Monterrey');
  readonly currency = signal('MXN');

  async initialize(): Promise<void> {
    const savedLocale = localStorage.getItem('speedlink.locale');
    const browserLocale = navigator.language;
    await this.setLocale(savedLocale ?? browserLocale ?? 'es-MX');
  }

  async applyUserPreferences(preferences: UserLocalePreferences): Promise<void> {
    if (preferences.timezone) this.timezone.set(preferences.timezone);
    if (preferences.currency) this.currency.set(preferences.currency);
    if (preferences.language) await this.setLocale(preferences.language);
  }

  async setLocale(requestedLocale: string): Promise<void> {
    const locale = this.resolveLocale(requestedLocale);
    const response = await fetch(`/i18n/${locale}.json`);
    if (!response.ok) throw new Error(`Unable to load locale: ${locale}`);
    this.dictionary.set(await response.json() as Dictionary);
    this.locale.set(locale);
    localStorage.setItem('speedlink.locale', locale);
    document.documentElement.lang = locale;
  }

  translate(key: string, params?: Record<string, string | number>): string {
    const value = key.split('.').reduce<unknown>((current, part) => {
      if (!current || typeof current !== 'object') return undefined;
      return (current as Record<string, unknown>)[part];
    }, this.dictionary());

    let translated = typeof value === 'string' ? value : key;
    for (const [name, replacement] of Object.entries(params ?? {})) {
      translated = translated.replaceAll(`{{${name}}}`, String(replacement));
    }
    return translated;
  }

  formatCurrency(value: number, currency = this.currency()): string {
    return new Intl.NumberFormat(this.locale(), { style: 'currency', currency }).format(value);
  }

  formatDate(value: Date | string | number, options: Intl.DateTimeFormatOptions = { dateStyle: 'medium' }): string {
    return new Intl.DateTimeFormat(this.locale(), { ...options, timeZone: this.timezone() }).format(new Date(value));
  }

  private resolveLocale(requestedLocale: string): string {
    if (this.supportedLocales.includes(requestedLocale as typeof this.supportedLocales[number])) return requestedLocale;
    const language = requestedLocale.toLowerCase().split('-')[0];
    return this.supportedLocales.find((locale) => locale.toLowerCase().startsWith(language)) ?? 'es-MX';
  }
}
