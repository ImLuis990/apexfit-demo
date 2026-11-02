import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { AuthService } from 'shared';
import { of, throwError } from 'rxjs';
import { RegistroService } from '../../data/registro.service';
import { Registro } from './registro';

interface Fuentes {
  registrar?: () => unknown;
  login?: () => unknown;
}

function crear(f: Fuentes = {}) {
  const registro = { registrar: vi.fn(f.registrar ?? (() => of(undefined))) };
  const auth = { login: vi.fn(f.login ?? (() => of({ token: 't', id: 1, correo: 'x', rol: 'cliente' }))) };
  TestBed.configureTestingModule({
    imports: [Registro],
    providers: [
      provideRouter([]),
      { provide: RegistroService, useValue: registro },
      { provide: AuthService, useValue: auth },
    ],
  });
  const router = TestBed.inject(Router);
  const irA = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
  const navegar = vi.spyOn(router, 'navigate').mockResolvedValue(true);
  const fixture = TestBed.createComponent(Registro);
  fixture.detectChanges();
  return { fixture, registro, auth, irA, navegar };
}

type F = ComponentFixture<Registro>;
const el = (f: F) => f.nativeElement as HTMLElement;
const texto = (f: F) => el(f).textContent?.replace(/\s+/g, ' ') ?? '';
function escribir(f: F, control: string, valor: string) {
  const input = el(f).querySelector(`[formcontrolname="${control}"]`) as HTMLInputElement;
  input.value = valor;
  input.dispatchEvent(new Event('input'));
}
function enviar(f: F) {
  (el(f).querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
  f.detectChanges();
}
function llenar(f: F, over: Partial<Record<string, string>> = {}) {
  const v = { nombre: 'Laura', apellido: 'Gómez', correo: 'laura@apexfit.test', telefono: '', contrasena: 'secreta1', confirmar: 'secreta1', ...over };
  for (const [k, valor] of Object.entries(v)) escribir(f, k, valor);
}

describe('Registro (pantalla)', () => {
  it('no envía si faltan datos y muestra qué falta', () => {
    const { fixture, registro } = crear();
    enviar(fixture);
    expect(registro.registrar).not.toHaveBeenCalled();
    const t = texto(fixture);
    expect(t).toContain('El nombre es obligatorio');
    expect(t).toContain('El apellido es obligatorio');
    expect(t).toContain('Escribe un correo válido');
    expect(t).toContain('Debe tener al menos 6 caracteres');
  });

  it('la contraseña necesita al menos 6 caracteres', () => {
    const { fixture, registro } = crear();
    llenar(fixture, { contrasena: '123', confirmar: '123' });
    enviar(fixture);
    expect(registro.registrar).not.toHaveBeenCalled();
    expect(texto(fixture)).toContain('al menos 6 caracteres');
  });

  it('las dos contraseñas deben coincidir', () => {
    const { fixture, registro } = crear();
    llenar(fixture, { confirmar: 'otra1234' });
    enviar(fixture);
    expect(registro.registrar).not.toHaveBeenCalled();
    expect(texto(fixture)).toContain('Las contraseñas no coinciden');
  });

  it('el teléfono, si se escribe, debe ser numérico', () => {
    const { fixture, registro } = crear();
    llenar(fixture, { telefono: '12ab' });
    enviar(fixture);
    expect(registro.registrar).not.toHaveBeenCalled();
    expect(texto(fixture)).toContain('solo números');
  });

  it('crea la cuenta, inicia sesión sola y entra a la app', () => {
    const { fixture, registro, auth, irA } = crear();
    llenar(fixture, { telefono: '3001234567' });
    enviar(fixture);

    expect(registro.registrar).toHaveBeenCalledWith({
      nombre: 'Laura', apellido: 'Gómez', correo: 'laura@apexfit.test', telefono: '3001234567', contrasena: 'secreta1',
    });
    expect(auth.login).toHaveBeenCalledWith('laura@apexfit.test', 'secreta1');
    expect(irA).toHaveBeenCalledWith('/');
  });

  it('el teléfono vacío se envía como null', () => {
    const { fixture, registro } = crear();
    llenar(fixture);
    enviar(fixture);
    expect(registro.registrar).toHaveBeenCalledWith(expect.objectContaining({ telefono: null }));
  });

  it('si el correo ya existe, lo explica y no intenta entrar', () => {
    const { fixture, auth } = crear({
      registrar: () => throwError(() => new HttpErrorResponse({ status: 400, error: { mensaje: 'Error: El correo ya está en uso.' } })),
    });
    llenar(fixture);
    enviar(fixture);
    expect(texto(fixture)).toContain('Ese correo ya está registrado');
    expect(auth.login).not.toHaveBeenCalled();
  });

  it('si no hay conexión, lo dice', () => {
    const { fixture } = crear({ registrar: () => throwError(() => new HttpErrorResponse({ status: 0 })) });
    llenar(fixture);
    enviar(fixture);
    expect(texto(fixture)).toContain('No se pudo conectar con el servidor');
  });

  it('si la cuenta se creó pero el inicio automático falla, lleva al login', () => {
    const { fixture, navegar, irA } = crear({ login: () => throwError(() => new HttpErrorResponse({ status: 500 })) });
    llenar(fixture);
    enviar(fixture);
    expect(navegar).toHaveBeenCalledWith(['/login']);
    expect(irA).not.toHaveBeenCalled();
  });

  it('ofrece volver al login', () => {
    const { fixture } = crear();
    const enlace = el(fixture).querySelector('.fm__alt a') as HTMLAnchorElement;
    expect(enlace.getAttribute('href')).toBe('/login');
  });
});
