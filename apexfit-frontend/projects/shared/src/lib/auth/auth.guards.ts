import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Rol } from './auth.models';
import { AuthService } from './auth.service';

/** Protege las rutas privadas: exige sesión y que el rol pueda entrar a esta app. */
export const accessGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.hasAccess()) return true;

  // Hay sesión pero su rol no corresponde a esta app.
  const sinAcceso = auth.isLoggedIn();
  if (sinAcceso) auth.clear();

  // El login vive en otra app (panel): se sale de esta app hacia allá.
  if (auth.usesExternalLogin) {
    auth.goToLogin(sinAcceso ? 'sin-acceso' : undefined);
    return false;
  }

  if (sinAcceso) {
    return router.createUrlTree(['/login'], { queryParams: { motivo: 'sin-acceso' } });
  }
  const queryParams = state.url !== '/' ? { returnUrl: state.url } : {};
  return router.createUrlTree(['/login'], { queryParams });
};

/** Para /login: si ya hay sesión válida, no tiene sentido mostrar el formulario. */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.hasAccess() ? router.createUrlTree(['/']) : true;
};

/**
 * Para rutas exclusivas de ciertos roles dentro de una misma app (p. ej. Usuarios solo para
 * el administrador). Si el rol no corresponde, vuelve al inicio de su rol.
 * Es comodidad de interfaz: la protección real la hace el backend.
 */
export const rolGuard =
  (...roles: Rol[]): CanActivateFn =>
  () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    const rol = auth.session()?.rol;
    return rol !== undefined && roles.includes(rol) ? true : router.createUrlTree(['/']);
  };
