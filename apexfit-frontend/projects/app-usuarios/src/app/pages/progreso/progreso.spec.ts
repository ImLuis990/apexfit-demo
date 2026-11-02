import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { hoyIso } from '../../data/formato';
import { RegistroProgreso } from '../../data/progreso.models';
import { ProgresoService } from '../../data/progreso.service';
import { Progreso } from './progreso';

const registros: RegistroProgreso[] = [
  { id: 1, fecha: '2026-09-01', peso: 77, altura: 1.76, imc: null, observaciones: null, medidas: {} },
  { id: 2, fecha: '2026-10-12', peso: 74.6, altura: 1.76, imc: 24.08, observaciones: null, medidas: { cintura: 82, biceps: 36, pecho: 101 } },
];

const guardado: RegistroProgreso = { id: 3, fecha: hoyIso(), peso: 74.2, altura: 1.76, imc: 23.96, observaciones: null, medidas: {} };

function crear(historial: () => unknown, registrar: () => unknown = () => of(guardado)) {
  const servicio = { historial: vi.fn(historial), registrar: vi.fn(registrar) };
  TestBed.configureTestingModule({
    imports: [Progreso],
    providers: [{ provide: ProgresoService, useValue: servicio }],
  });
  const fixture = TestBed.createComponent(Progreso);
  fixture.detectChanges();
  return { fixture, servicio };
}

const el = (f: ComponentFixture<Progreso>) => f.nativeElement as HTMLElement;
const texto = (f: ComponentFixture<Progreso>) => el(f).textContent ?? '';
const boton = (f: ComponentFixture<Progreso>, contiene: string) =>
  Array.from(el(f).querySelectorAll('button')).find((b) => b.textContent?.includes(contiene)) as HTMLButtonElement;

function escribir(f: ComponentFixture<Progreso>, control: string, valor: string) {
  const input = el(f).querySelector(`[formcontrolname="${control}"]`) as HTMLInputElement;
  input.value = valor;
  input.dispatchEvent(new Event('input'));
}

function enviar(f: ComponentFixture<Progreso>) {
  (el(f).querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
  f.detectChanges();
}

describe('Progreso (pantalla)', () => {
  it('mientras carga muestra el aviso', () => {
    const { fixture } = crear(() => new Subject());
    expect(texto(fixture)).toContain('Cargando tu progreso');
  });

  it('sin registros invita a registrar la primera medición', () => {
    const { fixture } = crear(() => of([]));
    expect(texto(fixture)).toContain('Aún no tienes mediciones');
  });

  it('con registros muestra peso, variación, altura, IMC y perímetros con coma decimal', () => {
    const { fixture } = crear(() => of(registros));
    const t = texto(fixture);
    expect(t).toContain('74,6');
    expect(t).toContain('Bajó 2,4 kg');
    expect(t).toContain('1,76');
    expect(t).toContain('24,1');
    expect(t).toContain('82');
    expect(t).toContain('Último registro: 12/10/2026');
    expect(el(fixture).querySelectorAll('.barras i').length).toBe(2);
    expect(el(fixture).querySelector('.barras i.actual')).not.toBeNull();
  });

  it('si falla muestra el error y "Reintentar" vuelve a cargar', () => {
    let intento = 0;
    const { fixture, servicio } = crear(() =>
      ++intento === 1 ? throwError(() => new HttpErrorResponse({ status: 500 })) : of(registros),
    );
    expect(texto(fixture)).toContain('No pudimos cargar tu progreso');

    boton(fixture, 'Reintentar').click();
    fixture.detectChanges();

    expect(servicio.historial).toHaveBeenCalledTimes(2);
    expect(texto(fixture)).toContain('74,6');
  });

  describe('formulario "Registrar medidas"', () => {
    it('se abre con la fecha de hoy y la última altura conocida', () => {
      const { fixture } = crear(() => of(registros));
      expect(el(fixture).querySelector('form')).toBeNull();

      boton(fixture, 'Registrar medidas').click();
      fixture.detectChanges();

      expect(el(fixture).querySelector('form')).not.toBeNull();
      expect((el(fixture).querySelector('[formcontrolname="fecha"]') as HTMLInputElement).value).toBe(hoyIso());
      expect((el(fixture).querySelector('[formcontrolname="altura"]') as HTMLInputElement).value).toBe('1.76');
      expect(boton(fixture, 'Cancelar')).toBeTruthy();
    });

    it('no envía si falta el peso', () => {
      const { fixture, servicio } = crear(() => of(registros));
      boton(fixture, 'Registrar medidas').click();
      fixture.detectChanges();

      enviar(fixture);

      expect(servicio.registrar).not.toHaveBeenCalled();
      expect(texto(fixture)).toContain('Escribe tu peso');
    });

    it('no acepta una fecha futura', () => {
      const { fixture, servicio } = crear(() => of(registros));
      boton(fixture, 'Registrar medidas').click();
      fixture.detectChanges();
      escribir(fixture, 'peso', '74');
      escribir(fixture, 'fecha', '2999-01-01');

      enviar(fixture);

      expect(servicio.registrar).not.toHaveBeenCalled();
      expect(texto(fixture)).toContain('que no sea futura');
    });

    it('guarda, cierra el formulario y recarga el historial sin mostrar "cargando"', () => {
      const { fixture, servicio } = crear(() => of(registros));
      boton(fixture, 'Registrar medidas').click();
      fixture.detectChanges();
      escribir(fixture, 'peso', '74.2');
      escribir(fixture, 'cintura', '81');

      enviar(fixture);

      expect(servicio.registrar).toHaveBeenCalledWith({
        fecha: hoyIso(), peso: 74.2, altura: 1.76, observaciones: '', medidas: { cintura: 81 },
      });
      expect(servicio.historial).toHaveBeenCalledTimes(2);
      expect(el(fixture).querySelector('form')).toBeNull();
      expect(texto(fixture)).not.toContain('Cargando tu progreso');
    });

    it('si el backend rechaza los datos, avisa y deja el formulario abierto', () => {
      const { fixture } = crear(
        () => of(registros),
        () => throwError(() => new HttpErrorResponse({ status: 400 })),
      );
      boton(fixture, 'Registrar medidas').click();
      fixture.detectChanges();
      escribir(fixture, 'peso', '74.2');

      enviar(fixture);

      expect(texto(fixture)).toContain('Revisa los datos e intenta de nuevo');
      expect(el(fixture).querySelector('form')).not.toBeNull();
      expect(boton(fixture, 'Guardar medición').disabled).toBe(false);
    });

    it('si no hay conexión al guardar lo dice con claridad', () => {
      const { fixture } = crear(
        () => of(registros),
        () => throwError(() => new HttpErrorResponse({ status: 0 })),
      );
      boton(fixture, 'Registrar medidas').click();
      fixture.detectChanges();
      escribir(fixture, 'peso', '74.2');

      enviar(fixture);

      expect(texto(fixture)).toContain('No se pudo conectar con el servidor');
    });
  });
});
