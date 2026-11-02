import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { proveedoresPanel } from '../testing';
import { Asignacion } from './asignaciones.models';
import { AsignacionesService, DatosAsignaciones } from './asignaciones.service';

function preparar() {
  TestBed.configureTestingModule({ providers: [provideRouter([]), ...proveedoresPanel()] });
  return { servicio: TestBed.inject(AsignacionesService), http: TestBed.inject(HttpTestingController) };
}

const asig = (id: number, idEntrenador: number, idCliente: number, vigente = true): Asignacion => ({
  id, idEntrenador, idCliente, desde: '2026-10-01', estado: vigente ? 'activa' : 'inactiva', vigente,
});

const dto = (id: number, estado = 'activa') => ({ idAsignacion: id, idEntrenador: 10, idCliente: 1, fechaAsignacion: '2026-10-19T08:00:00', estado });

describe('AsignacionesService', () => {
  it('listar: pide las asignaciones y los usuarios, y entrega todo convertido', () => {
    const { servicio, http } = preparar();
    let r: DatosAsignaciones | undefined;
    servicio.listar().subscribe((datos) => (r = datos));

    http.expectOne('/api/v1/entrenador-cliente').flush([dto(1), dto(2, 'inactiva')]);
    http.expectOne((r) => r.url === '/api/v1/usuarios').flush({
      content: [
        { idUsuario: 1, nombre: 'Carlos', apellido: 'Pérez', correo: 'c@apexfit.test', idRol: 1, telefono: null, fechaNacimiento: null, estado: 'activo' },
      ],
      totalElements: 1,
    });

    expect(r?.asignaciones.map((a) => [a.id, a.vigente])).toEqual([[1, true], [2, false]]);
    expect(r?.usuarios.map((u) => u.id)).toEqual([1]);
    expect(r?.total).toBe(1);
  });

  describe('asignar', () => {
    it('pareja nueva: hace POST con entrenador, cliente y estado "activa"', () => {
      const { servicio, http } = preparar();
      let creada: Asignacion | undefined;
      servicio.asignar(10, 1, []).subscribe((a) => (creada = a));
      const req = http.expectOne('/api/v1/entrenador-cliente');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ idEntrenador: 10, idCliente: 1, estado: 'activa' });
      req.flush(dto(7));
      expect(creada?.id).toBe(7);
      http.verify();
    });

    it('si la pareja ya estuvo asignada, reactiva esa fila con PUT en vez de crear otra', () => {
      const { servicio, http } = preparar();
      servicio.asignar(10, 1, [asig(3, 10, 1, false)]).subscribe();
      const req = http.expectOne('/api/v1/entrenador-cliente/3');
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({ idAsignacion: 3, idEntrenador: 10, idCliente: 1, estado: 'activa' });
      req.flush(dto(3));
      http.verify();
    });

    it('si ya está vigente no llama al backend', () => {
      const { servicio, http } = preparar();
      let id = 0;
      servicio.asignar(10, 1, [asig(3, 10, 1)]).subscribe((a) => (id = a.id));
      expect(id).toBe(3);
      http.verify();
    });

    it('no se confunde con las filas de otras parejas', () => {
      const { servicio, http } = preparar();
      servicio.asignar(10, 1, [asig(3, 11, 1, false), asig(4, 10, 2, false)]).subscribe();
      const req = http.expectOne('/api/v1/entrenador-cliente');
      expect(req.request.method).toBe('POST');
      req.flush(dto(9));
    });
  });

  describe('quitar', () => {
    it('hace PUT con estado "inactiva" y conserva el historial (no usa DELETE)', () => {
      const { servicio, http } = preparar();
      servicio.quitar(asig(3, 10, 1), [asig(3, 10, 1)]).subscribe();
      const req = http.expectOne('/api/v1/entrenador-cliente/3');
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({ idAsignacion: 3, idEntrenador: 10, idCliente: 1, estado: 'inactiva' });
      req.flush(dto(3, 'inactiva'));
      http.verify();
    });

    it('si la pareja ya tiene otra fila inactiva, borra esta (la base no admite dos inactivas)', () => {
      const { servicio, http } = preparar();
      const vigente = asig(5, 10, 1);
      servicio.quitar(vigente, [asig(3, 10, 1, false), vigente]).subscribe();
      const req = http.expectOne('/api/v1/entrenador-cliente/5');
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
      http.verify();
    });

    it('una fila inactiva de otra pareja no obliga a borrar', () => {
      const { servicio, http } = preparar();
      const vigente = asig(5, 10, 1);
      servicio.quitar(vigente, [asig(3, 10, 2, false), vigente]).subscribe();
      expect(http.expectOne('/api/v1/entrenador-cliente/5').request.method).toBe('PUT');
    });
  });
});
