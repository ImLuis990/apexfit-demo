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
import { aforoPorHora } from '../../data/resumen.mapper';
import { configuracionFalsa } from '../../testing';
import { ResumenPagina } from './resumen';

const HOY = hoyIso();
const cliente = (id: number, nombre: string) =>
  aUsuario({ idUsuario: id, nombre, apellido: 'X', correo: `${nombre.toLowerCase()}@apexfit.test`, idRol: ID_ROL.cliente, telefono: null, fechaNacimiento: null, estado: 'activo' });
const vigente = (idUsuario: number): Membresia =>
  ({ id: idUsuario, idUsuario, tipo: 'Mensual', fechaInicio: '2026-01-01', fechaFin: sumarDias(HOY, 60), precio: 1, estado: 'activa' });
const asis = (id: number, idUsuario: number, fecha: string, entrada: string, salida: string | null): Asistencia =>
  ({ id, idUsuario, fecha, horaEntrada: entrada, horaSalida: salida, metodo: 'qr' });

function crear(clientes: string[], asistencias: Asistencia[]) {
  TestBed.configureTestingModule({
    imports: [ResumenPagina],
    providers: [
      provideRouter([]),
      { provide: DashboardService, useValue: { resumen: () => of(null) } },
      { provide: AsistenciasService, useValue: { listar: () => of(asistencias) } },
      { provide: UsuariosService, useValue: { listar: () => of({ usuarios: clientes.map((n, i) => cliente(i + 1, n)), total: clientes.length }) } },
      { provide: MembresiasService, useValue: { listar: () => of(clientes.map((_, i) => vigente(i + 1))) } },
      configuracionFalsa(),
    ],
  });
  const fixture = TestBed.createComponent(ResumenPagina);
  fixture.detectChanges();
  return (fixture as ComponentFixture<ResumenPagina>).nativeElement.textContent?.replace(/\s+/g, ' ') as string;
}

describe('Resumen: aforo por hora', () => {
  it('cuenta las personas presentes en cada hora; quien no ha salido cuenta hasta la hora actual', () => {
    const lista = [asis(1, 1, HOY, '08:00:00', '09:30:00'), asis(2, 2, HOY, '14:10:00', null)];
    const por = Object.fromEntries(aforoPorHora(lista, 16).map((h) => [h.hora, h.personas]));
    expect([por[7], por[8], por[9], por[10]]).toEqual([0, 1, 1, 0]);
    expect([por[13], por[14], por[16], por[17]]).toEqual([0, 1, 1, 0]);
  });

  it('muestra la sección con "Dentro ahora" y el pico del día', () => {
    localStorage.clear();
    const t = crear(['Ana', 'Beto', 'Carlos'], [
      asis(1, 1, HOY, '08:00:00', '09:30:00'),
      asis(2, 2, HOY, '09:10:00', '10:00:00'),
      asis(3, 3, HOY, '09:40:00', '11:00:00'),
    ]);
    expect(t).toContain('Aforo por hora (hoy)');
    expect(t).toContain('Pico de hoy: 3 personas a las 09:00.');
  });
});
