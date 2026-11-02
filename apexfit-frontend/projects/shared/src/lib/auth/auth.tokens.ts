import { InjectionToken } from '@angular/core';
import { Rol } from './auth.models';

/** URL base de la API, p. ej. '/api/v1'. Cada app la entrega desde su environment. */
export const API_URL = new InjectionToken<string>('API_URL');

/** Roles que pueden entrar a ESTA app (cada app define los suyos). */
export const ALLOWED_ROLES = new InjectionToken<readonly Rol[]>('ALLOWED_ROLES');

/**
 * Solo para apps SIN pantalla de login propia (el panel): dirección completa del login,
 * que vive en otra app, p. ej. 'http://localhost:4200/login'. Si no se define,
 * el login es interno (ruta '/login' de la misma app).
 */
export const LOGIN_URL = new InjectionToken<string | null>('LOGIN_URL', {
  providedIn: 'root',
  factory: () => null,
});

export type RoleHomeUrls = Partial<Record<Rol, string>>;

/**
 * Solo para la app que tiene el login (usuarios): para cada rol que NO entra a esta app,
 * la dirección base de la app donde sí entra, p. ej. { entrenador: 'http://localhost:4201' }.
 */
export const ROLE_HOME_URLS = new InjectionToken<RoleHomeUrls>('ROLE_HOME_URLS', {
  providedIn: 'root',
  factory: () => ({}),
});
