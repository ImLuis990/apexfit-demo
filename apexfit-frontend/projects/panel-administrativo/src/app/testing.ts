import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { EnvironmentProviders, Provider, signal } from '@angular/core';
import { Observable, of } from 'rxjs';
import { ALLOWED_ROLES, API_URL, ExternalNavigator, LOGIN_URL, Rol } from 'shared';
import { ConfiguracionService } from './data/configuracion.service';

/** JWT falso (sin firma real) que vence dentro de `expiresIn` segundos. Solo para pruebas. */
export function fakeJwt(expiresIn = 3600): string {
  const enc = (o: object) =>
    btoa(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${enc({ alg: 'HS256' })}.${enc({ exp: Math.floor(Date.now() / 1000) + expiresIn })}.firma`;
}

/** Deja una sesión guardada, como si el usuario ya hubiera entrado al panel. */
export function guardarSesion(rol: Rol, correo = `${rol}@apexfit.test`, id = 1): void {
  localStorage.setItem('apexfit.session', JSON.stringify({ token: fakeJwt(), id, correo, rol }));
}

export const URL_LOGIN = 'http://usuarios.test/login';

/** Lo que necesita el panel en las pruebas. `irA` recibe las salidas hacia el login de la otra app. */
export function proveedoresPanel(irA: (url: string) => void = () => undefined): (Provider | EnvironmentProviders)[] {
  return [
    provideHttpClient(),
    provideHttpClientTesting(),
    { provide: API_URL, useValue: '/api/v1' },
    { provide: ALLOWED_ROLES, useValue: ['entrenador', 'administrador'] },
    { provide: LOGIN_URL, useValue: URL_LOGIN },
    { provide: ExternalNavigator, useValue: { go: irA } },
  ];
}

/** Los días de inactividad sin tocar el servidor: para las pantallas que se prueban con servicios falsos. */
export function configuracionFalsa(dias = 10, guardar: (d: number) => Observable<number> = (d) => of(d)): Provider {
  return {
    provide: ConfiguracionService,
    useValue: {
      dias: signal(dias),
      aviso: signal<string | null>(null),
      obtenerDiasInactividad: () => of(dias),
      guardarDiasInactividad: guardar,
    },
  };
}
