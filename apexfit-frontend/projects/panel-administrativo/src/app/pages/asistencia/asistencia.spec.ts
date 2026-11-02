import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Rol } from 'shared';
import { Subject, of, throwError } from 'rxjs';
import { Asistencia } from '../../data/asistencias.models';
import { AsistenciasService } from '../../data/asistencias.service';
import { hoyIso, sumarDias } from '../../data/formato';
import { Membresia } from '../../data/membresias.models';
import { MembresiasService } from '../../data/membresias.service';
import { aUsuario } from '../../data/usuarios.mapper';
import { ID_ROL, Usuario } from '../../data/usuarios.models';
import { UsuariosService } from '../../data/usuarios.service';
import { guardarSesion, proveedoresPanel } from '../../testing';
import { AsistenciaPagina } from './asistencia';

const HOY = hoyIso();
const en = (d: number) => sumarDias(HOY, d);

const user = (id: number, nombre: string, apellido: string, rol: Rol = 'cliente', estado = 'activo'): Usuario =>
  aUsuario({ idUsuario: id, nombre, apellido, correo: `${nombre.toLowerCase()}@apexfit.test`, idRol: ID_ROL[rol], telefono: null, fechaNacimiento: null, estado });

const usuarios = () => [
  user(1, 'Carlos', 'Pérez'), // activa, YA está dentro
  user(2, 'María', 'Rojas'), // por vencer
  user(3, 'Pedro', 'Salgado'), // vencida
  user(4, 'Laura', 'Gómez'), // sin membresía
  user(5, 'Mario', 'Díaz', 'entrenador'),
  user(6, 'Ana', 'Ruiz', 'cliente', 'inactivo'),
  user(7, 'Juan', 'Mora'), // cancelada
  user(8, 'Sofía', 'León'), // activa, sin entrada abierta
];

const mem = (id: number, idUsuario: number, fin: number, estado = 'activa'): Membresia => ({
  id, idUsuario, tipo: 'Mensual', fechaInicio: en(fin - 30), fechaFin: en(fin), precio: 90000, estado,
});

const membresias = () => [mem(1, 1, 40), mem(2, 2, 3), mem(3, 3, -10), mem(4, 6, 40), mem(5, 7, 40, 'cancelada'), mem(6, 8, 40)];

const asis = (id: number, idUsuario: number, entrada: string, salida: string | null, metodo = 'qr', fecha = HOY): Asistencia => ({
  id, idUsuario, fecha, horaEntrada: entrada, horaSalida: salida, metodo,
});

const deHoy = () => [asis(100, 1, '07:30:00', null), asis(101, 2, '06:00:00', '07:15:00', 'manual')];

interface Fuentes {
  listar?: () => unknown;
  registrarQr?: () => unknown;
  registrarManual?: () => unknown;
  registrarSalida?: () => unknown;
}

function crear(f: Fuentes = {}) {
  localStorage.clear();
  guardarSesion('administrador', 'ana@apexfit.test', 99);
  const asistencias = {
    listar: vi.fn(f.listar ?? (() => of(deHoy()))),
    registrarQr: vi.fn(f.registrarQr ?? (() => of(asis(200, 2, '07:42:10', null)))),
    registrarManual: vi.fn(f.registrarManual ?? (() => of(asis(201, 8, '07:50:00', null, 'manual')))),
    registrarSalida: vi.fn(f.registrarSalida ?? (() => of(asis(100, 1, '07:30:00', '09:05:00')))),
  };
  TestBed.configureTestingModule({
    imports: [AsistenciaPagina],
    providers: [
      provideRouter([]), ...proveedoresPanel(),
      { provide: AsistenciasService, useValue: asistencias },
      { provide: UsuariosService, useValue: { listar: () => of({ usuarios: usuarios(), total: 8 }) } },
      { provide: MembresiasService, useValue: { listar: () => of(membresias()) } },
    ],
  });
  const fixture = TestBed.createComponent(AsistenciaPagina);
  fixture.detectChanges();
  return { fixture, asistencias };
}

type F = ComponentFixture<AsistenciaPagina>;
const el = (f: F) => f.nativeElement as HTMLElement;
const texto = (f: F) => el(f).textContent?.replace(/\s+/g, ' ') ?? '';
const filas = (f: F) => Array.from(el(f).querySelectorAll('tbody tr'));

function escanear(f: F, codigo: string) {
  const input = el(f).querySelector('input[name="codigo"]') as HTMLInputElement;
  input.value = codigo;
  (input.closest('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
  f.detectChanges();
}

function manual(f: F, id: string) {
  const select = el(f).querySelector('select[name="cliente"]') as HTMLSelectElement;
  select.value = id;
  select.dispatchEvent(new Event('change'));
  (select.closest('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
  f.detectChanges();
}

describe('Asistencia (pantalla)', () => {
  describe('lista de hoy', () => {
    it('mientras carga lo indica', () => {
      expect(texto(crear({ listar: () => new Subject() }).fixture)).toContain('Cargando asistencia');
    });

    it('si falla, muestra el error y "Reintentar" vuelve a cargar', () => {
      let intento = 0;
      const { fixture, asistencias } = crear({ listar: () => (++intento === 1 ? throwError(() => new HttpErrorResponse({ status: 500 })) : of(deHoy())) });
      expect(texto(fixture)).toContain('No pudimos cargar la asistencia');
      (Array.from(el(fixture).querySelectorAll('button')).find((b) => b.textContent?.includes('Reintentar')) as HTMLButtonElement).click();
      fixture.detectChanges();
      expect(asistencias.listar).toHaveBeenCalledTimes(2);
    });

    it('muestra las entradas de hoy con su estado y cuántas personas hay dentro', () => {
      const { fixture } = crear();
      expect(filas(fixture).length).toBe(2);
      const t = texto(fixture);
      expect(t).toContain('1 persona dentro ahora');
      expect(t).toContain('Carlos Pérez');
      expect(t).toContain('07:30');
      expect(t).toContain('Dentro');
      expect(t).toContain('07:15'); // la salida de María
      expect(t).toContain('QR');
      expect(t).toContain('Manual');
    });

    it('solo muestra las de hoy, no las de otros días', () => {
      const { fixture } = crear({ listar: () => of([...deHoy(), asis(300, 3, '08:00:00', null, 'qr', en(-1))]) });
      expect(filas(fixture).length).toBe(2);
    });

    it('sin entradas hoy lo dice', () => {
      const { fixture } = crear({ listar: () => of([]) });
      expect(texto(fixture)).toContain('Todavía no hay entradas hoy');
      expect(texto(fixture)).toContain('0 personas dentro ahora');
    });
  });

  describe('registrar con código', () => {
    it('registra la entrada con el código canónico, avisa la hora y la nota de vencimiento, y recarga', () => {
      const { fixture, asistencias } = crear();
      escanear(fixture, 'APEXFIT-USER-2-maría@x');

      expect(asistencias.registrarQr).toHaveBeenCalledWith('APEXFIT-USER-2-maría@apexfit.test');
      expect(texto(fixture)).toContain('Entrada registrada: María Rojas · 07:42');
      expect(texto(fixture)).toContain('Su membresía vence en 3 días');
      expect(asistencias.listar).toHaveBeenCalledTimes(2);
      expect((el(fixture).querySelector('input[name="codigo"]') as HTMLInputElement).value).toBe('');
    });

    it('acepta un id suelto y un correo', () => {
      const a = crear();
      escanear(a.fixture, '8');
      expect(a.asistencias.registrarQr).toHaveBeenCalledTimes(1);

      TestBed.resetTestingModule();
      const b = crear();
      escanear(b.fixture, 'SOFÍA@APEXFIT.TEST');
      expect(b.asistencias.registrarQr).toHaveBeenCalledTimes(1);
    });

    it('un código vacío o ilegible no registra nada', () => {
      const { fixture, asistencias } = crear();
      escanear(fixture, '   ');
      expect(texto(fixture)).toContain('Escribe o escanea un código válido');
      escanear(fixture, 'hola');
      expect(asistencias.registrarQr).not.toHaveBeenCalled();
    });

    it('un código de alguien que no existe no registra nada', () => {
      const { fixture, asistencias } = crear();
      escanear(fixture, 'APEXFIT-USER-999-x@y.z');
      expect(texto(fixture)).toContain('Código no reconocido');
      expect(asistencias.registrarQr).not.toHaveBeenCalled();
    });

    it('si el backend rechaza, lo muestra y no recarga', () => {
      const { fixture, asistencias } = crear({ registrarQr: () => throwError(() => new HttpErrorResponse({ status: 403 })) });
      escanear(fixture, '8');
      expect(texto(fixture)).toContain('No tienes permiso para hacer esto');
      expect(asistencias.listar).toHaveBeenCalledTimes(1);
    });
  });

  describe('validaciones que el backend no hace (RF-07)', () => {
    const casos: [string, string, string][] = [
      ['membresía vencida', '3', 'La membresía de Pedro Salgado venció el'],
      ['sin membresía', '4', 'Laura Gómez no tiene una membresía'],
      ['membresía cancelada', '7', 'La membresía de Juan Mora está cancelada'],
      ['usuario inactivo', '6', 'Ana Ruiz está inactivo'],
      ['no es cliente', '5', 'Solo se registra la asistencia de clientes'],
    ];

    for (const [nombre, id, mensaje] of casos) {
      it(`bloquea la entrada: ${nombre}`, () => {
        const { fixture, asistencias } = crear();
        escanear(fixture, id);
        expect(texto(fixture)).toContain(mensaje);
        expect(asistencias.registrarQr).not.toHaveBeenCalled();
        expect(asistencias.registrarManual).not.toHaveBeenCalled();
      });
    }
  });

  describe('salida', () => {
    it('si el cliente ya está dentro, volver a escanear su código registra su SALIDA', () => {
      const { fixture, asistencias } = crear();
      escanear(fixture, '1');
      expect(asistencias.registrarQr).not.toHaveBeenCalled();
      expect((asistencias.registrarSalida.mock.calls[0] as unknown as [Asistencia])[0].id).toBe(100);
      expect(texto(fixture)).toContain('Salida registrada: Carlos Pérez · 09:05');
    });

    it('el botón "Registrar salida" también la registra', () => {
      const { fixture, asistencias } = crear();
      (el(fixture).querySelector('button[aria-label="Registrar salida de Carlos Pérez"]') as HTMLButtonElement).click();
      fixture.detectChanges();
      expect(asistencias.registrarSalida).toHaveBeenCalledTimes(1);
    });

    it('solo los que están dentro tienen botón de salida', () => {
      const { fixture } = crear();
      expect(el(fixture).querySelectorAll('button[aria-label^="Registrar salida"]').length).toBe(1);
    });

    it('la salida se permite aunque la membresía ya haya vencido', () => {
      const { fixture, asistencias } = crear({ listar: () => of([asis(102, 3, '07:00:00', null)]) });
      escanear(fixture, '3'); // Pedro, con membresía vencida, pero ya está dentro
      expect(asistencias.registrarSalida).toHaveBeenCalledTimes(1);
    });
  });

  describe('registro manual', () => {
    it('solo ofrece clientes activos', () => {
      const { fixture } = crear();
      const opciones = Array.from((el(fixture).querySelector('select[name="cliente"]') as HTMLSelectElement).options).map((o) => o.textContent);
      expect(opciones.some((o) => o?.includes('Sofía'))).toBe(true);
      expect(opciones.some((o) => o?.includes('Mario'))).toBe(false); // entrenador
      expect(opciones.some((o) => o?.includes('Ana'))).toBe(false); // inactiva
    });

    it('registra la entrada manual del cliente elegido', () => {
      const { fixture, asistencias } = crear();
      manual(fixture, '8');
      expect(asistencias.registrarManual).toHaveBeenCalledWith(8);
      expect(texto(fixture)).toContain('Entrada registrada: Sofía León · 07:50');
    });

    it('sin elegir cliente lo pide', () => {
      const { fixture, asistencias } = crear();
      manual(fixture, '');
      expect(texto(fixture)).toContain('Elige un cliente');
      expect(asistencias.registrarManual).not.toHaveBeenCalled();
    });

    it('también valida la membresía', () => {
      const { fixture, asistencias } = crear();
      manual(fixture, '3');
      expect(texto(fixture)).toContain('venció el');
      expect(asistencias.registrarManual).not.toHaveBeenCalled();
    });
  });
});
