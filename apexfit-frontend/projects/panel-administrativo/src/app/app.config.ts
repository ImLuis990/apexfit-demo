import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { ALLOWED_ROLES, API_URL, LOGIN_URL, Rol, authInterceptor } from 'shared';
import { environment } from '../environments/environment';
import { routes } from './app.routes';

/** Roles que pueden entrar a esta app. */
const ROLES_PERMITIDOS: readonly Rol[] = ['entrenador', 'administrador'];

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    { provide: API_URL, useValue: environment.apiUrl },
    { provide: ALLOWED_ROLES, useValue: ROLES_PERMITIDOS },
    // El panel no tiene login propio: usa el único login, que vive en la app de usuarios.
    { provide: LOGIN_URL, useValue: `${environment.usuariosUrl}/login` },
  ],
};
