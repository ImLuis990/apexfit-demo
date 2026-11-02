import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Rol } from 'shared';
import { Subject, of, throwError } from 'rxjs';
import { hoyIso, sumarDias } from '../../data/formato';
import { Membresia } from '../../data/membresias.models';
import { MembresiasService } from '../../data/membresias.service';
import { aUsuario } from '../../data/usuarios.mapper';
import { ID_ROL, Usuario } from '../../data/usuarios.models';
import { UsuariosService } from '../../data/usuarios.service';
import { guardarSesion, proveedoresPanel } from '../../testing';
import { Membresias } from './membresias';

const HOY = hoyIso();
const en = (dias: number) => sumarDias(HOY, dias);

const usuario = (id: number, nombre: string, apellido: string, rol: Rol = 'cliente', estado = 'activo'): Usuario =>
  aUsuario({
    idUsuario: id, nombre, apellido, correo: `${nombre.toLowerCase()}@apexfit.test`, idRol: ID_ROL[rol],
    telefono: null, fechaNacimiento: null, estado,
  });

const mem = (id: number, idUsuario: number, finEn: number, over: Partial<Membresia> = {}): Membresia => ({
  id, idUsuario, tipo: 'Mensual', fechaInicio: en(finEn - 30), fechaFin: en(finEn), precio: 90000, estado: 'activa', ...over,
});

const usuarios = () => [
  usuario(1, 'Carlos', 'Pérez'),
  usuario(2, 'María', 'Rojas'),
  usuario(3, 'Pedro', 'Salgado', 'cliente', 'inactivo'),
  usuario(4, 'Mario', 'Díaz', 'entrenador'),
];

const membresias = () => [
  mem(10, 1, 40), // Carlos: activa
  mem(11, 2, 3), // María: por vencer
  mem(12, 3, -10), // Pedro: vencida
  mem(13, 1, 20, { estado: 'cancelada' }), // Carlos: cancelada
];

interface Fuentes {
  listar?: () => unknown;
  usuarios?: () => unknown;
  crear?: () => unknown;
  actualizar?: () => unknown;
  cancelar?: () => unknown;
}

function crear(f: Fuentes = {}) {
  localStorage.clear();
  guardarSesion('administrador', 'ana@apexfit.test', 99);
  const servicio = {
    listar: vi.fn(f.listar ?? (() => of(membresias()))),
    crear: vi.fn(f.crear ?? (() => of(mem(20, 1, 30)))),
    actualizar: vi.fn(f.actualizar ?? (() => of(mem(10, 1, 40)))),
    cancelar: vi.fn(f.cancelar ?? (() => of(mem(10, 1, 40, { estado: 'cancelada' })))),
  };
  const lista = { listar: vi.fn(f.usuarios ?? (() => of({ usuarios: usuarios(), total: 4 }))) };
  TestBed.configureTestingModule({
    imports: [Membresias],
    providers: [
      provideRouter([]), ...proveedoresPanel(),
      { provide: MembresiasService, useValue: servicio },
      { provide: UsuariosService, useValue: lista },
    ],
  });
  const fixture = TestBed.createComponent(Membresias);
  fixture.detectChanges();
  return { fixture, servicio, lista };
}

type F = ComponentFixture<Membresias>;
const el = (f: F) => f.nativeElement as HTMLElement;
const texto = (f: F) => el(f).textContent?.replace(/\s+/g, ' ') ?? '';
const filas = (f: F) => Array.from(el(f).querySelectorAll('tbody tr'));
const boton = (f: F, etiqueta: string) => el(f).querySelector(`button[aria-label="${etiqueta}"]`) as HTMLButtonElement;
const botonTexto = (f: F, contiene: string) =>
  Array.from(el(f).querySelectorAll('button')).find((b) => b.textContent?.includes(contiene)) as HTMLButtonElement;
const campo = (f: F, nombre: string) =>
  el(f).querySelector(`[formcontrolname="${nombre}"]`) as HTMLInputElement & HTMLSelectElement;

function escribir(f: F, nombre: string, valor: string) {
  const c = campo(f, nombre);
  c.value = valor;
  c.dispatchEvent(new Event(c instanceof HTMLSelectElement ? 'change' : 'input'));
  f.detectChanges();
}
function enviar(f: F) {
  (el(f).querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
  f.detectChanges();
}
function abrirCrear(f: F) {
  botonTexto(f, '+ Nueva membresía').click();
  f.detectChanges();
}

describe('Membresías (pantalla)', () => {
  describe('listado', () => {
    it('mientras carga lo indica', () => {
      expect(texto(crear({ listar: () => new Subject() }).fixture)).toContain('Cargando membresías');
    });

    it('si falla, muestra el error y "Reintentar" vuelve a cargar', () => {
      let intento = 0;
      const { fixture, servicio, lista } = crear({
        listar: () => (++intento === 1 ? throwError(() => new HttpErrorResponse({ status: 500 })) : of(membresias())),
      });
      expect(texto(fixture)).toContain('No pudimos cargar las membresías');
      botonTexto(fixture, 'Reintentar').click();
      fixture.detectChanges();
      expect(servicio.listar).toHaveBeenCalledTimes(2);
      expect(lista.listar).toHaveBeenCalledTimes(2);
      expect(filas(fixture).length).toBe(4);
    });

    it('sin membresías lo dice', () => {
      expect(texto(crear({ listar: () => of([]) }).fixture)).toContain('Todavía no hay membresías');
    });

    it('muestra cliente, plan, fechas, precio en pesos y el estado calculado con las fechas', () => {
      const { fixture } = crear();
      const t = texto(fixture);
      expect(t).toContain('Carlos Pérez');
      expect(t).toContain('carlos@apexfit.test');
      expect(t).toContain('$ 90.000');
      expect(filas(fixture).length).toBe(4);
      expect(el(fixture).querySelectorAll('.af-tag--warn').length).toBe(1); // María
      expect(el(fixture).querySelectorAll('.af-tag--danger').length).toBe(1); // Pedro
      expect(el(fixture).querySelectorAll('.af-tag.cancelada').length).toBe(1);
      expect(t).toContain('3 días'); // por vencer
    });

    it('una membresía de un usuario que no está en la lista se muestra con su número', () => {
      const { fixture } = crear({ listar: () => of([mem(30, 99, 40)]) });
      expect(texto(fixture)).toContain('Usuario #99');
    });

    it('los filtros traen el contador de cada estado', () => {
      const { fixture } = crear();
      const chips = Array.from(el(fixture).querySelectorAll('.chip')).map((c) => c.textContent?.replace(/\s+/g, ' ').trim());
      expect(chips).toEqual(['Todas 4', 'Activas 1', 'Por vencer 1', 'Vencidas 1', 'Canceladas 1']);
    });
  });

  describe('filtros', () => {
    it('filtra por estado con los botones', () => {
      const { fixture } = crear();
      botonTexto(fixture, 'Por vencer').click();
      fixture.detectChanges();
      expect(filas(fixture).length).toBe(1);
      expect(texto(fixture)).toContain('María Rojas');
      expect(botonTexto(fixture, 'Por vencer').getAttribute('aria-pressed')).toBe('true');
      expect(texto(fixture)).toContain('Mostrando 1 de 4 membresías');
    });

    it('busca por cliente sin importar tildes', () => {
      const { fixture } = crear();
      const q = el(fixture).querySelector('input[type="search"]') as HTMLInputElement;
      q.value = 'MARÍA';
      q.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      expect(filas(fixture).length).toBe(1);
    });

    it('si nada coincide, lo dice', () => {
      const { fixture } = crear();
      const q = el(fixture).querySelector('input[type="search"]') as HTMLInputElement;
      q.value = 'zzz';
      q.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      expect(texto(fixture)).toContain('Ninguna membresía coincide');
    });
  });

  describe('crear membresía', () => {
    it('abre el formulario con el plan Mensual, su precio y la fecha de fin calculados', () => {
      const { fixture } = crear();
      abrirCrear(fixture);
      expect(texto(fixture)).toContain('Nueva membresía');
      expect(campo(fixture, 'plan').value).toBe('Mensual');
      expect(campo(fixture, 'precio').value).toBe('90000');
      expect(campo(fixture, 'fechaInicio').value).toBe(HOY);
      expect(campo(fixture, 'fechaFin').value).toBe(en(30));
    });

    it('solo ofrece clientes activos (no entrenadores ni inactivos)', () => {
      const { fixture } = crear();
      abrirCrear(fixture);
      const opciones = Array.from(campo(fixture, 'idUsuario').options).map((o) => o.textContent?.trim());
      expect(opciones.some((o) => o?.includes('Carlos Pérez'))).toBe(true);
      expect(opciones.some((o) => o?.includes('María Rojas'))).toBe(true);
      expect(opciones.some((o) => o?.includes('Pedro'))).toBe(false); // inactivo
      expect(opciones.some((o) => o?.includes('Mario'))).toBe(false); // entrenador
    });

    it('al cambiar el plan se recalculan el precio y la fecha de fin', () => {
      const { fixture } = crear();
      abrirCrear(fixture);
      escribir(fixture, 'plan', 'Trimestral');
      expect(campo(fixture, 'precio').value).toBe('240000');
      expect(campo(fixture, 'fechaFin').value).toBe(en(90));
    });

    it('al cambiar la fecha de inicio se recalcula la fecha de fin', () => {
      const { fixture } = crear();
      abrirCrear(fixture);
      escribir(fixture, 'fechaInicio', en(10));
      expect(campo(fixture, 'fechaFin').value).toBe(en(40));
    });

    it('no envía sin cliente y lo pide', () => {
      const { fixture, servicio } = crear();
      abrirCrear(fixture);
      enviar(fixture);
      expect(servicio.crear).not.toHaveBeenCalled();
      expect(texto(fixture)).toContain('Elige un cliente');
    });

    it('no acepta una fecha de fin anterior al inicio', () => {
      const { fixture, servicio } = crear();
      abrirCrear(fixture);
      escribir(fixture, 'idUsuario', '2');
      escribir(fixture, 'fechaFin', en(-5));
      enviar(fixture);
      expect(servicio.crear).not.toHaveBeenCalled();
      expect(texto(fixture)).toContain('no puede ser anterior al inicio');
    });

    it('no acepta un precio vacío o en cero', () => {
      const { fixture, servicio } = crear();
      abrirCrear(fixture);
      escribir(fixture, 'idUsuario', '2');
      escribir(fixture, 'precio', '0');
      enviar(fixture);
      expect(servicio.crear).not.toHaveBeenCalled();
      expect(texto(fixture)).toContain('precio mayor que 0');
    });

    it('avisa si el cliente elegido ya tiene una membresía vigente', () => {
      const { fixture } = crear();
      abrirCrear(fixture);
      escribir(fixture, 'idUsuario', '1'); // Carlos tiene una activa
      expect(el(fixture).querySelector('.nota-aviso')?.textContent).toContain('ya tiene una membresía vigente hasta el');
    });

    it('crea la membresía, cierra el formulario, avisa y recarga la lista', () => {
      const { fixture, servicio } = crear();
      abrirCrear(fixture);
      escribir(fixture, 'idUsuario', '2');

      enviar(fixture);

      expect(servicio.crear).toHaveBeenCalledWith({
        idUsuario: 2, tipo: 'Mensual', fechaInicio: HOY, fechaFin: en(30), precio: 90000,
      });
      expect(el(fixture).querySelector('form')).toBeNull();
      expect(texto(fixture)).toContain('Membresía creada para María Rojas');
      expect(servicio.listar).toHaveBeenCalledTimes(2);
    });

    it('si el backend rechaza, muestra el error y deja el formulario abierto', () => {
      const { fixture } = crear({ crear: () => throwError(() => new HttpErrorResponse({ status: 403 })) });
      abrirCrear(fixture);
      escribir(fixture, 'idUsuario', '2');
      enviar(fixture);
      expect(texto(fixture)).toContain('No tienes permiso para hacer esto');
      expect(el(fixture).querySelector('form')).not.toBeNull();
    });

    it('si el cliente ya no existe, lo explica', () => {
      const { fixture } = crear({ crear: () => throwError(() => new HttpErrorResponse({ status: 404 })) });
      abrirCrear(fixture);
      escribir(fixture, 'idUsuario', '2');
      enviar(fixture);
      expect(texto(fixture)).toContain('ya no existe');
    });
  });

  describe('editar membresía', () => {
    it('abre el formulario con los datos y no deja cambiar el cliente', () => {
      const { fixture } = crear();
      boton(fixture, 'Editar membresía de Carlos Pérez').click();
      fixture.detectChanges();
      expect(texto(fixture)).toContain('Editar membresía');
      expect(campo(fixture, 'idUsuario').disabled).toBe(true);
      expect(campo(fixture, 'estado')).not.toBeNull();
    });

    it('guarda pasando la membresía original y no recalcula solo los campos al editar', () => {
      const { fixture, servicio } = crear();
      boton(fixture, 'Editar membresía de Carlos Pérez').click();
      fixture.detectChanges();
      escribir(fixture, 'precio', '95000');

      enviar(fixture);

      const [original, datos] = servicio.actualizar.mock.calls[0] as unknown as [Membresia, Record<string, unknown>];
      expect(original.id).toBe(10);
      expect(datos).toMatchObject({ tipo: 'Mensual', fechaFin: en(40), precio: 95000, estado: 'activa' });
      expect(texto(fixture)).toContain('Cambios guardados en la membresía de Carlos Pérez');
    });

    it('se puede reactivar una cancelada cambiando su estado', () => {
      const { fixture, servicio } = crear();
      // la cancelada de Carlos es la última fila (vence en 20 días, tras la de 40)
      const fila = filas(fixture).find((r) => r.textContent?.includes('Cancelada')) as Element;
      (fila.querySelector('button[aria-label^="Editar"]') as HTMLButtonElement).click();
      fixture.detectChanges();
      expect(campo(fixture, 'estado').value).toBe('cancelada');
      escribir(fixture, 'estado', 'activa');
      enviar(fixture);
      expect((servicio.actualizar.mock.calls[0] as unknown as [unknown, { estado: string }])[1].estado).toBe('activa');
    });
  });

  describe('renovar membresía', () => {
    it('una vigente se renueva desde el día siguiente a su fin, con el mismo plan', () => {
      const { fixture, servicio } = crear();
      boton(fixture, 'Renovar membresía de María Rojas').click(); // vence en 3 días
      fixture.detectChanges();
      expect(texto(fixture)).toContain('Renovar membresía');
      expect(campo(fixture, 'fechaInicio').value).toBe(en(4));
      expect(campo(fixture, 'fechaFin').value).toBe(en(34));
      expect(campo(fixture, 'idUsuario').disabled).toBe(true);

      enviar(fixture);

      expect(servicio.crear).toHaveBeenCalledWith({
        idUsuario: 2, tipo: 'Mensual', fechaInicio: en(4), fechaFin: en(34), precio: 90000,
      });
      expect(texto(fixture)).toContain('Membresía de María Rojas renovada');
    });

    it('una vencida se renueva desde hoy', () => {
      const { fixture } = crear();
      boton(fixture, 'Renovar membresía de Pedro Salgado').click();
      fixture.detectChanges();
      expect(campo(fixture, 'fechaInicio').value).toBe(HOY);
    });
  });

  describe('cancelar membresía', () => {
    it('pide confirmación y se puede descartar', () => {
      const { fixture, servicio } = crear();
      boton(fixture, 'Cancelar membresía de María Rojas').click();
      fixture.detectChanges();
      expect(texto(fixture)).toContain('¿Cancelar la membresía de María Rojas?');

      botonTexto(fixture, 'No').click();
      fixture.detectChanges();

      expect(texto(fixture)).not.toContain('¿Cancelar la membresía');
      expect(servicio.cancelar).not.toHaveBeenCalled();
    });

    it('al confirmar, cancela, avisa y recarga', () => {
      const { fixture, servicio } = crear();
      boton(fixture, 'Cancelar membresía de María Rojas').click();
      fixture.detectChanges();

      botonTexto(fixture, 'Sí, cancelar').click();
      fixture.detectChanges();

      expect((servicio.cancelar.mock.calls[0] as unknown as [Membresia])[0].id).toBe(11);
      expect(texto(fixture)).toContain('La membresía de María Rojas quedó cancelada');
      expect(servicio.listar).toHaveBeenCalledTimes(2);
    });

    it('una membresía ya cancelada no ofrece "Cancelar"', () => {
      const { fixture } = crear();
      const fila = filas(fixture).find((r) => r.textContent?.includes('Cancelada')) as Element;
      expect(fila.querySelector('button[aria-label^="Cancelar"]')).toBeNull();
      expect(fila.querySelector('button[aria-label^="Renovar"]')).not.toBeNull();
    });

    it('si falla por permisos, lo dice', () => {
      const { fixture } = crear({ cancelar: () => throwError(() => new HttpErrorResponse({ status: 403 })) });
      boton(fixture, 'Cancelar membresía de María Rojas').click();
      fixture.detectChanges();
      botonTexto(fixture, 'Sí, cancelar').click();
      fixture.detectChanges();
      expect(texto(fixture)).toContain('No tienes permiso para hacer esto');
    });
  });
});
