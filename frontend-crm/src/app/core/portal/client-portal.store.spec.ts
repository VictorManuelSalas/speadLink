import { TestBed } from '@angular/core/testing';
import { TicketStore } from '../data-access/ticket-store';
import { ClientPortalStore } from './client-portal.store';

describe('ClientPortalStore', () => {
  let store: ClientPortalStore;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    store = TestBed.inject(ClientPortalStore);
  });

  it('publishes and unpublishes the customer portal', () => {
    store.updateConfig({ enabled: false });
    expect(store.config().enabled).toBe(false);
    expect(localStorage.getItem('speedlink-client-portal-config')).toContain('"enabled":false');
  });

  it('authenticates a portal customer with their account and PIN', () => {
    expect(store.login('SL-1044', '1044')).toBe(true);
    expect(store.authenticated()).toBe(true);
    store.logout();
    expect(store.authenticated()).toBe(false);
  });

  it('updates the customer profile persistently', () => {
    store.updateProfile({ phone: '55 0000 0000' });
    expect(store.profile().phone).toBe('55 0000 0000');
    expect(localStorage.getItem('speedlink-client-portal-profile')).toContain('55 0000 0000');
  });

  it('creates a ticket in the portal and CRM ticket store', () => {
    const ticket = store.createTicket('Prueba de conexión', 'Validar señal del servicio.', 'Media');
    expect(store.tickets()[0].id).toBe(ticket.id);
    expect(store.openTicketCount()).toBeGreaterThan(0);
    expect(TestBed.inject(TicketStore).get(ticket.id)?.channel).toBe('Portal');
  });
});
