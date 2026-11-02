import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { ClientesService } from '../../data/clientes.service';
import { ResultadoAsignacion } from '../../data/rutinas.models';
import { RutinasService } from '../../data/rutinas.service';
import { NuevaRutinaPagina } from './nueva-rutina';

const clientes = () => [
  { idCliente: 5, nombre: 'Carlos Pérez', correo: 'carlos@apexfit.test' },
  { idCliente: 6, nombre: 'Pedro Salgado', correo: 'pedro@apexfit.test' },
];
const ejercicios = () => [
  { id: 1, nombre: 'Sentadilla', grupoMuscular: 'piernas' },
  { id: 2, nombre: 'Press banca', grupoMuscular: 'pecho' },
];

interface Fuentes {
  clientes?: () => unknown;
  ejercicios?: () => unknown;
  asignar?: () => unknown;
  cliente?: string;
}

function crear(f: Fuentes = {}) {
  const servicios = {
    asignados: vi.fn(f.clientes ?? (() => of(clientes()))),
    ejercicios: vi.fn(f.ejercicios ?? (() => of(ejercicios()))),
    asignar: vi.fn(f.asignar ?? (() => of<ResultadoAsignacion[]>([{ idCliente: 5, ok: true }]))),
  };
  TestBed.configureTestingModule({
    imports: [NuevaRutinaPagina],
    providers: [
      provideRouter([]),
      { provide: ClientesService, useValue: { asignados: servicios.asignados } },
      { provide: RutinasService, useValue: { ejercicios: servicios.ejercicios, asignar: servicios.asignar } },
      { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(f.cliente ? { cliente: f.cliente } : {}) } } },
    ],
  });
  const fixture = TestBed.createComponent(NuevaRutinaPagina);
  fixture.detectChanges();
  return { fixture, servicios };
}

type F = ComponentFixture<NuevaRutinaPagina>;
const el = (f: F) => f.nativeElement as HTMLElement;
const texto = (f: F) => el(f).textContent?.replace(/\s+/g, ' ') ?? '';
const lineas = (f: F) => Array.from(el(f).querySelectorAll('.linea'));
const botonTexto = (f: F, contiene: string) =>
  Array.from(el(f).querySelectorAll('button')).find((b) => b.textContent?.includes(contiene)) as HTMLButtonElement;
const check = (f: F, indice: number) => el(f).querySelectorAll('.clientes input[type="checkbox"]')[indice] as HTMLInputElement;

function marcar(f: F, indice: number, valor = true) {
  const c = check(f, indice);
  c.checked = valor;
  c.dispatchEvent(new Event('change'));
  f.detectChanges();
}
function escribir(f: F, control: string, valor: string, linea = -1) {
  const raiz = linea >= 0 ? lineas(f)[linea] : el(f);
  const c = raiz.querySelector(`[formcontrolname="${control}"]`) as HTMLInputElement & HTMLSelectElement;
  c.value = valor;
  c.dispatchEvent(new Event(c instanceof HTMLSelectElement ? 'change' : 'input'));
  f.detectChanges();
}
function enviar(f: F) {
  (el(f).querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
  f.detectChanges();
}
function llenarValido(f: F) {
  marcar(f, 0);
  escribir(f, 'nombre', 'Fuerza semana 6');
  escribir(f, 'dia', 'lunes', 0);
  escribir(f, 'idEjercicio', '1', 0);
  escribir(f, 'series', '4', 0);
  escribir(f, 'repeticiones', '8', 0);
  escribir(f, 'descanso', '90', 0);
}

describe('Nueva rutina (pantalla)', () => {
  describe('carga', () => {
    it('mientras carga lo indica', () => {
      expect(texto(crear({ clientes: () => new Subject() }).fixture)).toContain('Cargando clientes y ejercicios');
    });

    it('si falla, muestra el error y "Reintentar" vuelve a cargar', () => {
      let intento = 0;
      const { fixture, servicios } = crear({
        clientes: () => (++intento === 1 ? throwError(() => new HttpErrorResponse({ status: 500 })) : of(clientes())),
      });
      expect(texto(fixture)).toContain('No pudimos cargar los datos');
      botonTexto(fixture, 'Reintentar').click();
      fixture.detectChanges();
      expect(servicios.asignados).toHaveBeenCalledTimes(2);
      expect(el(fixture).querySelector('form')).not.toBeNull();
    });

    it('sin clientes asignados no hay formulario', () => {
      const { fixture } = crear({ clientes: () => of([]) });
      expect(texto(fixture)).toContain('no tienes clientes asignados');
      expect(el(fixture).querySelector('form')).toBeNull();
    });

    it('con el catálogo vacío lo explica', () => {
      const { fixture } = crear({ ejercicios: () => of([]) });
      expect(texto(fixture)).toContain('catálogo de ejercicios está vacío');
    });

    it('muestra los clientes para elegir, sin ninguno marcado', () => {
      const { fixture } = crear();
      expect(el(fixture).querySelectorAll('.clientes input').length).toBe(2);
      expect(check(fixture, 0).checked).toBe(false);
    });

    it('si se llegó desde un cliente, ya viene elegido', () => {
      const { fixture } = crear({ cliente: '6' });
      expect(check(fixture, 0).checked).toBe(false);
      expect(check(fixture, 1).checked).toBe(true);
    });
  });

  describe('ejercicios de la rutina', () => {
    it('empieza con una línea y se pueden agregar y quitar', () => {
      const { fixture } = crear();
      expect(lineas(fixture).length).toBe(1);
      expect((el(fixture).querySelector('button[aria-label="Quitar ejercicio 1"]') as HTMLButtonElement).disabled).toBe(true);

      botonTexto(fixture, '+ Agregar ejercicio').click();
      fixture.detectChanges();
      expect(lineas(fixture).length).toBe(2);

      (el(fixture).querySelector('button[aria-label="Quitar ejercicio 2"]') as HTMLButtonElement).click();
      fixture.detectChanges();
      expect(lineas(fixture).length).toBe(1);
    });

    it('ofrece los 7 días y los ejercicios del catálogo con su grupo muscular', () => {
      const { fixture } = crear();
      const dias = el(fixture).querySelectorAll('.linea select[formcontrolname="dia"] option');
      expect(dias.length).toBe(8); // "Elige…" + 7 días
      expect(texto(fixture)).toContain('Sentadilla · piernas');
    });
  });

  describe('validación', () => {
    it('no envía vacío y dice qué falta', () => {
      const { fixture, servicios } = crear();
      enviar(fixture);
      expect(servicios.asignar).not.toHaveBeenCalled();
      const t = texto(fixture);
      expect(t).toContain('Elige al menos un cliente');
      expect(t).toContain('Escribe un nombre');
      expect(t).toContain('Elige el día y el ejercicio');
    });

    it('no envía sin elegir cliente aunque lo demás esté bien', () => {
      const { fixture, servicios } = crear();
      llenarValido(fixture);
      marcar(fixture, 0, false);
      enviar(fixture);
      expect(servicios.asignar).not.toHaveBeenCalled();
      expect(texto(fixture)).toContain('Elige al menos un cliente');
    });

    it('rechaza series o repeticiones fuera de rango', () => {
      const { fixture, servicios } = crear();
      llenarValido(fixture);
      escribir(fixture, 'series', '0', 0);
      enviar(fixture);
      expect(servicios.asignar).not.toHaveBeenCalled();
      escribir(fixture, 'series', '4', 0);
      escribir(fixture, 'repeticiones', '500', 0);
      enviar(fixture);
      expect(servicios.asignar).not.toHaveBeenCalled();
    });
  });

  describe('asignar', () => {
    it('envía el plan y los clientes elegidos, y al terminar limpia el formulario', () => {
      const { fixture, servicios } = crear();
      llenarValido(fixture);

      enviar(fixture);

      expect(servicios.asignar).toHaveBeenCalledWith(
        { nombre: 'Fuerza semana 6', descripcion: null, lineas: [{ idEjercicio: 1, dia: 'lunes', series: 4, repeticiones: 8, descansoSeg: 90 }] },
        [5],
      );
      expect(texto(fixture)).toContain('Rutina asignada correctamente');
      expect(texto(fixture)).toContain('Carlos Pérez: Rutina asignada.');
      expect((el(fixture).querySelector('[formcontrolname="nombre"]') as HTMLInputElement).value).toBe('');
      expect(check(fixture, 0).checked).toBe(false);
      expect(lineas(fixture).length).toBe(1);
    });

    it('el descanso vacío se envía como null', () => {
      const { fixture, servicios } = crear();
      llenarValido(fixture);
      escribir(fixture, 'descanso', '', 0);
      enviar(fixture);
      expect((servicios.asignar.mock.calls[0] as unknown as [{ lineas: { descansoSeg: number | null }[] }])[0].lineas[0].descansoSeg).toBeNull();
    });

    it('con un fallo parcial, avisa cuál falló y deja marcado solo ese para reintentar', () => {
      const { fixture } = crear({
        asignar: () => of<ResultadoAsignacion[]>([{ idCliente: 5, ok: true }, { idCliente: 6, ok: false }]),
      });
      llenarValido(fixture);
      marcar(fixture, 1);

      enviar(fixture);

      const t = texto(fixture);
      expect(t).toContain('Carlos Pérez: Rutina asignada.');
      expect(t).toContain('Pedro Salgado: No se pudo guardar la rutina');
      expect(t).not.toContain('Rutina asignada correctamente');
      expect(check(fixture, 0).checked).toBe(false);
      expect(check(fixture, 1).checked).toBe(true);
      expect((el(fixture).querySelector('[formcontrolname="nombre"]') as HTMLInputElement).value).toBe('Fuerza semana 6');
    });

    it('muestra la advertencia si no se pudo desactivar la rutina anterior', () => {
      const { fixture } = crear({
        asignar: () => of<ResultadoAsignacion[]>([{ idCliente: 5, ok: true, advertencia: 'La rutina nueva quedó guardada, pero no se pudo desactivar la anterior.' }]),
      });
      llenarValido(fixture);
      enviar(fixture);
      expect(el(fixture).querySelector('.res.aviso')).not.toBeNull();
      expect(texto(fixture)).toContain('no se pudo desactivar la anterior');
    });

    it('si falla todo, lo dice y conserva lo escrito', () => {
      const { fixture } = crear({ asignar: () => throwError(() => new Error('SIN_SESION')) });
      llenarValido(fixture);
      enviar(fixture);
      expect(texto(fixture)).toContain('No pudimos asignar la rutina');
      expect((el(fixture).querySelector('[formcontrolname="nombre"]') as HTMLInputElement).value).toBe('Fuerza semana 6');
    });
  });
});
