import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { guardarSesion, proveedoresBase } from '../testing';
import { ProgresoService } from './progreso.service';

function preparar(conSesion = true) {
  localStorage.clear();
  if (conSesion) guardarSesion('cliente'); // id = 1
  TestBed.configureTestingModule({ providers: [provideRouter([]), ...proveedoresBase] });
  return { service: TestBed.inject(ProgresoService), http: TestBed.inject(HttpTestingController) };
}

describe('ProgresoService', () => {
  it('historial: pide los registros del usuario y los devuelve del más antiguo al más reciente', () => {
    const { service, http } = preparar();
    let ids: number[] = [];
    service.historial().subscribe((r) => (ids = r.map((x) => x.id)));

    // el backend los envía del más reciente al más antiguo
    http.expectOne('/api/v1/progresos/usuario/1').flush([
      { idProgreso: 2, idUsuario: 1, fecha: '2026-10-12', peso: 74.6, altura: 1.76, imc: 24.08, observaciones: null, medidas: [] },
      { idProgreso: 1, idUsuario: 1, fecha: '2026-09-01', peso: 77, altura: null, imc: null, observaciones: null, medidas: null },
    ]);

    expect(ids).toEqual([1, 2]);
  });

  it('historial sin sesión devuelve una lista vacía sin llamar al backend', () => {
    const { service, http } = preparar(false);
    let resultado: unknown;
    service.historial().subscribe((r) => (resultado = r));
    http.verify();
    expect(resultado).toEqual([]);
  });

  it('registrar: envía el cuerpo esperado con el IMC calculado y devuelve el registro guardado', () => {
    const { service, http } = preparar();
    let guardado: { id: number; peso: number } | undefined;
    service
      .registrar({ fecha: '2026-10-12', peso: 74.6, altura: 1.76, observaciones: null, medidas: { cintura: 82 } })
      .subscribe((r) => (guardado = r));

    const req = http.expectOne('/api/v1/progresos');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      idUsuario: 1, fecha: '2026-10-12', peso: 74.6, altura: 1.76, imc: 24.08,
      observaciones: null, medidas: [{ tipoMedida: 'cintura', valorCm: 82 }],
    });
    req.flush({ idProgreso: 9, idUsuario: 1, fecha: '2026-10-12', peso: 74.6, altura: 1.76, imc: 24.08, observaciones: null, medidas: [] });

    expect(guardado).toMatchObject({ id: 9, peso: 74.6 });
  });

  it('registrar sin sesión falla sin llamar al backend', () => {
    const { service, http } = preparar(false);
    let fallo = false;
    service.registrar({ fecha: '2026-10-12', peso: 70, altura: null, observaciones: null, medidas: {} }).subscribe({ error: () => (fallo = true) });
    http.verify();
    expect(fallo).toBe(true);
  });
});
