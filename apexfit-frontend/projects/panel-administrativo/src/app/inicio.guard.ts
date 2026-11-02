import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from 'shared';
import { inicioDe } from './layout/menu';

/** La raíz del panel lleva a la primera opción del menú de cada rol (layout/menu.ts). */
export const inicioGuard: CanActivateFn = () => {
  const rol = inject(AuthService).session()?.rol;
  return inject(Router).createUrlTree([inicioDe(rol)]);
};
