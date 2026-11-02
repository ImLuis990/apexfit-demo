import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { Ejercicio } from '../../data/ejercicios.models';
import { DatosEjercicios, EjerciciosService } from '../../data/ejercicios.service';
import { guardarSesion, proveedoresPanel } from '../../testing';
import { Ejercicios } from './ejercicios';

const ej = (id: number, nombre: string, grupoMuscular: string | null, nivel: string | null = null): Ejercicio => ({
  id, nombre, grupoMuscular, nivel, videoUrl: null,
});
const datos = (lista: Ejercicio[] = [ej(1, 'Dominadas', 'Espalda', 'avanzado'), ej(2, 'Flexiones', 'Pecho', 'principiante')]): DatosEjercicios => ({
  ejercicios: lista, total: lista.length,
});

function crear(over: Partial<Record<'listar' | 'crear' | 'actualizar' | 'borrar' | 'cargarEjemplos', () => unknown>> = {}) {
  localStorage.clear();
  guardarSesion('entrenador', 'mario@apexfit.test', 10);
  const servicio = {
    listar: vi.fn(over.listar ?? (() => of(datos()))),
    crear: vi.fn(over.crear ?? (() => of(ej(9, 'Nuevo', null)))),
    actualizar: vi.fn(over.actualizar ?? (() => of(ej(1, 'Dominadas', 'Espalda')))),
    borrar: vi.fn(over.borrar ?? (() => of(undefined))),
    cargarEjemplos: vi.fn(over.cargarEjemplos ?? (() => of(15))),
  };
  TestBed.configureTestingModule({
    imports: [Ejercicios],
    providers: [...proveedoresPanel(), { provide: EjerciciosService, useValue: servicio }],
  });
  const fixture = TestBed.createComponent(Ejercicios);
  fixture.detectChanges();
  return { fixture, servicio };
}

type F = ComponentFixture<Ejercicios>;
const el = (f: F) => f.nativeElement as HTMLElement;
const texto = (f: F) => el(f).textContent?.replace(/\s+/g, ' ') ?? '';
const boton = (f: F, contiene: string) =>
  Array.from(el(f).querySelectorAll('button')).find((b) => b.textContent?.includes(contiene)) as HTMLButtonElement;
const filas = (f: F) => Array.from(el(f).querySelectorAll('tbody tr b')).map((b) => b.textContent?.trim());
const campo = (f: F, nombre: string) => el(f).querySelector(`[formcontrolname="${nombre}"]`) as HTMLInputElement;
function escribir(f: F, nombre: string, valor: string) {
  const c = campo(f, nombre);
  c.value = valor;
  c.dispatchEvent(new Event(c.tagName === 'SELECT' ? 'change' : 'input'));
  f.detectChanges();
}
function enviar(f: F) {
  (el(f).querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
  f.detectChanges();
}

describe('Ejercicios (pantalla)', () => {
  it('lista el catálogo y filtra por nombre y por grupo', () => {
    const { fixture } = crear();
    expect(filas(fixture)).toEqual(['Dominadas', 'Flexiones']);
    const buscar = el(fixture).querySelector('input[type="search"]') as HTMLInputElement;
    buscar.value = 'flex';
    buscar.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(filas(fixture)).toEqual(['Flexiones']);
    buscar.value = 'zzz';
    buscar.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(texto(fixture)).toContain('Ningún ejercicio coincide');
  });

  it('crea un ejercicio: pide el nombre, envía los datos y recarga', () => {
    const { fixture, servicio } = crear();
    boton(fixture, 'Nuevo ejercicio').click();
    fixture.detectChanges();
    enviar(fixture);
    expect(servicio.crear).not.toHaveBeenCalled();
    expect(texto(fixture)).toContain('Escribe el nombre del ejercicio.');

    escribir(fixture, 'nombre', 'Remo con barra');
    escribir(fixture, 'nivel', 'intermedio');
    enviar(fixture);
    expect(servicio.crear).toHaveBeenCalledWith({ nombre: 'Remo con barra', grupoMuscular: '', nivel: 'intermedio', videoUrl: '' });
    expect(texto(fixture)).toContain('«Nuevo» agregado al catálogo.');
    expect(servicio.listar).toHaveBeenCalledTimes(2);
  });

  it('edita un ejercicio con sus datos precargados', () => {
    const { fixture, servicio } = crear();
    (el(fixture).querySelector('button[aria-label="Editar Dominadas"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(campo(fixture, 'nombre').value).toBe('Dominadas');
    escribir(fixture, 'nombre', 'Dominadas libres');
    enviar(fixture);
    expect(servicio.actualizar).toHaveBeenCalledWith(1, expect.objectContaining({ nombre: 'Dominadas libres', grupoMuscular: 'Espalda' }));
  });

  it('un nombre repetido y un enlace inválido se explican', () => {
    const { fixture } = crear({ crear: () => throwError(() => new HttpErrorResponse({ status: 400, error: { message: 'El nombre del ejercicio ya existe' } })) });
    boton(fixture, 'Nuevo ejercicio').click();
    fixture.detectChanges();
    escribir(fixture, 'nombre', 'Flexiones');
    escribir(fixture, 'videoUrl', 'youtube.com');
    enviar(fixture);
    expect(texto(fixture)).toContain('empiece por http');
    escribir(fixture, 'videoUrl', '');
    enviar(fixture);
    expect(texto(fixture)).toContain('Ya existe un ejercicio con ese nombre.');
  });

  it('borra con confirmación; si está en una rutina, lo explica', () => {
    const { fixture, servicio } = crear();
    (el(fixture).querySelector('button[aria-label="Borrar Flexiones"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    boton(fixture, 'No').click();
    fixture.detectChanges();
    expect(servicio.borrar).not.toHaveBeenCalled();

    (el(fixture).querySelector('button[aria-label="Borrar Flexiones"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    boton(fixture, 'Sí, borrar').click();
    fixture.detectChanges();
    expect(servicio.borrar).toHaveBeenCalledWith(2);
    expect(texto(fixture)).toContain('«Flexiones» eliminado.');
  });

  it('si el backend rechaza el borrado, avisa que puede estar en una rutina', () => {
    const { fixture } = crear({ borrar: () => throwError(() => new HttpErrorResponse({ status: 500 })) });
    (el(fixture).querySelector('button[aria-label="Borrar Flexiones"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    boton(fixture, 'Sí, borrar').click();
    fixture.detectChanges();
    expect(texto(fixture)).toContain('está en alguna rutina');
  });

  it('con el catálogo vacío ofrece cargar los ejemplos y recarga', () => {
    let lista = datos([]);
    const { fixture, servicio } = crear({ listar: () => of(lista), cargarEjemplos: () => { lista = datos(); return of(15); } });
    expect(texto(fixture)).toContain('Todavía no hay ejercicios');
    boton(fixture, 'Cargar ejercicios de ejemplo').click();
    fixture.detectChanges();
    expect(servicio.cargarEjemplos).toHaveBeenCalledWith([]);
    expect(texto(fixture)).toContain('Se cargaron 15 ejercicios de ejemplo.');
    expect(filas(fixture).length).toBe(2);
  });

  it('mientras carga lo indica', () => {
    const { fixture } = crear({ listar: () => new Subject() });
    expect(texto(fixture)).toContain('Cargando ejercicios');
  });
});
