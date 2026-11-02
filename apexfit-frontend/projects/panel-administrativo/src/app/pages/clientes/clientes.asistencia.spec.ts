import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { Asistencia } from '../../data/asistencias.models';
import { ordenarRecientes, resumirAsistencia } from '../../data/clientes.mapper';
import { ClienteAsignado } from '../../data/clientes.models';
import { ClientesService } from '../../data/clientes.service';
import { hoyIso, sumarDias } from '../../data/formato';
import { configuracionFalsa } from '../../testing';
import { Clientes } from './clientes';

const cliente: ClienteAsignado = { idCliente: 5, nombre: 'Carlos Pérez', correo: 'carlos@apexfit.test', iniciales: 'CP', rutinaActiva: null, registros: [] };
const visita = (id: number, fecha: string, entrada: string, salida: string | null, metodo = 'qr'): Asistencia =>
  ({ id, idUsuario: 5, fecha, horaEntrada: entrada, horaSalida: salida, metodo });

function crear(asistenciaDe: () => unknown, dias = 10) {
  const servicio = { misClientes: vi.fn(() => of([cliente])), asistenciaDe: vi.fn(asistenciaDe) };
  TestBed.configureTestingModule({ imports: [Clientes], providers: [provideRouter([]), { provide: ClientesService, useValue: servicio }, configuracionFalsa(dias)] });
  const fixture = TestBed.createComponent(Clientes);
  fixture.detectChanges();
  (fixture.nativeElement.querySelector('button[aria-label="Ver asistencia de Carlos Pérez"]') as HTMLButtonElement).click();
  fixture.detectChanges();
  return { fixture, servicio };
}
const texto = (f: ComponentFixture<Clientes>) => (f.nativeElement as HTMLElement).textContent?.replace(/\s+/g, ' ') ?? '';

describe('Asistencia del cliente (Mis clientes)', () => {
  it('ordena, resume los últimos 30 días y recuerda la última visita', () => {
    const lista = ordenarRecientes([visita(1, '2026-09-01', '07:00:00', null), visita(2, '2026-10-12', '18:30:00', null), visita(3, '2026-10-12', '07:05:00', '08:00:00')]);
    expect(lista.map((a) => a.id)).toEqual([2, 3, 1]);
    expect(resumirAsistencia(lista, '2026-10-20')).toEqual({ visitas30: 2, ultima: '2026-10-12' });
  });

  it('al pulsar "Ver asistencia" pide la del cliente y muestra resumen y filas', () => {
    const { fixture, servicio } = crear(() => of([visita(2, '2026-10-12', '18:30:00', null, 'manual'), visita(1, '2026-10-10', '07:05:00', '08:10:00')]));
    expect(servicio.asistenciaDe).toHaveBeenCalledWith(5);
    const t = texto(fixture);
    expect(t).toContain('Última: 12/10/2026');
    expect(t).toContain('07:05');
    expect(t).toContain('08:10');
    expect(t).toContain('Manual');
  });

  it('marca «Inactivo» con la regla de Inactividad y los días configurados en el servidor', () => {
    const hoy = hoyIso();
    expect(texto(crear(() => of([visita(1, sumarDias(hoy, -3), '07:00:00', null)])).fixture)).not.toContain('Inactivo');
    TestBed.resetTestingModule();
    expect(texto(crear(() => of([visita(1, sumarDias(hoy, -15), '07:00:00', null)])).fixture)).toContain('Inactivo: lleva más de 10 días sin asistir.');
    TestBed.resetTestingModule();
    expect(texto(crear(() => of([visita(1, sumarDias(hoy, -15), '07:00:00', null)]), 30).fixture)).not.toContain('Inactivo');
    TestBed.resetTestingModule();
    expect(texto(crear(() => of([])).fixture)).toContain('Inactivo: nunca ha asistido.');
  });

  it('sin asistencias avisa, y si falla el servidor muestra el error', () => {
    expect(texto(crear(() => of([])).fixture)).toContain('todavía no tiene asistencias');
    TestBed.resetTestingModule();
    expect(texto(crear(() => throwError(() => new HttpErrorResponse({ status: 0 }))).fixture)).toContain('No se pudo conectar');
  });
});
