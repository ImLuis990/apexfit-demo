import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { EstadoMembresia } from '../../data/membresias.mapper';
import { MembresiasService } from '../../data/membresias.service';
import { Perfil } from '../../data/perfil';
import { PerfilService } from '../../data/perfil.service';
import { DiaSemana, RutinaActiva, diaDeHoy } from '../../data/rutinas.models';
import { RutinasService } from '../../data/rutinas.service';
import { guardarSesion, proveedoresBase } from '../../testing';
import { Hoy } from './hoy';

const perfilOk: Perfil = { id: 1, nombre: 'Carlos Andrés', apellido: 'Pérez', correo: 'carlos@apexfit.test' };
const activa: EstadoMembresia = { tipo: 'activa', plan: 'Mensual', vence: '2026-11-02', diasRestantes: 20, porVencer: false };

const rutinaCon = (...dias: DiaSemana[]): RutinaActiva => ({
  id: 3, nombre: 'Fuerza semana 1', descripcion: null,
  dias: dias.map((d) => ({
    dia: d, etiqueta: d.charAt(0).toUpperCase() + d.slice(1), abreviatura: 'X', grupos: ['Piernas', 'Core'],
    ejercicios: [
      { id: 1, idEjercicio: 4, nombre: 'Sentadilla', grupoMuscular: 'piernas', series: 4, repeticiones: 10, descansoSeg: 60 },
      { id: 2, idEjercicio: 5, nombre: 'Abdominales', grupoMuscular: 'core', series: 3, repeticiones: 15, descansoSeg: null },
    ],
  })),
});

interface Fuentes {
  perfil?: () => unknown;
  rutina?: () => unknown;
  membresia?: () => unknown;
}

function crear(f: Fuentes = {}) {
  localStorage.clear();
  guardarSesion('cliente', 'carlos@apexfit.test');
  const servicios = {
    perfil: vi.fn(f.perfil ?? (() => of(perfilOk))),
    rutina: vi.fn(f.rutina ?? (() => of(null))),
    membresia: vi.fn(f.membresia ?? (() => of(activa))),
  };
  TestBed.configureTestingModule({
    imports: [Hoy],
    providers: [
      provideRouter([]),
      ...proveedoresBase,
      { provide: PerfilService, useValue: { perfil: servicios.perfil } },
      { provide: RutinasService, useValue: { rutinaActiva: servicios.rutina } },
      { provide: MembresiasService, useValue: { estado: servicios.membresia } },
    ],
  });
  const fixture = TestBed.createComponent(Hoy);
  fixture.detectChanges();
  return { fixture, servicios };
}

const el = (f: ComponentFixture<Hoy>) => f.nativeElement as HTMLElement;
const texto = (f: ComponentFixture<Hoy>) => el(f).textContent?.replace(/\s+/g, ' ') ?? '';
const boton = (f: ComponentFixture<Hoy>, contiene: string, indice = 0) =>
  Array.from(el(f).querySelectorAll('button')).filter((b) => b.textContent?.includes(contiene))[indice] as HTMLButtonElement;

describe('Hoy (pantalla)', () => {
  describe('saludo', () => {
    it('usa el primer nombre y las iniciales del perfil', () => {
      const { fixture } = crear();
      expect(el(fixture).querySelector('h1')?.textContent).toContain('Hola, Carlos');
      expect(el(fixture).querySelector('.av')?.textContent?.trim()).toBe('CP');
    });

    it('si el perfil falla, saluda con el correo y el resto de la pantalla sigue funcionando', () => {
      const { fixture } = crear({ perfil: () => throwError(() => new HttpErrorResponse({ status: 500 })) });
      expect(el(fixture).querySelector('h1')?.textContent?.trim()).toBe('Hola');
      expect(texto(fixture)).toContain('carlos@apexfit.test');
      expect(el(fixture).querySelector('.av')?.textContent?.trim()).toBe('CA');
      expect(texto(fixture)).toContain('Activa'); // la membresía sí cargó
    });
  });

  describe('entrenamiento de hoy', () => {
    it('mientras carga lo indica', () => {
      const { fixture } = crear({ rutina: () => new Subject() });
      expect(texto(fixture)).toContain('Cargando…');
    });

    it('si hoy le toca entrenar, muestra los grupos, el resumen y los ejercicios', () => {
      const { fixture } = crear({ rutina: () => of(rutinaCon(diaDeHoy())) });
      const t = texto(fixture);
      expect(t).toContain('Entrenamiento de hoy');
      expect(t).toContain('Piernas · Core');
      expect(t).toContain('2 ejercicios · Fuerza semana 1');
      expect(el(fixture).querySelectorAll('.ejercicios li').length).toBe(2);
      expect(t).toContain('Sentadilla');
      expect(t).toContain('4 × 10 · descanso 60 s');
      expect(t).toContain('3 × 15'); // sin descanso: no inventa uno
      expect(t).not.toContain('descanso 0');
    });

    it('si hoy no hay ejercicios, es día de descanso y dice cuál es el próximo', () => {
      const hoy = diaDeHoy();
      const otro: DiaSemana = hoy === 'martes' ? 'jueves' : 'martes';
      const { fixture } = crear({ rutina: () => of(rutinaCon(otro)) });
      expect(texto(fixture)).toContain('Día de descanso');
      expect(texto(fixture)).toContain('Próximo entrenamiento:');
      expect(el(fixture).querySelector('.ejercicios')).toBeNull();
    });

    it('sin rutina lo dice', () => {
      const { fixture } = crear({ rutina: () => of(null) });
      expect(texto(fixture)).toContain('Sin rutina por ahora');
    });

    it('si falla, muestra el error y "Reintentar" solo vuelve a pedir la rutina', () => {
      let intento = 0;
      const { fixture, servicios } = crear({
        rutina: () => (++intento === 1 ? throwError(() => new HttpErrorResponse({ status: 500 })) : of(rutinaCon(diaDeHoy()))),
      });
      expect(texto(fixture)).toContain('No pudimos cargar tu rutina');
      expect(texto(fixture)).toContain('Activa'); // la membresía no depende de la rutina

      boton(fixture, 'Reintentar').click();
      fixture.detectChanges();

      expect(servicios.rutina).toHaveBeenCalledTimes(2);
      expect(servicios.membresia).toHaveBeenCalledTimes(1);
      expect(servicios.perfil).toHaveBeenCalledTimes(1);
      expect(texto(fixture)).toContain('Sentadilla');
    });
  });

  describe('membresía', () => {
    const conMembresia = (e: EstadoMembresia) => crear({ membresia: () => of(e) });

    it('activa: muestra la etiqueta y cuánto falta', () => {
      const { fixture } = conMembresia(activa);
      expect(texto(fixture)).toContain('Activa');
      expect(texto(fixture)).toContain('Mensual · vence el 02/11/2026 (quedan 20 días)');
    });

    it('por vencer: etiqueta de advertencia', () => {
      const { fixture } = conMembresia({ ...activa, porVencer: true, diasRestantes: 3 });
      expect(texto(fixture)).toContain('Por vencer');
      expect(el(fixture).querySelector('.af-tag--warn')).not.toBeNull();
    });

    it('vencida: etiqueta roja', () => {
      const { fixture } = conMembresia({ tipo: 'vencida', plan: 'Mensual', vencio: '2026-10-01' });
      expect(texto(fixture)).toContain('Vencida');
      expect(el(fixture).querySelector('.af-tag--danger')).not.toBeNull();
    });

    it('sin membresía: lo dice y manda a recepción', () => {
      const { fixture } = conMembresia({ tipo: 'sin-membresia' });
      expect(texto(fixture)).toContain('Sin membresía');
      expect(texto(fixture)).toContain('Consulta en recepción');
    });

    it('si falla, muestra el error y "Reintentar" solo vuelve a pedir la membresía', () => {
      let intento = 0;
      const { fixture, servicios } = crear({
        membresia: () => (++intento === 1 ? throwError(() => new HttpErrorResponse({ status: 0 })) : of(activa)),
      });
      expect(texto(fixture)).toContain('No se pudo conectar con el servidor');

      boton(fixture, 'Reintentar').click();
      fixture.detectChanges();

      expect(servicios.membresia).toHaveBeenCalledTimes(2);
      expect(servicios.rutina).toHaveBeenCalledTimes(1);
      expect(texto(fixture)).toContain('Mensual');
    });
  });

  it('el avatar es un enlace a "Mi cuenta"', () => {
    const { fixture } = crear();
    const avatar = el(fixture).querySelector('a.av') as HTMLAnchorElement;
    expect(avatar.getAttribute('href')).toBe('/cuenta');
    expect(avatar.getAttribute('aria-label')).toBe('Mi cuenta');
  });

  it('"Cerrar sesión" borra la sesión y vuelve al login', () => {
    const { fixture } = crear();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    boton(fixture, 'Cerrar sesión').click();

    expect(localStorage.getItem('apexfit.session')).toBeNull();
    expect(navigate).toHaveBeenCalledWith(['/login']);
  });
});
