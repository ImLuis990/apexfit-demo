import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { readHandoffSession } from './session-transfer';

/**
 * Ruta '/sesion' del panel: recibe la sesión que el login (en la app de usuarios) le entrega
 * en la URL, la guarda y limpia la URL para que el token no quede en el historial.
 */
@Component({
  selector: 'lib-session-callback',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<p class="af-muted">Iniciando sesión…</p>`,
  styles: `
    :host {
      display: grid;
      place-items: center;
      min-height: 100vh;
    }
  `,
})
export class SessionCallback {
  constructor() {
    const auth = inject(AuthService);
    const router = inject(Router);
    const fragment = inject(ActivatedRoute).snapshot.fragment;

    const session = readHandoffSession(fragment);
    if (session && auth.acceptSession(session)) {
      // replaceUrl: reemplaza esta entrada del historial, así el token no se puede "volver a ver".
      void router.navigate(['/'], { replaceUrl: true });
    } else {
      auth.goToLogin();
    }
  }
}
