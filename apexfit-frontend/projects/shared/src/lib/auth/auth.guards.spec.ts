import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';
import { accessGuard, guestGuard, rolGuard } from './auth.guards';
import { ExternalNavigator } from './external-navigator';
import { ALLOWED_ROLES, API_URL, LOGIN_URL } from './auth.tokens';
import { fakeJwt } from './test-utils';

function setup(rolGuardado?: string, opts: { allowed?: string[]; loginUrl?: string | null } = {}) {
  localStorage.clear();
  if (rolGuardado) {
    localStorage.setItem(
      'apexfit.session',
      JSON.stringify({ token: fakeJwt(3600), id: 1, correo: 'a@apexfit.test', rol: rolGuardado }),
    );
  }
  const go = vi.fn();
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: API_URL, useValue: '/api/v1' },
      { provide: ALLOWED_ROLES, useValue: opts.allowed ?? ['cliente'] },
      { provide: LOGIN_URL, useValue: opts.loginUrl ?? null },
      { provide: ExternalNavigator, useValue: { go } },
    ],
  });
  return { router: TestBed.inject(Router), go };
}

const route = {} as ActivatedRouteSnapshot;
const state = (url: string) => ({ url }) as RouterStateSnapshot;
const run = (guard: typeof accessGuard, url = '/') =>
  TestBed.runInInjectionContext(() => guard(route, state(url)));

describe('guards con login interno (app de usuarios)', () => {
  it('accessGuard: sin sesión manda a /login con returnUrl', () => {
    const { router } = setup();
    const result = run(accessGuard, '/rutina') as UrlTree;
    expect(router.serializeUrl(result)).toBe('/login?returnUrl=%2Frutina');
  });

  it('accessGuard: con sesión y rol permitido deja pasar', () => {
    setup('cliente');
    expect(run(accessGuard)).toBe(true);
  });

  it('accessGuard: con un rol que no corresponde cierra la sesión y avisa', () => {
    const { router } = setup('entrenador');
    const result = run(accessGuard) as UrlTree;
    expect(router.serializeUrl(result)).toBe('/login?motivo=sin-acceso');
    expect(localStorage.getItem('apexfit.session')).toBeNull();
  });

  it('guestGuard: con sesión válida redirige a inicio; sin sesión deja ver el login', () => {
    const { router } = setup('cliente');
    expect(router.serializeUrl(run(guestGuard) as UrlTree)).toBe('/');
    TestBed.resetTestingModule();
    setup();
    expect(run(guestGuard)).toBe(true);
  });
});

describe('guards con login externo (panel)', () => {
  const panel = { allowed: ['entrenador', 'administrador'], loginUrl: 'http://usuarios.test/login' };

  it('accessGuard: sin sesión sale hacia el login de la app de usuarios', () => {
    const { go } = setup(undefined, panel);
    expect(run(accessGuard, '/clientes')).toBe(false);
    expect(go).toHaveBeenCalledWith('http://usuarios.test/login');
  });

  it('accessGuard: con sesión de entrenador deja pasar', () => {
    const { go } = setup('entrenador', panel);
    expect(run(accessGuard)).toBe(true);
    expect(go).not.toHaveBeenCalled();
  });

  it('accessGuard: una sesión de cliente se borra y se le avisa en el login', () => {
    const { go } = setup('cliente', panel);
    expect(run(accessGuard)).toBe(false);
    expect(go).toHaveBeenCalledWith('http://usuarios.test/login?motivo=sin-acceso');
    expect(localStorage.getItem('apexfit.session')).toBeNull();
  });
});

describe('rolGuard', () => {
  const panel = { allowed: ['entrenador', 'administrador'], loginUrl: 'http://usuarios.test/login' };
  const correr = (...roles: Parameters<typeof rolGuard>) =>
    TestBed.runInInjectionContext(() => rolGuard(...roles)(route, state('/usuarios')));

  it('deja pasar al rol permitido', () => {
    setup('administrador', panel);
    expect(correr('administrador')).toBe(true);
  });

  it('acepta varios roles', () => {
    setup('entrenador', panel);
    expect(correr('entrenador', 'administrador')).toBe(true);
  });

  it('si el rol no corresponde, vuelve al inicio', () => {
    const { router } = setup('entrenador', panel);
    expect(router.serializeUrl(correr('administrador') as UrlTree)).toBe('/');
  });

  it('sin sesión también vuelve al inicio (allí el accessGuard decide)', () => {
    const { router } = setup(undefined, panel);
    expect(router.serializeUrl(correr('administrador') as UrlTree)).toBe('/');
  });
});
