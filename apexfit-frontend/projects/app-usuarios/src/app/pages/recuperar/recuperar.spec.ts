import { HttpErrorResponse } from '@angular/common/http';
import { HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { RecuperacionService } from '../../data/recuperacion.service';
import { proveedoresBase } from '../../testing';
import { Recuperar } from './recuperar';

const solicitud = { token: 'TOKEN123', correo: 'ana@apexfit.test', minutos: 15 };

function crear(solicitar: () => unknown, restablecer: () => unknown = () => of(undefined)) {
  const servicio = { solicitar: vi.fn(solicitar), restablecer: vi.fn(restablecer) };
  TestBed.configureTestingModule({ imports: [Recuperar], providers: [provideRouter([]), { provide: RecuperacionService, useValue: servicio }] });
  const fixture = TestBed.createComponent(Recuperar);
  fixture.detectChanges();
  return { fixture, servicio };
}
const el = (f: ComponentFixture<Recuperar>) => f.nativeElement as HTMLElement;
const texto = (f: ComponentFixture<Recuperar>) => el(f).textContent?.replace(/\s+/g, ' ') ?? '';

function escribir(f: ComponentFixture<Recuperar>, nombre: string, valor: string) {
  const campo = el(f).querySelector(`[formcontrolname="${nombre}"]`) as HTMLInputElement;
  campo.value = valor;
  campo.dispatchEvent(new Event('input'));
}
function enviar(f: ComponentFixture<Recuperar>) {
  (el(f).querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
  f.detectChanges();
}
const error = (status: number, cuerpo: object) => () => throwError(() => new HttpErrorResponse({ status, error: cuerpo }));

describe('Recuperar contraseña', () => {
  it('pide el correo, luego la nueva contraseña, y confirma que ya puede iniciar sesión', () => {
    const { fixture, servicio } = crear(() => of(solicitud));
    escribir(fixture, 'correo', ' ana@apexfit.test ');
    enviar(fixture);
    expect(servicio.solicitar).toHaveBeenCalledWith('ana@apexfit.test');
    expect(texto(fixture)).toContain('Nueva contraseña');
    expect(texto(fixture)).toContain('Tienes 15 minutos');

    escribir(fixture, 'contrasena', 'nueva123');
    escribir(fixture, 'confirmar', 'nueva123');
    enviar(fixture);
    expect(servicio.restablecer).toHaveBeenCalledWith('TOKEN123', 'nueva123');
    expect(texto(fixture)).toContain('Contraseña actualizada');
  });

  it('explica cada error al pedir el token: correo inexistente, cuenta inactiva y sin conexión', () => {
    const casos: [number, object, string][] = [
      [404, { mensaje: 'No existe ningún usuario' }, 'No existe ninguna cuenta con ese correo.'],
      [403, { mensaje: 'La cuenta se encuentra inactiva' }, 'Tu cuenta está inactiva'],
      [0, {}, 'No se pudo conectar'],
    ];
    for (const [status, cuerpo, esperado] of casos) {
      TestBed.resetTestingModule();
      const { fixture } = crear(error(status, cuerpo));
      escribir(fixture, 'correo', 'ana@apexfit.test');
      enviar(fixture);
      expect(texto(fixture)).toContain(esperado);
      expect(texto(fixture)).toContain('Continuar'); // sigue en el primer paso
    }
  });

  it('si el token venció, avisa y vuelve al primer paso; si la contraseña no coincide, no envía', () => {
    const { fixture, servicio } = crear(() => of(solicitud), error(400, { mensaje: 'El token de recuperación es inválido o ha expirado.' }));
    escribir(fixture, 'correo', 'ana@apexfit.test');
    enviar(fixture);

    escribir(fixture, 'contrasena', 'nueva123');
    escribir(fixture, 'confirmar', 'otra1234');
    enviar(fixture);
    expect(servicio.restablecer).not.toHaveBeenCalled();
    expect(texto(fixture)).toContain('Las contraseñas no coinciden.');

    escribir(fixture, 'confirmar', 'nueva123');
    enviar(fixture);
    expect(texto(fixture)).toContain('Pasaron los 15 minutos');
    expect(texto(fixture)).toContain('Continuar');
  });

  it('el servicio usa POST /auth/solicitar-recuperacion y POST /auth/resetear-password con los campos del backend', () => {
    TestBed.configureTestingModule({ providers: [provideRouter([]), ...proveedoresBase] });
    const http = TestBed.inject(HttpTestingController);
    const servicio = TestBed.inject(RecuperacionService);

    let recibida: unknown;
    servicio.solicitar('ana@apexfit.test').subscribe((s) => (recibida = s));
    const pedir = http.expectOne('/api/v1/auth/solicitar-recuperacion');
    expect(pedir.request.method).toBe('POST');
    expect(pedir.request.body).toEqual({ correo: 'ana@apexfit.test' });
    pedir.flush({ mensaje: 'ok', correo: 'ana@apexfit.test', tokenRecuperacion: 'T', expiraEnMinutos: 15 });
    expect(recibida).toEqual({ token: 'T', correo: 'ana@apexfit.test', minutos: 15 });

    servicio.restablecer('T', 'nueva123').subscribe();
    const cambiar = http.expectOne('/api/v1/auth/resetear-password');
    expect(cambiar.request.method).toBe('POST');
    expect(cambiar.request.body).toEqual({ token: 'T', nuevaContrasena: 'nueva123' });
    cambiar.flush({ mensaje: 'ok' });
  });
});
