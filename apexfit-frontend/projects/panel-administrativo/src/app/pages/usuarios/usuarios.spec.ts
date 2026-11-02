import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Rol } from 'shared';
import { Subject, of, throwError } from 'rxjs';
import { aUsuario } from '../../data/usuarios.mapper';
import { ID_ROL, Usuario } from '../../data/usuarios.models';
import { UsuariosService } from '../../data/usuarios.service';
import { guardarSesion, proveedoresPanel } from '../../testing';
import { Usuarios } from './usuarios';

const MI_ID = 99;

const ascii = (t: string) => t.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

const usuario = (id: number, nombre: string, apellido: string, rol: Rol, estado = 'activo', extra: Partial<Usuario> = {}): Usuario => ({
  ...aUsuario({
    idUsuario: id, nombre, apellido, correo: `${ascii(nombre)}.${ascii(apellido)}@apexfit.test`,
    idRol: ID_ROL[rol], telefono: null, fechaNacimiento: null, estado,
  }),
  ...extra,
});

const lista = () => [
  usuario(MI_ID, 'Ana', 'Admin', 'administrador'),
  usuario(1, 'Carlos', 'Pérez', 'cliente'),
  usuario(2, 'María', 'Rojas', 'cliente'),
  usuario(3, 'Mario', 'Díaz', 'entrenador'),
  usuario(4, 'Pedro', 'Salgado', 'cliente', 'inactivo'),
];

interface Fuentes {
  listar?: () => unknown;
  crear?: () => unknown;
  actualizar?: () => unknown;
  desactivar?: () => unknown;
  activar?: () => unknown;
}

function crear(f: Fuentes = {}) {
  localStorage.clear();
  guardarSesion('administrador', 'ana.admin@apexfit.test', MI_ID);
  const servicio = {
    listar: vi.fn(f.listar ?? (() => of({ usuarios: lista(), total: 5 }))),
    crear: vi.fn(f.crear ?? (() => of(usuario(10, 'Nuevo', 'Usuario', 'cliente')))),
    actualizar: vi.fn(f.actualizar ?? (() => of(usuario(1, 'Carlos', 'Pérez', 'cliente')))),
    desactivar: vi.fn(f.desactivar ?? (() => of(undefined))),
    activar: vi.fn(f.activar ?? (() => of(usuario(4, 'Pedro', 'Salgado', 'cliente')))),
  };
  TestBed.configureTestingModule({
    imports: [Usuarios],
    providers: [provideRouter([]), ...proveedoresPanel(), { provide: UsuariosService, useValue: servicio }],
  });
  const fixture = TestBed.createComponent(Usuarios);
  fixture.detectChanges();
  return { fixture, servicio };
}

type F = ComponentFixture<Usuarios>;
const servicioDe = (_f: F) => TestBed.inject(UsuariosService) as unknown as { actualizar: ReturnType<typeof vi.fn> };
const el = (f: F) => f.nativeElement as HTMLElement;
const texto = (f: F) => el(f).textContent?.replace(/\s+/g, ' ') ?? '';
const filas = (f: F) => Array.from(el(f).querySelectorAll('tbody tr'));
const boton = (f: F, etiqueta: string) => el(f).querySelector(`button[aria-label="${etiqueta}"]`) as HTMLButtonElement;
const botonTexto = (f: F, contiene: string) =>
  Array.from(el(f).querySelectorAll('button')).find((b) => b.textContent?.includes(contiene)) as HTMLButtonElement;

function escribir(f: F, control: string, valor: string) {
  const input = el(f).querySelector(`[formcontrolname="${control}"]`) as HTMLInputElement | HTMLSelectElement;
  input.value = valor;
  input.dispatchEvent(new Event(input instanceof HTMLSelectElement ? 'change' : 'input'));
}

function enviar(f: F) {
  (el(f).querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
  f.detectChanges();
}

function abrirCrear(f: F) {
  botonTexto(f, '+ Nuevo usuario').click();
  f.detectChanges();
}

function llenarValido(f: F) {
  escribir(f, 'nombre', 'Laura');
  escribir(f, 'apellido', 'Gómez');
  escribir(f, 'correo', 'laura@apexfit.test');
}

describe('Usuarios (pantalla)', () => {
  describe('listado', () => {
    it('mientras carga lo indica', () => {
      expect(texto(crear({ listar: () => new Subject() }).fixture)).toContain('Cargando usuarios');
    });

    it('muestra una fila por usuario con su rol y su estado', () => {
      const { fixture } = crear();
      expect(filas(fixture).length).toBe(5);
      const t = texto(fixture);
      expect(t).toContain('Carlos Pérez');
      expect(t).toContain('Entrenador');
      expect(t).toContain('Mostrando 5 de 5 usuarios');
      expect(el(fixture).querySelectorAll('.af-tag--danger').length).toBe(1); // solo Pedro está inactivo
    });

    it('sin usuarios lo dice', () => {
      expect(texto(crear({ listar: () => of({ usuarios: [], total: 0 }) }).fixture)).toContain('Todavía no hay usuarios');
    });

    it('si falla, muestra el error y "Reintentar" vuelve a cargar', () => {
      let intento = 0;
      const { fixture, servicio } = crear({
        listar: () => (++intento === 1 ? throwError(() => new HttpErrorResponse({ status: 500 })) : of({ usuarios: lista(), total: 5 })),
      });
      expect(texto(fixture)).toContain('No pudimos cargar los usuarios');
      botonTexto(fixture, 'Reintentar').click();
      fixture.detectChanges();
      expect(servicio.listar).toHaveBeenCalledTimes(2);
      expect(filas(fixture).length).toBe(5);
    });

    it('avisa si hay más usuarios de los que se cargaron', () => {
      const { fixture } = crear({ listar: () => of({ usuarios: lista(), total: 500 }) });
      expect(texto(fixture)).toContain('Hay 500 usuarios en total');
    });
  });

  describe('filtros', () => {
    const buscar = (f: F, valor: string) => {
      const input = el(f).querySelector('.filtros input[type="search"]') as HTMLInputElement;
      input.value = valor;
      input.dispatchEvent(new Event('input'));
      f.detectChanges();
    };
    const elegir = (f: F, indice: number, valor: string) => {
      const select = el(f).querySelectorAll('.filtros select')[indice] as HTMLSelectElement;
      select.value = valor;
      select.dispatchEvent(new Event('change'));
      f.detectChanges();
    };

    it('busca por nombre sin importar tildes ni mayúsculas', () => {
      const { fixture } = crear();
      buscar(fixture, 'MARÍA');
      expect(filas(fixture).length).toBe(1);
      expect(texto(fixture)).toContain('María Rojas');
      expect(texto(fixture)).toContain('Mostrando 1 de 5 usuarios');
    });

    it('una parte del nombre coincide con varios usuarios', () => {
      const { fixture } = crear();
      buscar(fixture, 'mari'); // María y Mario
      expect(filas(fixture).length).toBe(2);
    });

    it('busca por correo', () => {
      const { fixture } = crear();
      buscar(fixture, 'pedro.salgado@');
      expect(filas(fixture).length).toBe(1);
    });

    it('filtra por rol', () => {
      const { fixture } = crear();
      elegir(fixture, 0, 'entrenador');
      expect(filas(fixture).length).toBe(1);
      expect(texto(fixture)).toContain('Mario Díaz');
    });

    it('filtra por estado', () => {
      const { fixture } = crear();
      elegir(fixture, 1, 'inactivo');
      expect(filas(fixture).length).toBe(1);
      expect(texto(fixture)).toContain('Pedro Salgado');
    });

    it('combina los filtros y, si nada coincide, lo dice', () => {
      const { fixture } = crear();
      elegir(fixture, 0, 'entrenador');
      buscar(fixture, 'zzz');
      expect(filas(fixture).length).toBe(0);
      expect(texto(fixture)).toContain('Ningún usuario coincide');
    });
  });

  describe('crear usuario', () => {
    it('abre el formulario con el rol cliente por defecto', () => {
      const { fixture } = crear();
      abrirCrear(fixture);
      expect(el(fixture).querySelector('form')).not.toBeNull();
      expect(texto(fixture)).toContain('Nuevo usuario');
      expect((el(fixture).querySelector('[formcontrolname="rol"]') as HTMLSelectElement).value).toBe('cliente');
    });

    it('no envía si faltan datos y muestra qué falta', () => {
      const { fixture, servicio } = crear();
      abrirCrear(fixture);
      enviar(fixture);
      expect(servicio.crear).not.toHaveBeenCalled();
      expect(texto(fixture)).toContain('El nombre es obligatorio');
      expect(texto(fixture)).toContain('El apellido es obligatorio');
      expect(texto(fixture)).toContain('Escribe un correo válido');
    });

    it('no acepta un teléfono con letras o muy corto', () => {
      const { fixture, servicio } = crear();
      abrirCrear(fixture);
      llenarValido(fixture);
      escribir(fixture, 'telefono', '12ab');
      enviar(fixture);
      expect(servicio.crear).not.toHaveBeenCalled();
      expect(texto(fixture)).toContain('entre 7 y 15 dígitos');
    });

    it('crea el usuario, cierra el formulario, avisa la contraseña inicial y recarga la lista', () => {
      const { fixture, servicio } = crear({ crear: () => of(usuario(10, 'Laura', 'Gómez', 'cliente')) });
      abrirCrear(fixture);
      llenarValido(fixture);
      escribir(fixture, 'telefono', '3001234567');

      enviar(fixture);

      expect(servicio.crear).toHaveBeenCalledWith({
        nombre: 'Laura', apellido: 'Gómez', correo: 'laura@apexfit.test', telefono: '3001234567', rol: 'cliente',
      });
      expect(el(fixture).querySelector('form')).toBeNull();
      expect(texto(fixture)).toContain('Usuario Laura Gómez creado');
      expect(texto(fixture)).toContain('contraseña inicial es 123456');
      expect(servicio.listar).toHaveBeenCalledTimes(2);
    });

    it('permite crear un entrenador y deja el teléfono vacío como null', () => {
      const { fixture, servicio } = crear();
      abrirCrear(fixture);
      llenarValido(fixture);
      escribir(fixture, 'rol', 'entrenador');
      enviar(fixture);
      expect(servicio.crear).toHaveBeenCalledWith(expect.objectContaining({ rol: 'entrenador', telefono: null }));
    });

    it('si el correo ya existe, lo explica y deja el formulario abierto', () => {
      const { fixture } = crear({
        crear: () => throwError(() => new HttpErrorResponse({ status: 400, error: { message: 'El correo ya está en uso' } })),
      });
      abrirCrear(fixture);
      llenarValido(fixture);
      enviar(fixture);
      expect(texto(fixture)).toContain('Ese correo ya está registrado');
      expect(el(fixture).querySelector('form')).not.toBeNull();
    });

    it('"Cancelar" cierra el formulario sin guardar', () => {
      const { fixture, servicio } = crear();
      abrirCrear(fixture);
      botonTexto(fixture, 'Cancelar').click();
      fixture.detectChanges();
      expect(el(fixture).querySelector('form')).toBeNull();
      expect(servicio.crear).not.toHaveBeenCalled();
    });
  });

  describe('editar usuario', () => {
    it('abre el formulario con los datos del usuario', () => {
      const { fixture } = crear();
      boton(fixture, 'Editar a Carlos Pérez').click();
      fixture.detectChanges();
      expect(texto(fixture)).toContain('Editar usuario');
      expect((el(fixture).querySelector('[formcontrolname="nombre"]') as HTMLInputElement).value).toBe('Carlos');
      expect((el(fixture).querySelector('[formcontrolname="correo"]') as HTMLInputElement).value).toBe('carlos.perez@apexfit.test');
    });

    it('guarda los cambios pasando el usuario original (para conservar sus otros datos)', () => {
      const { fixture, servicio } = crear();
      boton(fixture, 'Editar a Carlos Pérez').click();
      fixture.detectChanges();
      escribir(fixture, 'nombre', 'Carlitos');

      enviar(fixture);

      const [original, datos] = servicio.actualizar.mock.calls[0] as unknown as [Usuario, Record<string, unknown>];
      expect(original.id).toBe(1);
      expect(datos).toMatchObject({ nombre: 'Carlitos', apellido: 'Pérez', rol: 'cliente' });
      expect(texto(fixture)).toContain('Cambios guardados');
      expect(servicio.listar).toHaveBeenCalledTimes(2);
    });

    it('un administrador no puede cambiarse su propio rol', () => {
      const { fixture } = crear();
      boton(fixture, 'Editar a Ana Admin').click();
      fixture.detectChanges();
      expect((el(fixture).querySelector('[formcontrolname="rol"]') as HTMLSelectElement).disabled).toBe(true);
      expect(texto(fixture)).toContain('No puedes cambiar tu propio rol');
      escribir(fixture, 'nombre', 'Ana María');
      enviar(fixture);
      // el rol deshabilitado igual se envía con su valor actual: no se pierde
      const [, datos] = vi.mocked(servicioDe(fixture).actualizar).mock.calls[0] as unknown as [Usuario, { rol: string }];
      expect(datos.rol).toBe('administrador');
    });
  });

  describe('desactivar y activar', () => {
    it('pide confirmación antes de desactivar y se puede cancelar', () => {
      const { fixture, servicio } = crear();
      boton(fixture, 'Desactivar a Carlos Pérez').click();
      fixture.detectChanges();
      expect(texto(fixture)).toContain('¿Desactivar a Carlos?');

      botonTexto(fixture, 'Cancelar').click();
      fixture.detectChanges();

      expect(texto(fixture)).not.toContain('¿Desactivar a Carlos?');
      expect(servicio.desactivar).not.toHaveBeenCalled();
    });

    it('al confirmar, desactiva, avisa y recarga la lista', () => {
      const { fixture, servicio } = crear();
      boton(fixture, 'Desactivar a Carlos Pérez').click();
      fixture.detectChanges();

      botonTexto(fixture, 'Sí, desactivar').click();
      fixture.detectChanges();

      expect(servicio.desactivar).toHaveBeenCalledWith(1);
      expect(texto(fixture)).toContain('Carlos Pérez quedó desactivado');
      expect(servicio.listar).toHaveBeenCalledTimes(2);
    });

    it('no ofrece desactivarse a uno mismo', () => {
      const { fixture } = crear();
      expect(boton(fixture, 'Desactivar a Ana Admin')).toBeNull();
      expect(boton(fixture, 'Editar a Ana Admin')).not.toBeNull();
    });

    it('un usuario inactivo se puede activar de nuevo', () => {
      const { fixture, servicio } = crear();
      expect(boton(fixture, 'Desactivar a Pedro Salgado')).toBeNull();

      boton(fixture, 'Activar a Pedro Salgado').click();
      fixture.detectChanges();

      expect(servicio.activar).toHaveBeenCalledTimes(1);
      expect((servicio.activar.mock.calls[0] as unknown as [Usuario])[0].id).toBe(4);
      expect(texto(fixture)).toContain('Pedro Salgado quedó activo de nuevo');
    });

    it('si falla por permisos lo dice', () => {
      const { fixture } = crear({ desactivar: () => throwError(() => new HttpErrorResponse({ status: 403 })) });
      boton(fixture, 'Desactivar a Carlos Pérez').click();
      fixture.detectChanges();
      botonTexto(fixture, 'Sí, desactivar').click();
      fixture.detectChanges();
      expect(texto(fixture)).toContain('No tienes permiso para hacer esto');
    });
  });

});
