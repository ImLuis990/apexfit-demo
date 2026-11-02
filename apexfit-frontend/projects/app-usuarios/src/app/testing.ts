import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { EnvironmentProviders, Provider } from '@angular/core';
import { ALLOWED_ROLES, API_URL, Rol } from 'shared';

/** JWT falso (sin firma real) que vence dentro de `expiresIn` segundos. Solo para pruebas. */
export function fakeJwt(expiresIn = 3600): string {
  const enc = (o: object) =>
    btoa(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${enc({ alg: 'HS256' })}.${enc({ exp: Math.floor(Date.now() / 1000) + expiresIn })}.firma`;
}

/** Deja una sesión guardada, como si el usuario ya hubiera iniciado sesión. */
export function guardarSesion(rol: Rol, correo = `${rol}@apexfit.test`, id = 1): void {
  localStorage.setItem(
    'apexfit.session',
    JSON.stringify({ token: fakeJwt(), id, correo, rol }),
  );
}

/** Lo mínimo que necesita AuthService en las pruebas de esta app. */
export const proveedoresBase: (Provider | EnvironmentProviders)[] = [
  provideHttpClient(),
  provideHttpClientTesting(),
  { provide: API_URL, useValue: '/api/v1' },
  { provide: ALLOWED_ROLES, useValue: ['cliente'] },
];
