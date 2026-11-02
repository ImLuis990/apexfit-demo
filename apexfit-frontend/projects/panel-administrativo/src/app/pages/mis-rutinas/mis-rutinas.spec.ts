import { HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MisRutinasService, RUTINA_AJENA } from '../../data/mis-rutinas.service';
import { guardarSesion, proveedoresPanel } from '../../testing';
import { MisRutinas } from './mis-rutinas';

const rutina = (idRutina: number, nombre: string, idEntrenador: number, idCliente: number, estado = 'activa') => ({
  idRutina, nombre, descripcion: null, idEntrenador, idCliente, fechaCreacion: '2026-10-05T08:00:00', estado,
});
const usuario = (idUsuario: number, nombre: string, apellido: string) => ({
  idUsuario, nombre, apellido, correo: `${nombre.toLowerCase()}@apexfit.test`, idRol: 1, telefono: null, fechaNacimiento: null, estado: 'activo',
});
const linea = (idRutinaEjercicio: number, idEjercicio: number, diaSemana: string, series: number) => ({
  idRutinaEjercicio, idRutina: 5, idEjercicio, diaSemana, series, repeticiones: 10, descansoSeg: 60,
});

// Mario (10) tiene la rutina 5 (activa) y la 6 (inactiva); la 7 es de Ana (11).
function abrir() {
  localStorage.clear();
  guardarSesion('entrenador', 'mario@apexfit.test', 10);
  TestBed.configureTestingModule({ imports: [MisRutinas], providers: [provideRouter([]), ...proveedoresPanel()] });
  const fixture = TestBed.createComponent(MisRutinas);
  const http = TestBed.inject(HttpTestingController);
  fixture.detectChanges();
  http.expectOne((r) => r.url === '/api/v1/rutinas').flush({
    content: [rutina(5, 'Fuerza A', 10, 1), rutina(6, 'Vieja', 10, 2, 'inactiva'), rutina(7, 'De Ana', 11, 2)],
    totalElements: 3,
  });
  http.expectOne((r) => r.url === '/api/v1/usuarios').flush({
    content: [usuario(1, 'Carlos', 'Pérez'), usuario(2, 'María', 'Rojas')], totalElements: 2,
  });
  fixture.detectChanges();
  return { fixture, http };
}

type F = ComponentFixture<MisRutinas>;
const el = (f: F) => f.nativeElement as HTMLElement;
const texto = (f: F) => el(f).textContent?.replace(/\s+/g, ' ') ?? '';
const nombres = (f: F) => Array.from(el(f).querySelectorAll('tbody tr b')).map((b) => b.textContent?.trim());
const boton = (f: F, contiene: string) =>
  Array.from(el(f).querySelectorAll('button')).find((b) => b.textContent?.includes(contiene)) as HTMLButtonElement;
const porEtiqueta = (f: F, etiqueta: string) => el(f).querySelector(`button[aria-label="${etiqueta}"]`) as HTMLButtonElement;
function escribir(campo: HTMLInputElement | HTMLSelectElement, valor: string, f: F) {
  campo.value = valor;
  campo.dispatchEvent(new Event(campo.tagName === 'SELECT' ? 'change' : 'input'));
  f.detectChanges();
}

describe('Mis rutinas (pantalla)', () => {
  it('lista solo las rutinas del entrenador, las activas primero, y nunca las de otro', () => {
    const { fixture } = abrir();
    expect(nombres(fixture)).toEqual(['Fuerza A']);
    expect(texto(fixture)).toContain('Carlos Pérez');
    escribir(el(fixture).querySelector('select') as HTMLSelectElement, '', fixture); // «Todas»
    expect(nombres(fixture)).toEqual(['Vieja', 'Fuerza A'].sort((a, b) => nombres(fixture).indexOf(a) - nombres(fixture).indexOf(b)));
    expect(texto(fixture)).not.toContain('De Ana');
  });

  it('desactiva con confirmación (DELETE /rutinas/{id})', () => {
    const { fixture, http } = abrir();
    porEtiqueta(fixture, 'Desactivar Fuerza A').click();
    fixture.detectChanges();
    boton(fixture, 'Sí, desactivar').click();
    const req = http.expectOne('/api/v1/rutinas/5');
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
    fixture.detectChanges();
    expect(texto(fixture)).toContain('Rutina «Fuerza A» desactivada');
  });

  it('edita: manda solo lo que cambió, y quita al final', () => {
    const { fixture, http } = abrir();
    porEtiqueta(fixture, 'Editar Fuerza A').click();
    fixture.detectChanges();
    http.expectOne('/api/v1/rutina-ejercicios/rutina/5').flush([linea(21, 1, 'lunes', 3), linea(22, 2, 'martes', 4)]);
    http.expectOne((r) => r.url === '/api/v1/ejercicios').flush({
      content: [
        { idEjercicio: 1, nombre: 'Press de banca', grupoMuscular: 'Pecho' },
        { idEjercicio: 2, nombre: 'Dominadas', grupoMuscular: 'Espalda' },
        { idEjercicio: 3, nombre: 'Flexiones', grupoMuscular: 'Pecho' },
      ],
      totalElements: 3,
    });
    fixture.detectChanges();

    const campo = (i: number, nombre: string) =>
      el(fixture).querySelectorAll('.linea')[i].querySelector(`[formcontrolname="${nombre}"]`) as HTMLInputElement;
    escribir(el(fixture).querySelector('input[formcontrolname="nombre"]') as HTMLInputElement, 'Fuerza B', fixture);
    escribir(campo(0, 'series'), '5', fixture); // Press de banca: 3 → 5
    porEtiqueta(fixture, 'Quitar Dominadas').click(); // se quita la línea 22
    fixture.detectChanges();
    boton(fixture, 'Agregar ejercicio').click(); // línea nueva
    fixture.detectChanges();
    escribir(campo(1, 'idEjercicio'), '3', fixture);
    escribir(campo(1, 'dia'), 'viernes', fixture);

    (el(fixture).querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    const pasos: [string, string][] = [
      ['PUT', '/api/v1/rutinas/5'],
      ['POST', '/api/v1/rutina-ejercicios'],
      ['PUT', '/api/v1/rutina-ejercicios/21'],
      ['DELETE', '/api/v1/rutina-ejercicios/22'],
    ];
    for (const [metodo, url] of pasos) {
      const req = http.expectOne(url);
      expect(req.request.method).toBe(metodo);
      if (url === '/api/v1/rutinas/5') expect(req.request.body).toMatchObject({ nombre: 'Fuerza B', idEntrenador: 10, idCliente: 1 });
      if (metodo === 'POST') expect(req.request.body).toMatchObject({ idRutina: 5, idEjercicio: 3, diaSemana: 'viernes' });
      if (url.endsWith('/21')) expect(req.request.body).toMatchObject({ series: 5 });
      req.flush({});
    }
    fixture.detectChanges();
    expect(texto(fixture)).toContain('Rutina «Fuerza B» actualizada.');
  });
});

describe('MisRutinasService: rutinas de otro entrenador', () => {
  it('no deja desactivar ni guardar la rutina de otro, y ni siquiera llama al backend', () => {
    localStorage.clear();
    guardarSesion('entrenador', 'mario@apexfit.test', 10);
    TestBed.configureTestingModule({ providers: [...proveedoresPanel()] });
    const servicio = TestBed.inject(MisRutinasService);
    const http = TestBed.inject(HttpTestingController);
    const deAna = { id: 7, nombre: 'De Ana', descripcion: null, idEntrenador: 11, idCliente: 2, cliente: 'María', creada: null, activa: true };

    const errores: string[] = [];
    servicio.desactivar(deAna).subscribe({ error: (e: Error) => errores.push(e.message) });
    servicio.guardar(deAna, { nombre: 'X', descripcion: '', lineas: [] }, []).subscribe({ error: (e: Error) => errores.push(e.message) });

    expect(errores).toEqual([RUTINA_AJENA, RUTINA_AJENA]);
    http.expectNone(() => true);
  });
});
