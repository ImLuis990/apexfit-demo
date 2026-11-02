import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';
import { rolGuard } from './auth.guards';
import { ALLOWED_ROLES, API_URL } from './auth.tokens';
import { fakeJwt } from './test-utils';

function preparar(rolGuardado?: string) {
  localStorage.clear();
  if (rolGuardado) {
    localStorage.setItem(
      'apexfit.session',
      JSON.stringify({ token: fakeJwt(3600), id: 1, correo: 'a@apexfit.test', rol: rolGuardado }),
    );
  }
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: API_URL, useValue: '/api/v1' },
      { provide: ALLOWED_ROLES, useValue: ['entrenador', 'administrador'] },
    ],
  });
  return TestBed.inject(Router);
}

const ejecutar = (guard: ReturnType<typeof rolGuard>) =>
  TestBed.runInInjectionContext(() => guard({} as ActivatedRouteSnapshot, { url: '/usuarios' } as RouterStateSnapshot));

describe('rolGuard', () => {
  it('deja pasar al rol permitido', () => {
    preparar('administrador');
    expect(ejecutar(rolGuard('administrador'))).toBe(true);
  });

  it('acepta varios roles permitidos', () => {
    preparar('entrenador');
    expect(ejecutar(rolGuard('entrenador', 'administrador'))).toBe(true);
  });

  it('un rol no permitido vuelve a la raíz', () => {
    const router = preparar('entrenador');
    const resultado = ejecutar(rolGuard('administrador')) as UrlTree;
    expect(router.serializeUrl(resultado)).toBe('/');
  });

  it('sin sesión también vuelve a la raíz (ahí el accessGuard decide)', () => {
    const router = preparar();
    expect(router.serializeUrl(ejecutar(rolGuard('administrador')) as UrlTree)).toBe('/');
  });
});
