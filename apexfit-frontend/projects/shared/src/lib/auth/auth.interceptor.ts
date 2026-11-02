import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { API_URL } from './auth.tokens';

/**
 * - Agrega "Authorization: Bearer <token>" a las llamadas a nuestra API
 *   (excepto /auth/*, que son públicas).
 * - Si el backend responde 401 (token vencido o inválido), cierra la sesión.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const apiUrl = inject(API_URL);

  const isApiCall = req.url.startsWith(apiUrl);
  const isAuthCall = req.url.startsWith(`${apiUrl}/auth/`);
  const token = auth.token();

  const authReq =
    token && isApiCall && !isAuthCall
      ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : req;

  return next(authReq).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401 && isApiCall && !isAuthCall) {
        auth.logout();
      }
      return throwError(() => error);
    }),
  );
};
