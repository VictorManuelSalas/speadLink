import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => TestBed.configureTestingModule({ imports: [App], providers: [provideRouter([])] }).compileComponents());
  it('creates the application root', () => expect(TestBed.createComponent(App).componentInstance).toBeTruthy());
  it('renders a router outlet', () => expect(TestBed.createComponent(App).nativeElement.querySelector('router-outlet')).toBeTruthy());
});
