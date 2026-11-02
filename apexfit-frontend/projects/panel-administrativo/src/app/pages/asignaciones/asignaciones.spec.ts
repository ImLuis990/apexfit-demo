import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Rol } from 'shared';
import { Subject, of, throwError } from 'rxjs';
import { Asignacion } from '../../data/asignaciones.models';
import { AsignacionesService, DatosAsignaciones } from '../../data/asignaciones.service';
import { aUsuario } from '../../data/usuarios.mapper';
import { ID_ROL, Usuario } from '../../data/usuarios.models';
import { guardarSesion, proveedoresPanel } from '../../testing';
import { Asignaciones } from './asignaciones';

const usuario = (id: number, nombre: string, apellido: string, rol: Rol = 'cliente', estado = 'activo'): Usuario =>
  aUsuario({
    idUsuario: id, nombre, apellido, correo: `${nombre.toLowerCase()}@apexfit.test`, idRol: ID_ROL[rol],
    telefono: null, fechaNacimiento: null, estado,
  });

const asig = (id: number, idEntrenador: number, idCliente: number, vigente = true): Asignacion => ({
  id, idEntrenador, idCliente, desde: '2026-10-05', estado: vigente ? 'activa' : 'inactiva', vigente,
});

const usuarios = () => [
  usuario(1, 'Carlos', 'Pérez'),
  usuario(2, 'María', 'Rojas'),
  usuario(3, 'Pedro', 'Salgado'),
  usuario(4, 'Luisa', 'Zapata', 'cliente', 'inactivo'),
  usuario(10, 'Mario', 'Díaz', 'entrenador'),
  usuario(11, 'Ana', 'Báez', 'entrenador'),
];

// Ana (11) atiende a María; Mario (10) a Carlos; Pedro no tiene entrenador. Ana va primero (Báez < Díaz).
const asignaciones = () => [asig(1, 10, 1), asig(2, 11, 2)];

const datos = (over: Partial<DatosAsignaciones> = {}): DatosAsignaciones => ({
  asignaciones: asignaciones(), usuarios: usuarios(), total: 6, ...over,
});

interface Fuentes {
  listar?: () => unknown;
  asignar?: () => unknown;
  quitar?: () => unknown;
}

function crear(f: Fuentes = {}) {
  localStorage.clear();
  guardarSesion('administrador', 'ana@apexfit.test', 99);
  const servicio = {
    listar: vi.fn(f.listar ?? (() => of(datos()))),
    asignar: vi.fn(f.asignar ?? (() => of(asig(50, 11, 3)))),
    quitar: vi.fn(f.quitar ?? (() => of(undefined))),
  };
  TestBed.configureTestingModule({
    imports: [Asignaciones],
    providers: [provideRouter([]), ...proveedoresPanel(), { provide: AsignacionesService, useValue: servicio }],
  });
  const fixture = TestBed.createComponent(Asignaciones);
  fixture.detectChanges();
  return { fixture, servicio };
}

type F = ComponentFixture<Asignaciones>;
const el = (f: F) => f.nativeElement as HTMLElement;
const texto = (f: F) => el(f).textContent?.replace(/\s+/g, ' ') ?? '';
const botonTexto = (f: F, contiene: string) =>
  Array.from(el(f).querySelectorAll('button')).find((b) => b.textContent?.includes(contiene)) as HTMLButtonElement;
const botonAria = (f: F, etiqueta: string) => el(f).querySelector(`button[aria-label="${etiqueta}"]`) as HTMLButtonElement;
const entrenadores = (f: F) => Array.from(el(f).querySelectorAll('nav .entrenador')) as HTMLButtonElement[];
/** Los nombres de los clientes de la tarjeta (sin las opciones del desplegable). */
const clientesDelDetalle = (f: F) =>
  Array.from(el(f).querySelectorAll('.detalle .clientes li .datos b')).map((b) => b.textContent?.trim());
const detalle = (f: F) => el(f).querySelector('.detalle')?.textContent?.replace(/\s+/g, ' ') ?? '';
const select = (f: F) => el(f).querySelector('select[formcontrolname="idCliente"]') as HTMLSelectElement;
const opciones = (f: F, grupo: string) =>
  Array.from(select(f).querySelectorAll(`optgroup[label="${grupo}"] option`)).map((o) => o.textContent?.trim());

function elegirCliente(f: F, id: string) {
  const s = select(f);
  s.value = id;
  s.dispatchEvent(new Event('change'));
  f.detectChanges();
}
function enviar(f: F) {
  (el(f).querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
  f.detectChanges();
}

describe('Asignaciones (pantalla)', () => {
  describe('carga', () => {
    it('mientras carga lo indica', () => {
      expect(texto(crear({ listar: () => new Subject() }).fixture)).toContain('Cargando asignaciones');
    });

    it('si falla, muestra el error y «Reintentar» vuelve a cargar', () => {
      let intento = 0;
      const { fixture, servicio } = crear({
        listar: () => (++intento === 1 ? throwError(() => new HttpErrorResponse({ status: 500 })) : of(datos())),
      });
      expect(texto(fixture)).toContain('No pudimos cargar las asignaciones');
      botonTexto(fixture, 'Reintentar').click();
      fixture.detectChanges();
      expect(servicio.listar).toHaveBeenCalledTimes(2);
      expect(entrenadores(fixture).length).toBe(2);
    });

    it('sin entrenadores activos lo dice y manda a Usuarios', () => {
      const { fixture } = crear({ listar: () => of(datos({ asignaciones: [], usuarios: [usuario(1, 'Carlos', 'Pérez')] })) });
      expect(texto(fixture)).toContain('No hay entrenadores activos');
      expect(el(fixture).querySelector('a[href="/usuarios"]')).not.toBeNull();
      expect(entrenadores(fixture).length).toBe(0);
    });

    it('avisa si no cupieron todos los usuarios en la carga', () => {
      const { fixture } = crear({ listar: () => of(datos({ total: 350 })) });
      expect(texto(fixture)).toContain('Hay 350 usuarios en total');
    });
  });

  describe('resumen y lista de entrenadores', () => {
    it('muestra cuántos entrenadores, clientes con entrenador y clientes sin entrenador hay', () => {
      const { fixture } = crear();
      const kpis = Array.from(el(fixture).querySelectorAll('.kpi')).map(
        (k) => `${k.querySelector('b')?.textContent?.trim()} ${k.querySelector('span')?.textContent?.trim()}`,
      );
      expect(kpis).toEqual(['2 Entrenadores', '2 Clientes con entrenador', '1 Cliente sin entrenador']);
    });

    it('lista a los entrenadores con su número de clientes y marca el elegido', () => {
      const { fixture } = crear();
      const lista = entrenadores(fixture);
      expect(lista.map((b) => b.textContent?.replace(/\s+/g, ' ').trim())).toEqual(['Ana Báez 1 cliente', 'Mario Díaz 1 cliente']);
      expect(lista[0].getAttribute('aria-pressed')).toBe('true');
      expect(lista[1].getAttribute('aria-pressed')).toBe('false');
    });

    it('al abrir muestra al primer entrenador con sus clientes y la fecha desde la que los atiende', () => {
      const { fixture } = crear();
      const d = detalle(fixture);
      expect(d).toContain('Ana Báez');
      expect(clientesDelDetalle(fixture)).toEqual(['María Rojas']);
      expect(d).toContain('Desde el 05/10/2026');
    });

    it('al elegir a otro entrenador cambia el detalle', () => {
      const { fixture } = crear();
      entrenadores(fixture)[1].click();
      fixture.detectChanges();
      expect(detalle(fixture)).toContain('Mario Díaz');
      expect(clientesDelDetalle(fixture)).toEqual(['Carlos Pérez']);
      expect(entrenadores(fixture)[1].getAttribute('aria-pressed')).toBe('true');
    });

    it('un entrenador sin clientes lo dice', () => {
      const { fixture } = crear({ listar: () => of(datos({ asignaciones: [] })) });
      expect(detalle(fixture)).toContain('Ana todavía no tiene clientes asignados');
    });
  });

  describe('asignar un cliente', () => {
    it('ofrece primero a los libres y aparte a los que ya tienen otro entrenador (sin los inactivos ni los suyos)', () => {
      const { fixture } = crear();
      expect(opciones(fixture, 'Sin entrenador')).toEqual(['Pedro Salgado · pedro@apexfit.test']);
      expect(opciones(fixture, 'Ya tienen otro entrenador')).toEqual(['Carlos Pérez · con Mario Díaz']);
      expect(select(fixture).textContent).not.toContain('Luisa');
      expect(select(fixture).textContent).not.toContain('María');
    });

    it('sin elegir cliente no envía y pide elegir uno', () => {
      const { fixture, servicio } = crear();
      enviar(fixture);
      expect(servicio.asignar).not.toHaveBeenCalled();
      expect(texto(fixture)).toContain('Elige un cliente.');
    });

    it('asigna al cliente elegido, avisa y recarga la lista', () => {
      const { fixture, servicio } = crear();
      elegirCliente(fixture, '3');
      enviar(fixture);
      expect(servicio.asignar).toHaveBeenCalledWith(11, 3, asignaciones());
      expect(texto(fixture)).toContain('Pedro Salgado ahora es cliente de Ana Báez.');
      expect(servicio.listar).toHaveBeenCalledTimes(2);
      expect(select(fixture).value).toBe('');
    });

    it('si el cliente elegido ya tiene otro entrenador, avisa que tendrá más de uno', () => {
      const { fixture } = crear();
      elegirCliente(fixture, '1');
      expect(texto(fixture)).toContain('Este cliente ya tiene a Mario Díaz: tendrá más de un entrenador.');
      elegirCliente(fixture, '3');
      expect(texto(fixture)).not.toContain('tendrá más de un entrenador');
    });

    it('desde «Clientes sin entrenador» se asigna con un clic al entrenador elegido', () => {
      const { fixture, servicio } = crear();
      expect(texto(fixture)).toContain('Clientes sin entrenador');
      botonAria(fixture, 'Asignar a Pedro Salgado con Ana Báez').click();
      fixture.detectChanges();
      expect(servicio.asignar).toHaveBeenCalledWith(11, 3, asignaciones());
      expect(texto(fixture)).toContain('Pedro Salgado ahora es cliente de Ana Báez.');
    });

    it('si todos tienen entrenador, esa sección no aparece', () => {
      const todos = [asig(1, 10, 1), asig(2, 11, 2), asig(3, 11, 3)];
      const { fixture } = crear({ listar: () => of(datos({ asignaciones: todos })) });
      expect(el(fixture).querySelector('.sin-entrenador')).toBeNull();
    });

    it('mientras se guarda, los botones quedan bloqueados', () => {
      const { fixture } = crear({ asignar: () => new Subject() });
      elegirCliente(fixture, '3');
      enviar(fixture);
      expect(botonTexto(fixture, 'Asignar').disabled).toBe(true);
      expect(botonAria(fixture, 'Quitar a María Rojas de Ana Báez').disabled).toBe(true);
    });

    it('si el backend falla, lo dice y no recarga', () => {
      const { fixture, servicio } = crear({ asignar: () => throwError(() => new HttpErrorResponse({ status: 500 })) });
      elegirCliente(fixture, '3');
      enviar(fixture);
      expect(texto(fixture)).toContain('No pudimos guardar los cambios');
      expect(servicio.listar).toHaveBeenCalledTimes(1);
      expect(botonTexto(fixture, 'Asignar').disabled).toBe(false);
    });

    it('si el cliente o el entrenador ya no existen, pide actualizar', () => {
      const { fixture } = crear({ asignar: () => throwError(() => new HttpErrorResponse({ status: 404 })) });
      elegirCliente(fixture, '3');
      enviar(fixture);
      expect(texto(fixture)).toContain('ya no existe. Actualiza la lista');
    });
  });

  describe('quitar un cliente', () => {
    it('pide confirmación y «No» la descarta sin llamar al backend', () => {
      const { fixture, servicio } = crear();
      botonAria(fixture, 'Quitar a María Rojas de Ana Báez').click();
      fixture.detectChanges();
      expect(texto(fixture)).toContain('¿Quitar a María Rojas?');
      botonTexto(fixture, 'No').click();
      fixture.detectChanges();
      expect(texto(fixture)).not.toContain('¿Quitar a María Rojas?');
      expect(servicio.quitar).not.toHaveBeenCalled();
    });

    it('al confirmar quita la asignación, avisa y recarga', () => {
      const { fixture, servicio } = crear();
      botonAria(fixture, 'Quitar a María Rojas de Ana Báez').click();
      fixture.detectChanges();
      botonTexto(fixture, 'Sí, quitar').click();
      fixture.detectChanges();
      expect(servicio.quitar).toHaveBeenCalledWith(asig(2, 11, 2), asignaciones());
      expect(texto(fixture)).toContain('María Rojas ya no es cliente de Ana Báez.');
      expect(servicio.listar).toHaveBeenCalledTimes(2);
    });

    it('si falla, muestra el error', () => {
      const { fixture } = crear({ quitar: () => throwError(() => new HttpErrorResponse({ status: 0 })) });
      botonAria(fixture, 'Quitar a María Rojas de Ana Báez').click();
      fixture.detectChanges();
      botonTexto(fixture, 'Sí, quitar').click();
      fixture.detectChanges();
      expect(texto(fixture)).toContain('No se pudo conectar con el servidor');
    });

    it('al cambiar de entrenador se descarta la confirmación pendiente', () => {
      const { fixture } = crear();
      botonAria(fixture, 'Quitar a María Rojas de Ana Báez').click();
      fixture.detectChanges();
      entrenadores(fixture)[1].click();
      fixture.detectChanges();
      expect(texto(fixture)).not.toContain('¿Quitar a');
    });
  });

  describe('entrenador inactivo', () => {
    const conInactivo = () =>
      datos({ usuarios: [...usuarios(), usuario(12, 'Jorge', 'Vega', 'entrenador', 'inactivo')], asignaciones: [...asignaciones(), asig(3, 12, 3)] });

    it('aparece mientras tenga clientes, marcado como inactivo', () => {
      const { fixture } = crear({ listar: () => of(conInactivo()) });
      expect(entrenadores(fixture).map((b) => b.textContent?.replace(/\s+/g, ' ').trim())).toContain('Jorge Vega 1 cliente · inactivo');
    });

    it('no se le pueden asignar más clientes, pero sí quitarle los que tiene', () => {
      const { fixture } = crear({ listar: () => of(conInactivo()) });
      entrenadores(fixture)[2].click();
      fixture.detectChanges();
      expect(el(fixture).querySelector('form')).toBeNull();
      expect(texto(fixture)).toContain('Este entrenador está inactivo');
      expect(botonAria(fixture, 'Quitar a Pedro Salgado de Jorge Vega')).not.toBeNull();
    });

    it('«Clientes sin entrenador» no ofrece asignarlos a un entrenador inactivo', () => {
      // Pedro sigue sin entrenador: Jorge (inactivo) solo atiende a María.
      const { fixture } = crear({
        listar: () =>
          of(
            datos({
              usuarios: [...usuarios(), usuario(12, 'Jorge', 'Vega', 'entrenador', 'inactivo')],
              asignaciones: [...asignaciones(), asig(3, 12, 2)],
            }),
          ),
      });
      expect(el(fixture).querySelector('.sin-entrenador button')).not.toBeNull(); // con Ana elegida sí
      entrenadores(fixture)[2].click(); // Jorge, inactivo
      fixture.detectChanges();
      expect(el(fixture).querySelector('.sin-entrenador button')).toBeNull();
    });
  });
});
