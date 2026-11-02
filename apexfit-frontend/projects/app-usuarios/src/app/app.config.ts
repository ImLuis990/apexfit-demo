import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { ALLOWED_ROLES, API_URL, ROLE_HOME_URLS, Rol, authInterceptor } from 'shared';
import { environment } from '../environments/environment';
import { routes } from './app.routes';

/** Roles que pueden entrar a esta app. */
const ROLES_PERMITIDOS: readonly Rol[] = ['cliente'];

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    { provide: API_URL, useValue: environment.apiUrl },
    { provide: ALLOWED_ROLES, useValue: ROLES_PERMITIDOS },
    // Este es el login único: los roles que no entran aquí se mandan a su app.
    {
      provide: ROLE_HOME_URLS,
      useValue: { entrenador: environment.panelUrl, administrador: environment.panelUrl },
    },
  ],
};
