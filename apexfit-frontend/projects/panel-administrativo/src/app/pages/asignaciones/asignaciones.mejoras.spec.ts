import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Rol } from 'shared';
import { of, throwError } from 'rxjs';
import { Asignacion } from '../../data/asignaciones.models';
import { AsignacionesService } from '../../data/asignaciones.service';
import { InactivosService } from '../../data/inactivos.service';
import { aUsuario } from '../../data/usuarios.mapper';
import { ID_ROL } from '../../data/usuarios.models';
import { guardarSesion, proveedoresPanel } from '../../testing';
import { Asignaciones } from './asignaciones';

const u = (id: number, nombre: string, apellido: string, rol: Rol = 'cliente') =>
  aUsuario({ idUsuario: id, nombre, apellido, correo: `${nombre.toLowerCase()}@apexfit.test`, idRol: ID_ROL[rol], telefono: null, fechaNacimiento: null, estado: 'activo' });
const asig = (id: number, idEntrenador: number, idCliente: number): Asignacion => ({
  id, idEntrenador, idCliente, desde: '2026-10-05', estado: 'activa', vigente: true,
});

// Ana (11) va primero y atiende a María (2). Carlos (1) es de Mario (10). Pedro (3) no tiene entrenador.
// Inactivos hoy: Pedro y María.
function crear(asignar: () => unknown = () => of(asig(50, 11, 3))) {
  localStorage.clear();
  guardarSesion('administrador', 'admin@apexfit.test', 99);
  const datos = {
    asignaciones: [asig(1, 10, 1), asig(2, 11, 2)],
    usuarios: [u(1, 'Carlos', 'Pérez'), u(2, 'María', 'Rojas'), u(3, 'Pedro', 'Salgado'), u(10, 'Mario', 'Díaz', 'entrenador'), u(11, 'Ana', 'Báez', 'entrenador')],
    total: 5,
  };
  const servicio = { listar: vi.fn(() => of(datos)), asignar: vi.fn(asignar), quitar: vi.fn(() => of(undefined)) };
  TestBed.configureTestingModule({
    imports: [Asignaciones],
    providers: [
      provideRouter([]), ...proveedoresPanel(),
      { provide: AsignacionesService, useValue: servicio },
      { provide: InactivosService, useValue: { ids: vi.fn(() => of([3, 2])) } },
    ],
  });
  const fixture = TestBed.createComponent(Asignaciones);
  fixture.detectChanges();
  return { fixture, servicio };
}

type F = ComponentFixture<Asignaciones>;
const el = (f: F) => f.nativeElement as HTMLElement;
const texto = (f: F) => el(f).textContent?.replace(/\s+/g, ' ') ?? '';
const opciones = (f: F) => Array.from(el(f).querySelectorAll('select[formcontrolname="idCliente"] option')).slice(1).map((o) => o.textContent?.trim());
function buscar(f: F, q: string) {
  const i = el(f).querySelector('input[type="search"]') as HTMLInputElement;
  i.value = q;
  i.dispatchEvent(new Event('input'));
  f.detectChanges();
}
function elegir(f: F, id: string) {
  const s = el(f).querySelector('select[formcontrolname="idCliente"]') as HTMLSelectElement;
  s.value = id;
  s.dispatchEvent(new Event('change'));
  f.detectChanges();
}

describe('Asignaciones: buscador, «Inactivo», ya asignado y foco', () => {
  it('el buscador filtra el selector por nombre o correo, sin importar tildes', () => {
    const { fixture } = crear();
    expect(opciones(fixture).length).toBe(2); // Pedro (libre) y Carlos (con Mario)
    buscar(fixture, 'PEREZ');
    expect(opciones(fixture)).toEqual(['Carlos Pérez · con Mario Díaz']);
    buscar(fixture, 'zzz');
    expect(opciones(fixture)).toEqual([]);
    expect(texto(fixture)).toContain('Ningún cliente coincide con «zzz»');
  });

  it('marca «Inactivo» en el selector y en las listas de clientes', () => {
    const { fixture } = crear();
    expect(opciones(fixture)).toContain('Pedro Salgado · pedro@apexfit.test · Inactivo');
    expect(opciones(fixture)).toContain('Carlos Pérez · con Mario Díaz'); // Carlos no está inactivo
    const etiquetas = Array.from(el(fixture).querySelectorAll('.etiqueta')).map((e) => e.closest('li')?.textContent);
    expect(etiquetas.some((t) => t?.includes('María Rojas'))).toBe(true); // clienta de Ana
    expect(etiquetas.some((t) => t?.includes('Pedro Salgado'))).toBe(true); // sin entrenador
  });

  it('si el backend rechaza la asignación por duplicada, lo dice claro y recarga la lista', () => {
    const { fixture, servicio } = crear(() => throwError(() => new HttpErrorResponse({ status: 400 })));
    elegir(fixture, '3');
    (el(fixture).querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    fixture.detectChanges();
    expect(texto(fixture)).toContain('Pedro Salgado ya está asignado a Ana Báez. Actualicé la lista.');
    expect(servicio.listar).toHaveBeenCalledTimes(2);
  });

  it('al asignar a alguien que ya tiene otro entrenador, el aviso dice con quién sigue', () => {
    const { fixture } = crear(() => of(asig(51, 11, 1)));
    elegir(fixture, '1');
    (el(fixture).querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    fixture.detectChanges();
    expect(texto(fixture)).toContain('Carlos Pérez ahora es cliente de Ana Báez. También sigue con Mario Díaz.');
  });

  it('al elegir un cliente el foco pasa al botón Asignar', () => {
    const { fixture } = crear();
    elegir(fixture, '');
    expect(document.activeElement).not.toBe(el(fixture).querySelector('button[type="submit"]'));
    elegir(fixture, '3');
    expect(document.activeElement).toBe(el(fixture).querySelector('button[type="submit"]'));
  });
});
