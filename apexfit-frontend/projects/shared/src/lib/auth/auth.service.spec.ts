import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { AuthService } from './auth.service';
import { Rol, Session, rolFromAuthorities } from './auth.models';
import { ExternalNavigator } from './external-navigator';
import { ALLOWED_ROLES, API_URL, LOGIN_URL } from './auth.tokens';
import { fakeJwt } from './test-utils';

function setup(allowed: readonly Rol[] = ['cliente'], loginUrl: string | null = null) {
  const go = vi.fn();
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: API_URL, useValue: '/api/v1' },
      { provide: ALLOWED_ROLES, useValue: allowed },
      { provide: LOGIN_URL, useValue: loginUrl },
      { provide: ExternalNavigator, useValue: { go } },
    ],
  });
  return {
    auth: TestBed.inject(AuthService),
    http: TestBed.inject(HttpTestingController),
    router: TestBed.inject(Router),
    go,
  };
}

const sesion = (rol: Rol, expiresIn = 3600): Session => ({
  token: fakeJwt(expiresIn), id: 1, correo: `${rol}@apexfit.test`, rol,
});

describe('rolFromAuthorities', () => {
  it('convierte ROLE_CLIENTE en cliente', () => {
    expect(rolFromAuthorities(['ROLE_CLIENTE'])).toBe('cliente');
    expect(rolFromAuthorities(['ROLE_ADMINISTRADOR'])).toBe('administrador');
  });

  it('devuelve null si no reconoce el rol', () => {
    expect(rolFromAuthorities(['ROLE_OTRO'])).toBeNull();
    expect(rolFromAuthorities([])).toBeNull();
  });
});

describe('AuthService', () => {
  beforeEach(() => localStorage.clear());

  it('login guarda la sesión y da acceso si el rol está permitido', () => {
    const { auth, http } = setup(['cliente']);
    const token = fakeJwt(3600);

    auth.login('cliente@apexfit.test', 'Prueba123').subscribe();
    const req = http.expectOne('/api/v1/auth/login');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ correo: 'cliente@apexfit.test', contrasena: 'Prueba123' });
    req.flush({ token, type: 'Bearer', id: 1, correo: 'cliente@apexfit.test', roles: ['ROLE_CLIENTE'] });

    expect(auth.isLoggedIn()).toBe(true);
    expect(auth.hasAccess()).toBe(true);
    expect(auth.session()?.rol).toBe('cliente');
    expect(auth.token()).toBe(token);
    expect(localStorage.getItem('apexfit.session')).toContain('cliente@apexfit.test');
  });

  it('un rol que no entra a esta app: devuelve la sesión pero NO la guarda aquí', () => {
    const { auth, http } = setup(['cliente']);
    let devuelta: Session | undefined;

    auth.login('entrenador@apexfit.test', 'Prueba123').subscribe((s) => (devuelta = s));
    http.expectOne('/api/v1/auth/login').flush({
      token: fakeJwt(3600), type: 'Bearer', id: 2, correo: 'entrenador@apexfit.test', roles: ['ROLE_ENTRENADOR'],
    });

    expect(devuelta?.rol).toBe('entrenador');
    expect(auth.isLoggedIn()).toBe(false);
    expect(auth.hasAccess()).toBe(false);
    expect(localStorage.getItem('apexfit.session')).toBeNull();
  });

  it('falla si el backend no envía un rol conocido', () => {
    const { auth, http } = setup();
    let message = '';

    auth.login('x@apexfit.test', 'Prueba123').subscribe({ error: (e: Error) => (message = e.message) });
    http.expectOne('/api/v1/auth/login').flush({
      token: fakeJwt(3600), type: 'Bearer', id: 3, correo: 'x@apexfit.test', roles: [],
    });

    expect(message).toBe('SIN_ROL');
    expect(auth.isLoggedIn()).toBe(false);
  });

  it('restaura una sesión guardada que no ha vencido', () => {
    localStorage.setItem('apexfit.session', JSON.stringify(sesion('cliente')));
    const { auth } = setup();
    expect(auth.hasAccess()).toBe(true);
  });

  it('descarta una sesión guardada con el token vencido', () => {
    localStorage.setItem('apexfit.session', JSON.stringify(sesion('cliente', -60)));
    const { auth } = setup();
    expect(auth.isLoggedIn()).toBe(false);
    expect(localStorage.getItem('apexfit.session')).toBeNull();
  });

  describe('acceptSession (traspaso desde otra app)', () => {
    it('acepta y guarda una sesión válida de un rol permitido', () => {
      const { auth } = setup(['entrenador', 'administrador']);
      expect(auth.acceptSession(sesion('entrenador'))).toBe(true);
      expect(auth.hasAccess()).toBe(true);
      expect(localStorage.getItem('apexfit.session')).toContain('entrenador@apexfit.test');
    });

    it('rechaza una sesión con el token vencido', () => {
      const { auth } = setup(['entrenador', 'administrador']);
      expect(auth.acceptSession(sesion('entrenador', -60))).toBe(false);
      expect(auth.isLoggedIn()).toBe(false);
    });

    it('rechaza una sesión de un rol que no entra a esta app', () => {
      const { auth } = setup(['entrenador', 'administrador']);
      expect(auth.acceptSession(sesion('cliente'))).toBe(false);
      expect(localStorage.getItem('apexfit.session')).toBeNull();
    });
  });

  describe('cerrar sesión / ir al login', () => {
    it('con login interno: borra la sesión y navega a /login', () => {
      localStorage.setItem('apexfit.session', JSON.stringify(sesion('cliente')));
      const { auth, router, go } = setup();
      const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);

      auth.logout();

      expect(auth.isLoggedIn()).toBe(false);
      expect(localStorage.getItem('apexfit.session')).toBeNull();
      expect(navigate).toHaveBeenCalledWith(['/login']);
      expect(go).not.toHaveBeenCalled();
    });

    it('con login externo: borra la sesión y sale hacia el login de la otra app', () => {
      localStorage.setItem('apexfit.session', JSON.stringify(sesion('entrenador')));
      const { auth, router, go } = setup(['entrenador'], 'http://usuarios.test/login');
      const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);

      auth.logout();

      expect(auth.isLoggedIn()).toBe(false);
      expect(go).toHaveBeenCalledWith('http://usuarios.test/login');
      expect(navigate).not.toHaveBeenCalled();
    });

    it('goToLogin con motivo agrega ?motivo=sin-acceso', () => {
      const { auth, go } = setup(['entrenador'], 'http://usuarios.test/login');
      auth.goToLogin('sin-acceso');
      expect(go).toHaveBeenCalledWith('http://usuarios.test/login?motivo=sin-acceso');
    });
  });
});
