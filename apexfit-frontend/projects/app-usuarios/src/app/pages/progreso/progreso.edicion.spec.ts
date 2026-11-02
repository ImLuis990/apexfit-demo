import { HttpErrorResponse } from '@angular/common/http';
import { HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { fechaCompleta } from '../../data/formato';
import { RegistroProgreso } from '../../data/progreso.models';
import { ProgresoService } from '../../data/progreso.service';
import { guardarSesion, proveedoresBase } from '../../testing';
import { Progreso } from './progreso';

const registros: RegistroProgreso[] = [
  { id: 1, fecha: '2026-09-01', peso: 77, altura: 1.76, imc: null, observaciones: null, medidas: {} },
  { id: 2, fecha: '2026-10-12', peso: 74.6, altura: 1.76, imc: 24.08, observaciones: 'Ayuno', medidas: { cintura: 82 } },
];

function crear(actualizar: () => unknown) {
  const servicio = { historial: vi.fn(() => of(registros)), registrar: vi.fn(), actualizar: vi.fn(actualizar) };
  TestBed.configureTestingModule({ imports: [Progreso], providers: [{ provide: ProgresoService, useValue: servicio }] });
  const fixture = TestBed.createComponent(Progreso);
  fixture.detectChanges();
  return { fixture, servicio };
}
const el = (f: ComponentFixture<Progreso>) => f.nativeElement as HTMLElement;
const campo = (f: ComponentFixture<Progreso>, nombre: string) => el(f).querySelector(`[formcontrolname="${nombre}"]`) as HTMLInputElement | null;

function editarDel12(f: ComponentFixture<Progreso>) {
  (el(f).querySelector(`button[aria-label="Editar registro del ${fechaCompleta('2026-10-12')}"]`) as HTMLButtonElement).click();
  f.detectChanges();
}
function enviar(f: ComponentFixture<Progreso>) {
  (el(f).querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
  f.detectChanges();
}

describe('Progreso: editar un registro propio', () => {
  it('"Editar" abre el formulario con los datos del registro, sin fecha editable ni perímetros', () => {
    const { fixture } = crear(() => of(registros[1]));
    editarDel12(fixture);
    expect(el(fixture).textContent).toContain('Editar medición del');
    expect(campo(fixture, 'peso')?.value).toBe('74.6');
    expect(campo(fixture, 'observaciones')?.value).toBe('Ayuno');
    expect(campo(fixture, 'fecha')?.disabled).toBe(true);
    expect(campo(fixture, 'cintura')).toBeNull();
  });

  it('al guardar llama a actualizar con el registro y los cambios, y recarga la lista', () => {
    const { fixture, servicio } = crear(() => of(registros[1]));
    editarDel12(fixture);
    const peso = campo(fixture, 'peso') as HTMLInputElement;
    peso.value = '73.8';
    peso.dispatchEvent(new Event('input'));
    enviar(fixture);
    expect(servicio.actualizar).toHaveBeenCalledWith(registros[1], { peso: 73.8, altura: 1.76, observaciones: 'Ayuno' });
    expect(servicio.historial).toHaveBeenCalledTimes(2);
    expect(el(fixture).querySelector('form')).toBeNull();
  });

  it('si el servidor falla, muestra el error y deja el formulario abierto', () => {
    const { fixture } = crear(() => throwError(() => new HttpErrorResponse({ status: 0 })));
    editarDel12(fixture);
    enviar(fixture);
    expect(el(fixture).textContent).toContain('No se pudo conectar');
    expect(el(fixture).querySelector('form')).not.toBeNull();
  });

  it('el servicio envía PUT /progresos/{id} con la fecha original, el IMC recalculado y sin medidas', () => {
    localStorage.clear();
    guardarSesion('cliente'); // id = 1
    TestBed.configureTestingModule({ providers: [provideRouter([]), ...proveedoresBase] });
    const http = TestBed.inject(HttpTestingController);
    TestBed.inject(ProgresoService).actualizar(registros[1], { peso: 70, altura: 1.75, observaciones: ' ' }).subscribe();
    const req = http.expectOne('/api/v1/progresos/2');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ idProgreso: 2, idUsuario: 1, fecha: '2026-10-12', peso: 70, altura: 1.75, imc: 22.86, observaciones: null, medidas: null });
    req.flush({});
  });
});
