import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { LanguageService } from './core/i18n/language.service';

describe('App', () => {
  beforeEach(async () =>
    TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])],
    }).compileComponents(),
  );
  it('creates the application root', () =>
    expect(TestBed.createComponent(App).componentInstance).toBeTruthy());
  it('renders a router outlet', () =>
    expect(TestBed.createComponent(App).nativeElement.querySelector('router-outlet')).toBeTruthy());
  it('translates known interface labels to English', () =>
    expect(TestBed.inject(LanguageService).translate('Clientes', 'en')).toBe('Customers'));
  it('translates dynamic interface phrases to English', () =>
    expect(TestBed.inject(LanguageService).translate('4 resultados', 'en')).toBe('4 results'));
});
