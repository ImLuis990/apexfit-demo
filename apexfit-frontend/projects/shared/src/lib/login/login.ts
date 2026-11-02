import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { ExternalNavigator } from '../auth/external-navigator';
import { buildHandoffUrl } from '../auth/session-transfer';
import { ROLE_HOME_URLS } from '../auth/auth.tokens';

@Component({
  selector: 'lib-login',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly external = inject(ExternalNavigator);
  private readonly roleHomeUrls = inject(ROLE_HOME_URLS);

  readonly form = inject(NonNullableFormBuilder).group({
    correo: ['', [Validators.required, Validators.email]],
    contrasena: ['', Validators.required],
  });

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  entrarComoClienteDemo(): void {
    this.form.setValue({
      correo: 'cliente@apexfit.test',
      contrasena: 'Prueba123',
    });
    this.submit();
  }

  constructor() {
    if (this.route.snapshot.queryParamMap.get('motivo') === 'sin-acceso') {
      this.error.set('Tu cuenta no tiene acceso a esta aplicación.');
    }
  }

  get correo() {
    return this.form.controls.correo;
  }

  get contrasena() {
    return this.form.controls.contrasena;
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    const { correo, contrasena } = this.form.getRawValue();

    this.auth.login(correo.trim(), contrasena).subscribe({
      next: (session) => {
        if (this.auth.hasAccess()) {
          this.loading.set(false);
          void this.router.navigateByUrl(this.returnUrl());
          return;
        }

        // El rol no entra a esta app: si tiene otra app asignada, se le entrega la sesión allí.
        const appUrl = this.roleHomeUrls[session.rol];
        if (appUrl) {
          this.external.go(buildHandoffUrl(appUrl, session)); // se deja "Entrando…" mientras cambia de página
          return;
        }

        this.loading.set(false);
        this.error.set(
          `Tu cuenta es de tipo "${session.rol}" y no puede entrar a esta aplicación.`,
        );
      },
      error: (err: unknown) => {
        this.loading.set(false);
        this.error.set(this.messageFor(err));
      },
    });
  }

  /** Solo se acepta una ruta interna como destino tras el login. */
  private returnUrl(): string {
    const url = this.route.snapshot.queryParamMap.get('returnUrl');
    return url && url.startsWith('/') && !url.startsWith('//') ? url : '/';
  }

  private messageFor(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      if (err.status === 0) {
        return 'No se pudo conectar con el servidor. Verifica que el backend esté corriendo.';
      }
      // 403 = cuenta desactivada: el backend explica el motivo y conviene mostrarlo tal cual.
      if (err.status === 403 && typeof err.error?.message === 'string') {
        return err.error.message;
      }
      // Credenciales incorrectas: 401 (400 en versiones anteriores del backend).
      if (err.status === 400 || err.status === 401 || err.status === 403) {
        return err.error?.validationErrors
          ? 'Revisa el correo y la contraseña.'
          : 'Correo o contraseña incorrectos.';
      }
    }
    if (err instanceof Error && err.message === 'SIN_ROL') {
      return 'Tu cuenta no tiene un rol válido. Contacta al administrador.';
    }
    return 'Ocurrió un error inesperado. Intenta de nuevo.';
  }
}
