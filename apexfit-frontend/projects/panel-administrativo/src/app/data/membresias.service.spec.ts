import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { proveedoresPanel } from '../testing';
import { MembresiasService } from './membresias.service';

function preparar() {
  TestBed.configureTestingModule({ providers: [provideRouter([]), ...proveedoresPanel()] });
  return { servicio: TestBed.inject(MembresiasService), http: TestBed.inject(HttpTestingController) };
}

const dto = (id: number, fin: string, estado = 'activa') => ({
  idMembresia: id, idUsuario: 7, tipo: 'Mensual', fechaInicio: '2026-09-01', fechaFin: fin, precio: 90000, estado,
});

describe('MembresiasService (panel)', () => {
  it('listar: pide /membresias y las devuelve con la que vence más tarde primero', () => {
    const { servicio, http } = preparar();
    let ids: number[] = [];
    servicio.listar().subscribe((l) => (ids = l.map((m) => m.id)));
    http.expectOne('/api/v1/membresias').flush([dto(1, '2026-10-01'), dto(2, '2026-12-01'), dto(3, '2026-11-01')]);
    expect(ids).toEqual([2, 3, 1]);
  });

  it('crear: hace POST sin id ni estado', () => {
    const { servicio, http } = preparar();
    servicio.crear({ idUsuario: 7, tipo: 'Mensual', fechaInicio: '2026-10-13', fechaFin: '2026-11-12', precio: 90000 }).subscribe();
    const req = http.expectOne('/api/v1/membresias');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ idUsuario: 7, tipo: 'Mensual', fechaInicio: '2026-10-13', fechaFin: '2026-11-12', precio: 90000 });
    req.flush(dto(9, '2026-11-12'));
  });

  it('actualizar: hace PUT a /membresias/{id} reenviando el idUsuario y todos los campos', () => {
    const { servicio, http } = preparar();
    const original = { id: 4, idUsuario: 7, tipo: 'Mensual', fechaInicio: '2026-09-01', fechaFin: '2026-10-01', precio: 90000, estado: 'activa' };
    servicio.actualizar(original, { tipo: 'Trimestral', fechaInicio: '2026-09-01', fechaFin: '2026-12-01', precio: 240000, estado: 'activa' }).subscribe();
    const req = http.expectOne('/api/v1/membresias/4');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({
      idMembresia: 4, idUsuario: 7, tipo: 'Trimestral', fechaInicio: '2026-09-01', fechaFin: '2026-12-01', precio: 240000, estado: 'activa',
    });
    req.flush(dto(4, '2026-12-01'));
  });

  it('cancelar: hace PUT con estado "cancelada" y NO usa DELETE (que borra la fila)', () => {
    const { servicio, http } = preparar();
    const original = { id: 4, idUsuario: 7, tipo: 'Mensual', fechaInicio: '2026-09-01', fechaFin: '2026-11-01', precio: 90000, estado: 'activa' };
    servicio.cancelar(original).subscribe();
    const req = http.expectOne('/api/v1/membresias/4');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toMatchObject({ idUsuario: 7, fechaFin: '2026-11-01', estado: 'cancelada' });
    req.flush(dto(4, '2026-11-01', 'cancelada'));
    http.verify();
  });
});
