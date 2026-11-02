import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { RutinaActiva, diaDeHoy } from '../../data/rutinas.models';
import { RutinasService } from '../../data/rutinas.service';
import { Rutina } from './rutina';

const rutinaDe = (dias: RutinaActiva['dias']): RutinaActiva => ({
  id: 3, nombre: 'Fuerza · semana 5', descripcion: 'Plan de fuerza', dias,
});

const dia = (d: 'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes' | 'sabado' | 'domingo') => ({
  dia: d, etiqueta: d, abreviatura: d.slice(0, 3).toUpperCase(), grupos: ['Piernas'],
  ejercicios: [
    { id: 1, idEjercicio: 4, nombre: 'Sentadilla', grupoMuscular: 'piernas', series: 4, repeticiones: 10, descansoSeg: 60 },
    { id: 2, idEjercicio: 5, nombre: 'Peso muerto', grupoMuscular: 'piernas', series: 3, repeticiones: 8, descansoSeg: null },
  ],
});

function crear(rutinaActiva: () => unknown): ComponentFixture<Rutina> {
  TestBed.configureTestingModule({
    imports: [Rutina],
    providers: [{ provide: RutinasService, useValue: { rutinaActiva } }],
  });
  const fixture = TestBed.createComponent(Rutina);
  fixture.detectChanges();
  return fixture;
}

const texto = (f: ComponentFixture<Rutina>) => (f.nativeElement as HTMLElement).textContent ?? '';

describe('Rutina (pantalla)', () => {
  it('mientras carga muestra el aviso de carga', () => {
    const f = crear(() => new Subject());
    expect(texto(f)).toContain('Cargando tu rutina');
    expect((f.nativeElement as HTMLElement).querySelector('[role="status"]')).not.toBeNull();
  });

  it('sin rutina muestra el mensaje de que no tiene una asignada', () => {
    const f = crear(() => of(null));
    expect(texto(f)).toContain('Todavía no tienes una rutina asignada');
  });

  it('con rutina muestra su nombre, los días y los ejercicios con series × repeticiones', () => {
    const f = crear(() => of(rutinaDe([dia('lunes'), dia('jueves')])));
    const el = f.nativeElement as HTMLElement;

    expect(texto(f)).toContain('Fuerza · semana 5');
    expect(el.querySelectorAll('details.dia').length).toBe(2);
    expect(texto(f)).toContain('Sentadilla');
    expect(texto(f)).toContain('4 × 10');
    expect(texto(f)).toContain('descanso 60 s');
    expect(texto(f)).toContain('2 ejercicios');
  });

  it('marca "Hoy" y abre solo el día de hoy', () => {
    const hoy = diaDeHoy();
    const otro = hoy === 'lunes' ? 'martes' : 'lunes';
    const f = crear(() => of(rutinaDe([dia(hoy), dia(otro)])));
    const detalles = Array.from((f.nativeElement as HTMLElement).querySelectorAll('details.dia')) as HTMLDetailsElement[];

    expect(detalles[0].open).toBe(true);
    expect(detalles[1].open).toBe(false);
    expect(detalles[0].textContent).toContain('Hoy');
    expect(detalles[1].textContent).not.toContain('Hoy');
  });

  it('una rutina sin ejercicios lo avisa', () => {
    const f = crear(() => of(rutinaDe([])));
    expect(texto(f)).toContain('todavía no tiene ejercicios');
  });

  it('si falla muestra el error y "Reintentar" vuelve a cargar', () => {
    let intento = 0;
    const f = crear(() =>
      ++intento === 1
        ? throwError(() => new HttpErrorResponse({ status: 500 }))
        : of(rutinaDe([dia('lunes')])),
    );
    const el = f.nativeElement as HTMLElement;

    expect(texto(f)).toContain('No pudimos cargar tu rutina');
    (el.querySelector('.reintentar') as HTMLButtonElement).click();
    f.detectChanges();

    expect(intento).toBe(2);
    expect(texto(f)).toContain('Sentadilla');
    expect(texto(f)).not.toContain('No pudimos cargar');
  });

  it('si no hay conexión lo dice con claridad', () => {
    const f = crear(() => throwError(() => new HttpErrorResponse({ status: 0 })));
    expect(texto(f)).toContain('No se pudo conectar con el servidor');
  });
});
