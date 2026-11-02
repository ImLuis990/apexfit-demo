import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';
import { inicioGuard } from './inicio.guard';
import { guardarSesion, proveedoresPanel } from './testing';

function destino(rol?: 'administrador' | 'entrenador'): string {
  localStorage.clear();
  if (rol) guardarSesion(rol);
  TestBed.configureTestingModule({ providers: [provideRouter([]), ...proveedoresPanel()] });
  const resultado = TestBed.runInInjectionContext(() =>
    inicioGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
  ) as UrlTree;
  return TestBed.inject(Router).serializeUrl(resultado);
}

describe('inicioGuard', () => {
  it('el administrador empieza en Resumen', () => {
    expect(destino('administrador')).toBe('/resumen');
  });

  it('el entrenador empieza en Mis clientes', () => {
    expect(destino('entrenador')).toBe('/clientes');
  });
});
