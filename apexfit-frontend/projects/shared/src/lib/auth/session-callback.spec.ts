import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Session } from './auth.models';
import { ExternalNavigator } from './external-navigator';
import { SessionCallback } from './session-callback';
import { encodeSession } from './session-transfer';
import { ALLOWED_ROLES, API_URL, LOGIN_URL } from './auth.tokens';
import { fakeJwt } from './test-utils';

function crear(fragment: string | null) {
  const go = vi.fn();
  TestBed.configureTestingModule({
    imports: [SessionCallback],
    providers: [
      provideRouter([]),
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: API_URL, useValue: '/api/v1' },
      { provide: ALLOWED_ROLES, useValue: ['entrenador', 'administrador'] },
      { provide: LOGIN_URL, useValue: 'http://usuarios.test/login' },
      { provide: ExternalNavigator, useValue: { go } },
      { provide: ActivatedRoute, useValue: { snapshot: { fragment } } },
    ],
  });
  const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  TestBed.createComponent(SessionCallback);
  return { go, navigate };
}

const sesion = (rol: Session['rol'], expiresIn = 3600): Session => ({
  token: fakeJwt(expiresIn), id: 5, correo: `${rol}@apexfit.test`, rol,
});

describe('SessionCallback', () => {
  beforeEach(() => localStorage.clear());

  it('guarda la sesión recibida y limpia la URL (replaceUrl)', () => {
    const { go, navigate } = crear(`s=${encodeSession(sesion('administrador'))}`);

    expect(localStorage.getItem('apexfit.session')).toContain('administrador@apexfit.test');
    expect(navigate).toHaveBeenCalledWith(['/'], { replaceUrl: true });
    expect(go).not.toHaveBeenCalled();
  });

  it('sin sesión en la URL, manda al login único', () => {
    const { go, navigate } = crear(null);

    expect(localStorage.getItem('apexfit.session')).toBeNull();
    expect(navigate).not.toHaveBeenCalled();
    expect(go).toHaveBeenCalledWith('http://usuarios.test/login');
  });

  it('una sesión de cliente (rol que no entra al panel) no se acepta', () => {
    const { go } = crear(`s=${encodeSession(sesion('cliente'))}`);

    expect(localStorage.getItem('apexfit.session')).toBeNull();
    expect(go).toHaveBeenCalledWith('http://usuarios.test/login');
  });

  it('una sesión con el token vencido no se acepta', () => {
    const { go } = crear(`s=${encodeSession(sesion('entrenador', -60))}`);

    expect(localStorage.getItem('apexfit.session')).toBeNull();
    expect(go).toHaveBeenCalledWith('http://usuarios.test/login');
  });

  it('con el router real: termina en "/" y la URL ya no lleva el token', async () => {
    @Component({ template: 'inicio' })
    class Inicio {}

    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'sesion', component: SessionCallback },
          { path: '', component: Inicio },
        ]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: '/api/v1' },
        { provide: ALLOWED_ROLES, useValue: ['entrenador', 'administrador'] },
        { provide: LOGIN_URL, useValue: 'http://usuarios.test/login' },
        { provide: ExternalNavigator, useValue: { go: vi.fn() } },
      ],
    });

    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(`/sesion#s=${encodeSession(sesion('entrenador'))}`);
    await harness.fixture.whenStable();

    const router = TestBed.inject(Router);
    expect(router.url).toBe('/');
    expect(router.url).not.toContain('s=');
    expect(localStorage.getItem('apexfit.session')).toContain('entrenador@apexfit.test');
  });
});
