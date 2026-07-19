import { TestBed } from '@angular/core/testing';
import { SessionContext } from './session-context';

describe('SessionContext', () => {
  let session: SessionContext;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    session = TestBed.inject(SessionContext);
  });

  it('starts without an authenticated user', () => {
    expect(session.isAuthenticated()).toBe(false);
  });

  it('rejects invalid credentials', () => {
    expect(session.login('andrea.torres@speedlink.mx', 'incorrecta', true).success).toBe(false);
    expect(session.isAuthenticated()).toBe(false);
  });

  it('creates and persists a valid session', () => {
    expect(session.login('andrea.torres@speedlink.mx', 'SpeedLink2026!', true).success).toBe(true);
    expect(session.isAuthenticated()).toBe(true);
    expect(localStorage.getItem('speedlink-session')).toContain('andrea.torres@speedlink.mx');
  });

  it('removes the session on logout', () => {
    session.login('andrea.torres@speedlink.mx', 'SpeedLink2026!', false);
    session.logout();
    expect(session.isAuthenticated()).toBe(false);
    expect(sessionStorage.getItem('speedlink-session')).toBeNull();
    expect(localStorage.getItem('speedlink-session')).toBeNull();
  });
});
