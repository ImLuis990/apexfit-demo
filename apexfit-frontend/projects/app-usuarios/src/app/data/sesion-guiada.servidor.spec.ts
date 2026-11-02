import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { Entrenar } from '../pages/entrenar/entrenar';
import { guardarSesion, proveedoresBase } from '../testing';
import { EjercicioRutina, RutinaActiva } from './rutinas.models';
import { RutinasService } from './rutinas.service';
import { aSolicitud, aplazar, completar, deRespuesta, elegirAvance, iniciarSesion } from './sesion-guiada';
import { SesionGuiadaService } from './sesion-guiada.service';

const URL = '/api/v1/sesiones-entrenamiento/hoy';
const IDS = [1, 2, 3, 4];
const dto = (estados: string[], terminada = false, idRutina = 7) => ({
  idRutina, terminada, ejercicios: IDS.map((id, i) => ({ idRutinaEjercicio: id, estado: estados[i] })),
});

describe('avance del modo guiado en el servidor', () => {
  it('envía todos los ejercicios de hoy con su estado y la marca de terminada', () => {
    const s = completar(aplazar(iniciarSesion(7, IDS))); // 1 aplazado, 2 completado
    expect(aSolicitud(7, IDS, s)).toEqual({
      idRutina: 7,
      terminada: false,
      ejercicios: [
        { idRutinaEjercicio: 1, estado: 'aplazado' },
        { idRutinaEjercicio: 2, estado: 'completado' },
        { idRutinaEjercicio: 3, estado: 'pendiente' },
        { idRutinaEjercicio: 4, estado: 'pendiente' },
      ],
    });
  });

  it('reconstruye el orden que el servidor no guarda: nuevos en el orden de la rutina y aplazados al final', () => {
    const s = deRespuesta(dto(['completado', 'aplazado', 'pendiente', 'pendiente']), 7, IDS);
    expect(s).toEqual({ rutinaId: 7, completados: [1], aplazados: [2], pendientes: [3, 4, 2], terminada: false });
    expect(deRespuesta(dto(['pendiente', 'pendiente', 'pendiente', 'pendiente'], false, 99), 7, IDS)).toBeNull(); // otra rutina
    expect(deRespuesta(dto(['pendiente', 'pendiente', 'pendiente', 'pendiente']), 7, [1, 2, 3, 9])).toBeNull(); // otros ejercicios
  });

  it('al abrir manda el servidor, salvo que el respaldo del navegador vaya más adelantado (entonces se sube)', () => {
    const inicio = iniciarSesion(7, IDS);
    const adelantado = completar(inicio);
    expect(elegirAvance(null, null)).toEqual({ sesion: null, subir: false });
    expect(elegirAvance(null, inicio)).toEqual({ sesion: inicio, subir: false });
    expect(elegirAvance(adelantado, null)).toEqual({ sesion: adelantado, subir: true });
    expect(elegirAvance(inicio, adelantado)).toEqual({ sesion: adelantado, subir: false });
    expect(elegirAvance(adelantado, inicio)).toEqual({ sesion: adelantado, subir: true });
  });

  describe('SesionGuiadaService', () => {
    it('GET: 404 = sin avance; sin conexión = fallo; 200 = la sesión reconstruida; PUT envía el cuerpo', () => {
      TestBed.configureTestingModule({ providers: [...proveedoresBase] });
      const servicio = TestBed.inject(SesionGuiadaService);
      const http = TestBed.inject(HttpTestingController);
      const resultados: unknown[] = [];

      servicio.obtenerHoy(7, IDS).subscribe((r) => resultados.push(r));
      http.expectOne(URL).flush(null, { status: 404, statusText: 'Not Found' });
      servicio.obtenerHoy(7, IDS).subscribe((r) => resultados.push(r));
      http.expectOne(URL).error(new ProgressEvent('error'));
      servicio.obtenerHoy(7, IDS).subscribe((r) => resultados.push(r));
      http.expectOne(URL).flush(dto(['completado', 'pendiente', 'pendiente', 'pendiente']));
      expect(resultados).toEqual([
        { sesion: null, fallo: false },
        { sesion: null, fallo: true },
        { sesion: { rutinaId: 7, completados: [1], aplazados: [], pendientes: [2, 3, 4], terminada: false }, fallo: false },
      ]);

      servicio.guardar(7, IDS, iniciarSesion(7, IDS)).subscribe();
      const put = http.expectOne(URL);
      expect(put.request.method).toBe('PUT');
      expect(put.request.body.ejercicios.length).toBe(4);
      put.flush({});
    });
  });

  describe('pantalla Entrenar', () => {
    const e = (id: number): EjercicioRutina => ({ id, idEjercicio: id, nombre: `Ejercicio ${id}`, grupoMuscular: null, series: 3, repeticiones: 10, descansoSeg: 60 });
    // Sin días asignados: «hoy» siempre entrena el bloque completo, sin depender del día de la semana.
    const rutina: RutinaActiva = { id: 7, nombre: 'Fuerza', descripcion: null, dias: [{ dia: null, etiqueta: 'Ejercicios', abreviatura: '', grupos: [], ejercicios: [e(1), e(2), e(3)] }] };

    function abrir() {
      localStorage.clear();
      guardarSesion('cliente', 'ana@apexfit.test', 5);
      TestBed.configureTestingModule({
        imports: [Entrenar],
        providers: [provideRouter([]), ...proveedoresBase, { provide: RutinasService, useValue: { rutinaActiva: () => of(rutina) } }],
      });
      return { fixture: TestBed.createComponent(Entrenar), http: TestBed.inject(HttpTestingController) };
    }
    const texto = (f: { nativeElement: HTMLElement }) => f.nativeElement.textContent?.replace(/\s+/g, ' ') ?? '';
    const pulsar = (f: { nativeElement: HTMLElement; detectChanges(): void }, contiene: string) => {
      (Array.from(f.nativeElement.querySelectorAll('button')).find((b) => b.textContent?.includes(contiene)) as HTMLButtonElement).click();
      f.detectChanges();
    };

    it('retoma el avance del servidor y envía cada cambio; al terminar manda terminada = true', () => {
      const { fixture, http } = abrir();
      fixture.detectChanges();
      http.expectOne(URL).flush({ idRutina: 7, terminada: false, ejercicios: [
        { idRutinaEjercicio: 1, estado: 'completado' }, { idRutinaEjercicio: 2, estado: 'aplazado' }, { idRutinaEjercicio: 3, estado: 'pendiente' },
      ] });
      fixture.detectChanges();
      expect(texto(fixture)).toContain('Ejercicio 3 de 3'); // retomó donde quedó

      pulsar(fixture, 'Completado'); // hace el 3: solo queda el aplazado
      const put1 = http.expectOne(URL);
      expect(put1.request.body.terminada).toBe(false);
      expect(put1.request.body.ejercicios.map((x: { estado: string }) => x.estado)).toEqual(['completado', 'aplazado', 'completado']);
      put1.flush({});
      fixture.detectChanges();
      expect(texto(fixture)).toContain('Te queda 1 aplazado');

      pulsar(fixture, 'Completado');
      const put2 = http.expectOne(URL);
      expect(put2.request.body.terminada).toBe(true);
      put2.flush({});
      fixture.detectChanges();
      expect(texto(fixture)).toContain('¡Rutina completada!');
    });

    it('sin conexión usa el respaldo del navegador y lo avisa; el avance sigue guardado en el dispositivo', () => {
      const { fixture, http } = abrir();
      fixture.detectChanges();
      http.expectOne(URL).error(new ProgressEvent('error')); // el GET falla
      fixture.detectChanges();
      expect(texto(fixture)).toContain('Sin conexión con el servidor');
      expect(texto(fixture)).toContain('Ejercicio 1 de 3');

      pulsar(fixture, 'Completado');
      http.expectOne(URL).error(new ProgressEvent('error')); // el PUT también
      fixture.detectChanges();
      expect(texto(fixture)).toContain('Ejercicio 2 de 3');
      const guardado = Object.keys(localStorage).filter((k) => k.startsWith('apexfit.sesion.5.'));
      expect(guardado.length).toBe(1);
    });
  });
});
