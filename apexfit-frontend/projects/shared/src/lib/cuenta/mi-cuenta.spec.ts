import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { ALLOWED_ROLES, API_URL } from '../auth/auth.tokens';
import { fakeJwt } from '../auth/test-utils';
import { CuentaService, PerfilCuenta } from './cuenta.service';
import { MiCuenta } from './mi-cuenta';

const perfil: PerfilCuenta = {
  id: 5, nombre: 'Carlos', apellido: 'Pérez', correo: 'carlos@apexfit.test',
  telefono: null, fechaNacimiento: '1999-05-20',
};

function crear(f: { perfil?: () => unknown; cambiar?: () => unknown } = {}) {
  localStorage.clear();
  localStorage.setItem('apexfit.session', JSON.stringify({ token: fakeJwt(3600), id: 5, correo: 'carlos@apexfit.test', rol: 'cliente' }));
  const servicio = {
    perfil: vi.fn(f.perfil ?? (() => of(perfil))),
    cambiarContrasena: vi.fn(f.cambiar ?? (() => of(undefined))),
  };
  TestBed.configureTestingModule({
    imports: [MiCuenta],
    providers: [
      provideRouter([]), provideHttpClient(), provideHttpClientTesting(),
      { provide: API_URL, useValue: '/api/v1' },
      { provide: ALLOWED_ROLES, useValue: ['cliente'] },
      { provide: CuentaService, useValue: servicio },
    ],
  });
  const fixture = TestBed.createComponent(MiCuenta);
  fixture.detectChanges();
  return { fixture, servicio };
}

type F = ComponentFixture<MiCuenta>;
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
const llenar = (f: F, actual = 'vieja123', nueva = 'nueva456', confirmar = nueva) => {
  escribir(f, 'actual', actual);
  escribir(f, 'nueva', nueva);
  escribir(f, 'confirmar', confirmar);
};

describe('MiCuenta', () => {
  describe('datos', () => {
    it('mientras carga lo indica', () => {
      expect(texto(crear({ perfil: () => new Subject() }).fixture)).toContain('Cargando tus datos');
    });

    it('muestra nombre, correo, teléfono vacío como raya, fecha y el rol de la sesión', () => {
      const { fixture } = crear();
      const datos: Record<string, string> = {};
      el(fixture).querySelectorAll('dl > div').forEach((fila) => {
        datos[fila.querySelector('dt')?.textContent?.trim() ?? ''] = fila.querySelector('dd')?.textContent?.trim() ?? '';
      });
      expect(datos).toEqual({
        'Nombre': 'Carlos Pérez',
        'Correo': 'carlos@apexfit.test',
        'Teléfono': '—',
        'Fecha de nacimiento': '20/05/1999',
        'Rol': 'Cliente',
      });
    });

    it('si falla, avisa y "Reintentar" vuelve a pedir los datos', () => {
      let intento = 0;
      const { fixture, servicio } = crear({
        perfil: () => (++intento === 1 ? throwError(() => new HttpErrorResponse({ status: 500 })) : of(perfil)),
      });
      expect(texto(fixture)).toContain('No pudimos cargar tus datos');
      (Array.from(el(fixture).querySelectorAll('button')).find((b) => b.textContent?.includes('Reintentar')) as HTMLButtonElement).click();
      fixture.detectChanges();
      expect(servicio.perfil).toHaveBeenCalledTimes(2);
      expect(texto(fixture)).toContain('Carlos Pérez');
    });
  });

  describe('cambiar contraseña', () => {
    it('no envía si el formulario está vacío y dice qué falta', () => {
      const { fixture, servicio } = crear();
      enviar(fixture);
      expect(servicio.cambiarContrasena).not.toHaveBeenCalled();
      expect(texto(fixture)).toContain('Escribe tu contraseña actual');
      expect(texto(fixture)).toContain('Debe tener al menos 6 caracteres');
    });

    it('la nueva contraseña debe tener al menos 6 caracteres', () => {
      const { fixture, servicio } = crear();
      llenar(fixture, 'vieja123', '123');
      enviar(fixture);
      expect(servicio.cambiarContrasena).not.toHaveBeenCalled();
      expect(texto(fixture)).toContain('al menos 6 caracteres');
    });

    it('las dos contraseñas nuevas deben coincidir', () => {
      const { fixture, servicio } = crear();
      llenar(fixture, 'vieja123', 'nueva456', 'otra4567');
      enviar(fixture);
      expect(servicio.cambiarContrasena).not.toHaveBeenCalled();
      expect(texto(fixture)).toContain('Las contraseñas no coinciden');
    });

    it('la nueva no puede ser igual a la actual', () => {
      const { fixture, servicio } = crear();
      llenar(fixture, 'misma123', 'misma123');
      enviar(fixture);
      expect(servicio.cambiarContrasena).not.toHaveBeenCalled();
      expect(texto(fixture)).toContain('distinta de la actual');
    });

    it('cambia la contraseña, avisa y limpia el formulario', () => {
      const { fixture, servicio } = crear();
      llenar(fixture);
      enviar(fixture);

      expect(servicio.cambiarContrasena).toHaveBeenCalledWith('vieja123', 'nueva456');
      expect(texto(fixture)).toContain('Contraseña actualizada');
      expect((el(fixture).querySelector('[formcontrolname="actual"]') as HTMLInputElement).value).toBe('');
      expect((el(fixture).querySelector('[formcontrolname="nueva"]') as HTMLInputElement).value).toBe('');
    });

    it('si la contraseña actual es incorrecta, lo dice', () => {
      const { fixture } = crear({
        cambiar: () => throwError(() => new HttpErrorResponse({ status: 400, error: { message: 'La contraseña actual es incorrecta' } })),
      });
      llenar(fixture);
      enviar(fixture);
      expect(texto(fixture)).toContain('La contraseña actual no es correcta');
      expect(texto(fixture)).not.toContain('Contraseña actualizada');
    });

    it('si no hay conexión, lo dice; y cualquier otro fallo da un mensaje general', () => {
      const a = crear({ cambiar: () => throwError(() => new HttpErrorResponse({ status: 0 })) });
      llenar(a.fixture);
      enviar(a.fixture);
      expect(texto(a.fixture)).toContain('No se pudo conectar con el servidor');
    });

    it('un fallo del servidor da un mensaje general', () => {
      const { fixture } = crear({ cambiar: () => throwError(() => new HttpErrorResponse({ status: 500 })) });
      llenar(fixture);
      enviar(fixture);
      expect(texto(fixture)).toContain('No pudimos cambiar la contraseña');
    });
  });
});
