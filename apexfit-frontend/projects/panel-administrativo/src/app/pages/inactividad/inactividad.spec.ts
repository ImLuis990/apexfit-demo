import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Observable, of, throwError } from 'rxjs';
import { Asistencia } from '../../data/asistencias.models';
import { AsistenciasService } from '../../data/asistencias.service';
import { hoyIso, sumarDias } from '../../data/formato';
import { normalizarDias } from '../../data/inactividad.config';
import { Membresia } from '../../data/membresias.models';
import { MembresiasService } from '../../data/membresias.service';
import { aUsuario } from '../../data/usuarios.mapper';
import { ID_ROL } from '../../data/usuarios.models';
import { UsuariosService } from '../../data/usuarios.service';
import { configuracionFalsa } from '../../testing';
import { InactividadPagina } from './inactividad';

const cliente = (id: number, nombre: string) =>
  aUsuario({ idUsuario: id, nombre, apellido: 'X', correo: `${nombre.toLowerCase()}@apexfit.test`, idRol: ID_ROL.cliente, telefono: null, fechaNacimiento: null, estado: 'activo' });
const vigente = (idUsuario: number): Membresia =>
  ({ id: idUsuario, idUsuario, tipo: 'Mensual', fechaInicio: '2026-01-01', fechaFin: sumarDias(hoyIso(), 60), precio: 1, estado: 'activa' });
const visita = (idUsuario: number, hace: number): Asistencia =>
  ({ id: idUsuario, idUsuario, fecha: sumarDias(hoyIso(), -hace), horaEntrada: '08:00:00', horaSalida: null, metodo: 'qr' });

function crear(guardar: (d: number) => Observable<number> = (d) => of(d)) {
  TestBed.configureTestingModule({
    imports: [InactividadPagina],
    providers: [
      { provide: AsistenciasService, useValue: { listar: () => of([visita(1, 15), visita(2, 4)]) } },
      { provide: UsuariosService, useValue: { listar: () => of({ usuarios: [cliente(1, 'Ana'), cliente(2, 'Beto'), cliente(3, 'Carla')], total: 3 }) } },
      { provide: MembresiasService, useValue: { listar: () => of([vigente(1), vigente(2), vigente(3)]) } },
      configuracionFalsa(10, guardar),
    ],
  });
  const fixture = TestBed.createComponent(InactividadPagina);
  fixture.detectChanges();
  return fixture;
}
const texto = (f: ComponentFixture<InactividadPagina>) => (f.nativeElement as HTMLElement).textContent?.replace(/\s+/g, ' ') ?? '';

describe('Inactividad (pantalla)', () => {
  it('normaliza los días: entero entre 1 y 365, y 10 si no es un número', () => {
    expect([normalizarDias('7.9'), normalizarDias(0), normalizarDias(9999), normalizarDias('abc'), normalizarDias('')]).toEqual([7, 1, 365, 10, 10]);
  });

  it('con 10 días lista a quien lleva 15 y a quien nunca asistió; al cambiar el campo se recalcula', () => {
    const f = crear();
    let t = texto(f);
    expect(t).toContain('2 clientes inactivos (más de 10 días');
    expect(t).toContain('Ana');
    expect(t).toContain('Carla');
    expect(t).toContain('Nunca ha asistido');
    expect(t).not.toContain('Beto');

    const campo = (f.nativeElement as HTMLElement).querySelector('input') as HTMLInputElement;
    campo.value = '3';
    campo.dispatchEvent(new Event('change'));
    f.detectChanges();
    t = texto(f);
    expect(t).toContain('3 clientes inactivos (más de 3 días');
    expect(t).toContain('Beto');
  });

  it('el cambio se guarda en el servidor (PUT), no en el navegador', () => {
    const guardar = vi.fn((d: number) => of(d));
    const f = crear(guardar);
    const campo = (f.nativeElement as HTMLElement).querySelector('input') as HTMLInputElement;
    campo.value = '3';
    campo.dispatchEvent(new Event('change'));
    expect(guardar).toHaveBeenCalledWith(3);
    expect(localStorage.getItem('apexfit.panel.dias-inactividad')).toBeNull();
  });

  it('si el servidor no lo guarda, vuelve al valor anterior y lo avisa', () => {
    const f = crear(() => throwError(() => new Error('403')));
    const campo = (f.nativeElement as HTMLElement).querySelector('input') as HTMLInputElement;
    campo.value = '3';
    campo.dispatchEvent(new Event('change'));
    f.detectChanges();
    expect(campo.value).toBe('10');
    expect(texto(f)).toContain('No se pudo guardar en el servidor. Se mantienen 10 días.');
    expect(texto(f)).toContain('2 clientes inactivos (más de 10 días');
  });
});
