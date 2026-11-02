import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { guardarSesion, proveedoresBase } from '../testing';
import { RutinaActiva } from './rutinas.models';
import { RutinasService } from './rutinas.service';

function preparar(conSesion = true) {
  localStorage.clear();
  if (conSesion) guardarSesion('cliente'); // id = 1
  TestBed.configureTestingModule({ providers: [provideRouter([]), ...proveedoresBase] });
  return { service: TestBed.inject(RutinasService), http: TestBed.inject(HttpTestingController) };
}

const pagina = (content: unknown[]) => ({ content, totalElements: content.length });
const rutinaDto = (estado = 'activa') => ({
  idRutina: 3, nombre: 'Fuerza · semana 5', descripcion: 'Plan de fuerza', idEntrenador: 2,
  idCliente: 1, fechaCreacion: '2026-10-01T08:00:00', estado,
});
const ri = (id: number, idEjercicio: number, diaSemana: string) => ({
  idRutinaEjercicio: id, idRutina: 3, idEjercicio, diaSemana, series: 4, repeticiones: 10, descansoSeg: 60,
});

describe('RutinasService', () => {
  it('arma la rutina activa con 3 llamadas y pide cada ejercicio una sola vez', () => {
    const { service, http } = preparar();
    let resultado: RutinaActiva | null | undefined;
    service.rutinaActiva().subscribe((r) => (resultado = r));

    const rutinas = http.expectOne((r) => r.url === '/api/v1/rutinas/cliente/1');
    expect(rutinas.request.params.get('size')).toBe('50');
    rutinas.flush(pagina([rutinaDto('inactiva'), rutinaDto('activa')]));

    http.expectOne('/api/v1/rutina-ejercicios/rutina/3').flush([
      ri(1, 4, 'lunes'), ri(2, 5, 'lunes'), ri(3, 4, 'jueves'), // el 4 se repite
    ]);

    http.expectOne('/api/v1/ejercicios/4').flush({ idEjercicio: 4, nombre: 'Sentadilla', grupoMuscular: 'piernas', videoUrl: null, nivelDificultad: null });
    http.expectOne('/api/v1/ejercicios/5').flush({ idEjercicio: 5, nombre: 'Peso muerto', grupoMuscular: 'piernas', videoUrl: null, nivelDificultad: null });
    http.verify();

    expect(resultado?.nombre).toBe('Fuerza · semana 5');
    expect(resultado?.dias.map((d) => d.etiqueta)).toEqual(['Lunes', 'Jueves']);
    expect(resultado?.dias[0].ejercicios.map((e) => e.nombre)).toEqual(['Sentadilla', 'Peso muerto']);
    expect(resultado?.dias[1].ejercicios[0].nombre).toBe('Sentadilla');
  });

  it('sin rutina activa devuelve null y no pide nada más', () => {
    const { service, http } = preparar();
    let resultado: RutinaActiva | null | undefined;
    service.rutinaActiva().subscribe((r) => (resultado = r));

    http.expectOne((r) => r.url === '/api/v1/rutinas/cliente/1').flush(pagina([rutinaDto('inactiva')]));
    http.verify();
    expect(resultado).toBeNull();
  });

  it('si un ejercicio no se puede cargar, la rutina igual se muestra con un nombre de respaldo', () => {
    const { service, http } = preparar();
    let resultado: RutinaActiva | null | undefined;
    service.rutinaActiva().subscribe((r) => (resultado = r));

    http.expectOne((r) => r.url === '/api/v1/rutinas/cliente/1').flush(pagina([rutinaDto()]));
    http.expectOne('/api/v1/rutina-ejercicios/rutina/3').flush([ri(1, 7, 'martes')]);
    http.expectOne('/api/v1/ejercicios/7').flush({ message: 'no existe' }, { status: 404, statusText: 'Not Found' });

    expect(resultado?.dias[0].ejercicios[0].nombre).toBe('Ejercicio #7');
  });

  it('una rutina sin ejercicios no pide el catálogo', () => {
    const { service, http } = preparar();
    let resultado: RutinaActiva | null | undefined;
    service.rutinaActiva().subscribe((r) => (resultado = r));

    http.expectOne((r) => r.url === '/api/v1/rutinas/cliente/1').flush(pagina([rutinaDto()]));
    http.expectOne('/api/v1/rutina-ejercicios/rutina/3').flush([]);
    http.verify();
    expect(resultado?.dias).toEqual([]);
  });

  it('un error al pedir la rutina se propaga a la pantalla', () => {
    const { service, http } = preparar();
    let fallo = false;
    service.rutinaActiva().subscribe({ error: () => (fallo = true) });

    http.expectOne((r) => r.url === '/api/v1/rutinas/cliente/1').flush('x', { status: 500, statusText: 'Server Error' });
    expect(fallo).toBe(true);
  });

  it('sin sesión devuelve null sin llamar al backend', () => {
    const { service, http } = preparar(false);
    let resultado: RutinaActiva | null | undefined;
    service.rutinaActiva().subscribe((r) => (resultado = r));
    http.verify();
    expect(resultado).toBeNull();
  });
});
