import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Rol } from 'shared';
import { Subject, of, throwError } from 'rxjs';
import { Asistencia } from '../../data/asistencias.models';
import { AsistenciasService } from '../../data/asistencias.service';
import { DashboardService } from '../../data/dashboard.service';
import { DashboardResumenDto } from '../../data/dtos';
import { hoyIso, sumarDias } from '../../data/formato';
import { Membresia } from '../../data/membresias.models';
import { MembresiasService } from '../../data/membresias.service';
import { aUsuario } from '../../data/usuarios.mapper';
import { ID_ROL, Usuario } from '../../data/usuarios.models';
import { UsuariosService } from '../../data/usuarios.service';
import { ResumenPagina } from './resumen';
import { configuracionFalsa } from '../../testing';

const HOY = hoyIso();
const en = (d: number) => sumarDias(HOY, d);

const user = (id: number, nombre: string, rol: Rol = 'cliente'): Usuario =>
  aUsuario({ idUsuario: id, nombre, apellido: 'X', correo: `${nombre.toLowerCase()}@apexfit.test`, idRol: ID_ROL[rol], telefono: null, fechaNacimiento: null, estado: 'activo' });

const mem = (id: number, idUsuario: number, fin: number): Membresia => ({
  id, idUsuario, tipo: 'Mensual', fechaInicio: en(fin - 30), fechaFin: en(fin), precio: 1, estado: 'activa',
});

const asis = (id: number, idUsuario: number, fecha: string, hora: string, salida: string | null = null): Asistencia => ({
  id, idUsuario, fecha, horaEntrada: hora, horaSalida: salida, metodo: 'qr',
});

const dash: DashboardResumenDto = {
  totalUsuarios: 11, totalClientesActivos: 11, totalEntrenadores: 2, totalAsistenciasHoy: 3,
  totalMembresiasActivas: 9, totalEjercicios: 14, totalRutinas: 6, asistenciasPorMetodo: { QR: 2, MANUAL: 1 },
};

interface Fuentes {
  dash?: () => unknown;
  asistencias?: () => unknown;
}

function crear(f: Fuentes = {}) {
  const usuarios = [user(1, 'Carlos'), user(2, 'Maria'), user(3, 'Pedro'), user(4, 'Mario', 'entrenador')];
  const membresias = [mem(1, 1, 40), mem(2, 2, 3), mem(3, 3, 40)];
  // Carlos entró hoy y sigue dentro; María asistió ayer; Pedro nunca ha asistido
  const asistencias = [asis(1, 1, HOY, '07:10:00'), asis(2, 1, HOY, '07:50:00', '08:30:00'), asis(3, 2, en(-1), '18:00:00')];
  const servicios = {
    dash: vi.fn(f.dash ?? (() => of(dash))),
    asistencias: vi.fn(f.asistencias ?? (() => of(asistencias))),
  };
  TestBed.configureTestingModule({
    imports: [ResumenPagina],
    providers: [
      provideRouter([]),
      { provide: DashboardService, useValue: { resumen: servicios.dash } },
      { provide: AsistenciasService, useValue: { listar: servicios.asistencias } },
      { provide: UsuariosService, useValue: { listar: () => of({ usuarios, total: 4 }) } },
      { provide: MembresiasService, useValue: { listar: () => of(membresias) } },
      configuracionFalsa(),
    ],
  });
  const fixture = TestBed.createComponent(ResumenPagina);
  fixture.detectChanges();
  return { fixture, servicios };
}

type F = ComponentFixture<ResumenPagina>;
const el = (f: F) => f.nativeElement as HTMLElement;
const texto = (f: F) => el(f).textContent?.replace(/\s+/g, ' ') ?? '';
const kpis = (f: F) =>
  Object.fromEntries(
    Array.from(el(f).querySelectorAll('.kpi')).map((k) => [k.querySelector('span')?.textContent?.trim(), k.querySelector('b')?.textContent?.trim()]),
  );

describe('Resumen (pantalla)', () => {
  it('mientras carga lo indica', () => {
    expect(texto(crear({ asistencias: () => new Subject() }).fixture)).toContain('Cargando el resumen');
  });

  it('si falla, muestra el error y "Reintentar" vuelve a cargar', () => {
    let intento = 0;
    const { fixture, servicios } = crear({
      asistencias: () => (++intento === 1 ? throwError(() => new HttpErrorResponse({ status: 500 })) : of([])),
    });
    expect(texto(fixture)).toContain('No pudimos cargar el resumen');
    (Array.from(el(fixture).querySelectorAll('button')).find((b) => b.textContent?.includes('Reintentar')) as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(servicios.asistencias).toHaveBeenCalledTimes(2);
    expect(el(fixture).querySelector('.kpi')).not.toBeNull();
  });

  it('calcula los indicadores con las listas (no con los totales del backend, que cuentan mal)', () => {
    const k = kpis(crear().fixture);
    expect(k['Dentro ahora']).toBe('1'); // Carlos
    expect(k['Entradas hoy']).toBe('2');
    expect(k['Clientes activos']).toBe('3'); // el backend dice 11
    expect(k['Con membresía vigente']).toBe('3');
    expect(k['Por vencer (7 días)']).toBe('1'); // María
    expect(k['Inactivos (+10 días)']).toBe('1'); // Pedro, que nunca asistió
  });

  it('lista quién vence pronto y quién está inactivo', () => {
    const t = texto(crear().fixture);
    expect(t).toContain('Maria X');
    expect(t).toContain('vence en 3 días');
    expect(t).toContain('Pedro X');
    expect(t).toContain('nunca ha asistido');
  });

  it('enlaza a Membresías', () => {
    const { fixture } = crear();
    expect((el(fixture).querySelector('a[href="/membresias"]') as HTMLAnchorElement).textContent).toContain('Ver membresías');
  });

  it('muestra los datos generales del backend y las entradas por método', () => {
    const t = texto(crear().fixture);
    expect(t).toContain('2 entrenadores · 6 rutinas · 14 ejercicios');
    expect(t).toContain('QR 2');
    expect(t).toContain('Manual 1');
  });

  it('si el dashboard falla, el resto del resumen se muestra igual y avisa', () => {
    const { fixture } = crear({ dash: () => throwError(() => new HttpErrorResponse({ status: 500 })) });
    expect(kpis(fixture)['Clientes activos']).toBe('3');
    expect(texto(fixture)).toContain('Algunos datos generales no están disponibles');
    expect(texto(fixture)).not.toContain('entrenadores ·');
  });

  it('dibuja la gráfica de entradas por hora, con descripción para lectores de pantalla', () => {
    const { fixture } = crear();
    const fig = el(fixture).querySelector('figure[role="img"]') as HTMLElement;
    expect(fig.getAttribute('aria-label')).toContain('el pico es a las 07:00 con 2');
    expect(el(fixture).querySelectorAll('.barras .col').length).toBe(17); // de 6 a 22
    expect(el(fixture).querySelectorAll('.barras i:not(.vacia)').length).toBe(1);
  });

  it('con todo en orden, las listas lo dicen', () => {
    const { fixture } = crear({ asistencias: () => of([asis(1, 1, HOY, '07:00:00'), asis(2, 2, HOY, '08:00:00'), asis(3, 3, HOY, '09:00:00')]) });
    expect(texto(fixture)).toContain('Todos los clientes con membresía vigente han asistido');
  });
});
