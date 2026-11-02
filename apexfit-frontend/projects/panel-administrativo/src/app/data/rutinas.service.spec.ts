import { HttpTestingController, TestRequest } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { guardarSesion, proveedoresPanel } from '../testing';
import { NuevaRutina, ResultadoAsignacion } from './rutinas.models';
import { RutinasService } from './rutinas.service';

function preparar(conSesion = true) {
  localStorage.clear();
  if (conSesion) guardarSesion('entrenador', 'mario@apexfit.test', 2);
  TestBed.configureTestingModule({ providers: [provideRouter([]), ...proveedoresPanel()] });
  return { servicio: TestBed.inject(RutinasService), http: TestBed.inject(HttpTestingController) };
}

const plan: NuevaRutina = {
  nombre: 'Fuerza semana 6', descripcion: null,
  lineas: [
    { idEjercicio: 4, dia: 'lunes', series: 4, repeticiones: 10, descansoSeg: 60 },
    { idEjercicio: 5, dia: 'jueves', series: 3, repeticiones: 8, descansoSeg: null },
  ],
};

const pagina = (content: unknown[]) => ({ content, totalElements: content.length });
const rutinaDto = (id: number, estado: string) => ({ idRutina: id, nombre: `R${id}`, descripcion: null, idEntrenador: 2, idCliente: 5, estado });

const get = (http: HttpTestingController, cliente: number): TestRequest =>
  http.expectOne((r) => r.method === 'GET' && r.url === `/api/v1/rutinas/cliente/${cliente}` && r.params.get('size') === '50');

describe('RutinasService (panel)', () => {
  it('ejercicios: pide el catálogo (hasta 200) y lo ordena por nombre', () => {
    const { servicio, http } = preparar();
    let nombres: string[] = [];
    servicio.ejercicios().subscribe((l) => (nombres = l.map((e) => e.nombre)));
    const req = http.expectOne((r) => r.url === '/api/v1/ejercicios');
    expect(req.request.params.get('size')).toBe('200');
    req.flush(pagina([{ idEjercicio: 2, nombre: 'Press banca', grupoMuscular: 'pecho' }, { idEjercicio: 1, nombre: 'Abdominales', grupoMuscular: null }]));
    expect(nombres).toEqual(['Abdominales', 'Press banca']);
  });

  describe('asignar', () => {
    it('crea la rutina, agrega cada ejercicio EN ORDEN y solo después desactiva la anterior', () => {
      const { servicio, http } = preparar();
      let res: ResultadoAsignacion[] = [];
      servicio.asignar(plan, [5]).subscribe((r) => (res = r));

      get(http, 5).flush(pagina([rutinaDto(8, 'inactiva'), rutinaDto(9, 'activa')]));

      const crear = http.expectOne('/api/v1/rutinas');
      expect(crear.request.method).toBe('POST');
      expect(crear.request.body).toEqual({ nombre: 'Fuerza semana 6', descripcion: null, idEntrenador: 2, idCliente: 5, estado: 'activa' });
      crear.flush(rutinaDto(20, 'activa'));

      // el segundo ejercicio no se envía hasta que el primero terminó
      const e1 = http.expectOne('/api/v1/rutina-ejercicios');
      expect(e1.request.body).toEqual({ idRutina: 20, idEjercicio: 4, diaSemana: 'lunes', series: 4, repeticiones: 10, descansoSeg: 60 });
      http.expectNone('/api/v1/rutinas/9'); // todavía no se desactiva la anterior
      e1.flush({});
      const e2 = http.expectOne('/api/v1/rutina-ejercicios');
      expect(e2.request.body).toEqual({ idRutina: 20, idEjercicio: 5, diaSemana: 'jueves', series: 3, repeticiones: 8, descansoSeg: null });
      e2.flush({});

      const desactivar = http.expectOne('/api/v1/rutinas/9');
      expect(desactivar.request.method).toBe('DELETE');
      desactivar.flush(null);
      http.verify();

      expect(res).toEqual([{ idCliente: 5, ok: true }]);
    });

    it('si el cliente no tenía rutina activa, no desactiva nada', () => {
      const { servicio, http } = preparar();
      let res: ResultadoAsignacion[] = [];
      servicio.asignar({ ...plan, lineas: [plan.lineas[0]] }, [5]).subscribe((r) => (res = r));
      get(http, 5).flush(pagina([]));
      http.expectOne('/api/v1/rutinas').flush(rutinaDto(20, 'activa'));
      http.expectOne('/api/v1/rutina-ejercicios').flush({});
      http.verify();
      expect(res).toEqual([{ idCliente: 5, ok: true }]);
    });

    it('si falla un ejercicio, DESACTIVA la rutina a medias y NO toca la anterior', () => {
      const { servicio, http } = preparar();
      let res: ResultadoAsignacion[] = [];
      servicio.asignar(plan, [5]).subscribe((r) => (res = r));

      get(http, 5).flush(pagina([rutinaDto(9, 'activa')]));
      http.expectOne('/api/v1/rutinas').flush(rutinaDto(20, 'activa'));
      http.expectOne('/api/v1/rutina-ejercicios').flush({});
      http.expectOne('/api/v1/rutina-ejercicios').flush('x', { status: 500, statusText: 'Error' });

      const deshacer = http.expectOne('/api/v1/rutinas/20');
      expect(deshacer.request.method).toBe('DELETE');
      deshacer.flush(null);
      http.expectNone('/api/v1/rutinas/9'); // la rutina anterior sigue activa
      http.verify();

      expect(res).toHaveLength(1);
      expect(res[0]).toMatchObject({ idCliente: 5, ok: false });
    });

    it('si la rutina nueva quedó bien pero no se puede desactivar la anterior, avisa sin marcarlo como fallo', () => {
      const { servicio, http } = preparar();
      let res: ResultadoAsignacion[] = [];
      servicio.asignar({ ...plan, lineas: [plan.lineas[0]] }, [5]).subscribe((r) => (res = r));
      get(http, 5).flush(pagina([rutinaDto(9, 'activa')]));
      http.expectOne('/api/v1/rutinas').flush(rutinaDto(20, 'activa'));
      http.expectOne('/api/v1/rutina-ejercicios').flush({});
      http.expectOne('/api/v1/rutinas/9').flush('x', { status: 403, statusText: 'Forbidden' });

      expect(res[0]).toMatchObject({ idCliente: 5, ok: true });
      expect(res[0].advertencia).toContain('no se pudo desactivar la anterior');
    });

    it('si falla al leer las rutinas actuales, no crea nada', () => {
      const { servicio, http } = preparar();
      let res: ResultadoAsignacion[] = [];
      servicio.asignar(plan, [5]).subscribe((r) => (res = r));
      get(http, 5).flush('x', { status: 500, statusText: 'Error' });
      http.verify();
      expect(res[0]).toMatchObject({ idCliente: 5, ok: false });
    });

    it('con varios clientes va de uno en uno y un fallo no detiene a los demás', () => {
      const { servicio, http } = preparar();
      let res: ResultadoAsignacion[] = [];
      servicio.asignar({ ...plan, lineas: [plan.lineas[0]] }, [5, 6]).subscribe((r) => (res = r));

      get(http, 5).flush('x', { status: 500, statusText: 'Error' }); // el 5 falla
      get(http, 6).flush(pagina([])); // recién ahora se pide el 6
      http.expectOne('/api/v1/rutinas').flush({ ...rutinaDto(21, 'activa'), idCliente: 6 });
      http.expectOne('/api/v1/rutina-ejercicios').flush({});

      expect(res.map((r) => [r.idCliente, r.ok])).toEqual([[5, false], [6, true]]);
    });

    it('sin sesión falla sin llamar al backend', () => {
      const { servicio, http } = preparar(false);
      let fallo = false;
      servicio.asignar(plan, [5]).subscribe({ error: () => (fallo = true) });
      http.verify();
      expect(fallo).toBe(true);
    });
  });
});
