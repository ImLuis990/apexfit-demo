import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { Asistencia } from '../../data/asistencias.models';
import { AsistenciasService } from '../../data/asistencias.service';
import { DashboardService } from '../../data/dashboard.service';
import { hoyIso, sumarDias } from '../../data/formato';
import { Membresia } from '../../data/membresias.models';
import { MembresiasService } from '../../data/membresias.service';
import { aUsuario } from '../../data/usuarios.mapper';
import { ID_ROL } from '../../data/usuarios.models';
import { UsuariosService } from '../../data/usuarios.service';
import { configuracionFalsa } from '../../testing';
import { ResumenPagina } from './resumen';

const HOY = hoyIso();
const cliente = (id: number, nombre: string) =>
  aUsuario({ idUsuario: id, nombre, apellido: 'X', correo: `${nombre.toLowerCase()}@apexfit.test`, idRol: ID_ROL.cliente, telefono: null, fechaNacimiento: null, estado: 'activo' });
const vigente = (idUsuario: number): Membresia =>
  ({ id: idUsuario, idUsuario, tipo: 'Mensual', fechaInicio: '2026-01-01', fechaFin: sumarDias(HOY, 60), precio: 1, estado: 'activa' });
const asis = (id: number, idUsuario: number, fecha: string, entrada: string, salida: string | null): Asistencia =>
  ({ id, idUsuario, fecha, horaEntrada: entrada, horaSalida: salida, metodo: 'qr' });

function crear(clientes: string[], asistencias: Asistencia[], dias = 10) {
  TestBed.configureTestingModule({
    imports: [ResumenPagina],
    providers: [
      provideRouter([]),
      { provide: DashboardService, useValue: { resumen: () => of(null) } },
      { provide: AsistenciasService, useValue: { listar: () => of(asistencias) } },
      { provide: UsuariosService, useValue: { listar: () => of({ usuarios: clientes.map((n, i) => cliente(i + 1, n)), total: clientes.length }) } },
      { provide: MembresiasService, useValue: { listar: () => of(clientes.map((_, i) => vigente(i + 1))) } },
      configuracionFalsa(dias),
    ],
  });
  const fixture = TestBed.createComponent(ResumenPagina);
  fixture.detectChanges();
  return (fixture as ComponentFixture<ResumenPagina>).nativeElement.textContent?.replace(/\s+/g, ' ') as string;
}

describe('Resumen: días de inactividad configurados', () => {
  it('usa los días configurados en el servidor (y 10 por defecto)', () => {
    const asistencias = [asis(1, 1, sumarDias(HOY, -5), '08:00:00', '09:00:00')]; // Ana asistió hace 5 días
    expect(crear(['Ana'], asistencias)).toContain('0Inactivos (+10 días)');

    TestBed.resetTestingModule();
    const t = crear(['Ana'], asistencias, 3);
    expect(t).toContain('1Inactivos (+3 días)');
    expect(t).toContain('hace 5 días');
  });
});
