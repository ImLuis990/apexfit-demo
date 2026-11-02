import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { RecuperacionService, SolicitudRecuperacion } from '../../data/recuperacion.service';

/** Las dos contraseñas escritas deben ser iguales. */
function contrasenasIguales(grupo: AbstractControl): ValidationErrors | null {
  const a = grupo.get('contrasena')?.value as string;
  const b = grupo.get('confirmar')?.value as string;
  return a && b && a !== b ? { noCoinciden: true } : null;
}

const SIN_CONEXION = 'No se pudo conectar con el servidor. Intenta de nuevo.';

@Component({
  selector: 'app-recuperar',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './recuperar.html',
  styleUrl: './recuperar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Recuperar {
  private readonly recuperacion = inject(RecuperacionService);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly paso = signal<'correo' | 'clave' | 'listo'>('correo');
  protected readonly cargando = signal(false);
  protected readonly error = signal<string | null>(null);
  /** El token solo vive en memoria mientras dura este flujo (nunca va en la URL). */
  protected readonly solicitud = signal<SolicitudRecuperacion | null>(null);

  protected readonly formCorreo = this.fb.group({
    correo: ['', [Validators.required, Validators.email, Validators.maxLength(120)]],
  });
  protected readonly formClave = this.fb.group(
    {
      contrasena: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(72)]],
      confirmar: ['', Validators.required],
    },
    { validators: contrasenasIguales },
  );

  protected pedirToken(): void {
    if (this.formCorreo.invalid) {
      this.formCorreo.markAllAsTouched();
      return;
    }
    this.cargando.set(true);
    this.error.set(null);
    this.recuperacion.solicitar(this.formCorreo.controls.correo.value.trim()).subscribe({
      next: (solicitud) => {
        this.cargando.set(false);
        this.solicitud.set(solicitud);
        this.formClave.reset();
        this.paso.set('clave');
      },
      error: (error: unknown) => {
        this.cargando.set(false);
        this.error.set(this.mensajeSolicitud(error));
      },
    });
  }

  protected cambiarClave(): void {
    const solicitud = this.solicitud();
    if (!solicitud) return;
    if (this.formClave.invalid) {
      this.formClave.markAllAsTouched();
      return;
    }
    this.cargando.set(true);
    this.error.set(null);
    this.recuperacion.restablecer(solicitud.token, this.formClave.controls.contrasena.value).subscribe({
      next: () => {
        this.cargando.set(false);
        this.solicitud.set(null);
        this.paso.set('listo');
      },
      error: (error: unknown) => {
        this.cargando.set(false);
        const { mensaje, reiniciar } = this.mensajeRestablecer(error);
        this.error.set(mensaje);
        if (reiniciar) this.reiniciar(mensaje);
      },
    });
  }

  /** Vuelve al primer paso (por ejemplo, para usar otro correo) sin perder el aviso de por qué. */
  protected reiniciar(aviso: string | null = null): void {
    this.solicitud.set(null);
    this.formClave.reset();
    this.error.set(aviso);
    this.paso.set('correo');
  }

  private mensajeSolicitud(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 0) return SIN_CONEXION;
      if (error.status === 404) return 'No existe ninguna cuenta con ese correo.';
      if (error.status === 403) return 'Tu cuenta está inactiva. Contacta al administrador del gimnasio.';
      if (error.status === 400 && error.error?.validationErrors) return 'Escribe un correo válido.';
    }
    return 'No pudimos iniciar la recuperación. Intenta de nuevo.';
  }

  private mensajeRestablecer(error: unknown): { mensaje: string; reiniciar: boolean } {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 0) return { mensaje: SIN_CONEXION, reiniciar: false };
      if (error.status === 400) {
        if (error.error?.validationErrors) {
          return { mensaje: 'La contraseña debe tener al menos 6 caracteres.', reiniciar: false };
        }
        const texto = String(error.error?.mensaje ?? error.error?.message ?? '').toLowerCase();
        if (texto.includes('token') || texto.includes('expirado')) {
          return { mensaje: 'Pasaron los 15 minutos para cambiar la contraseña. Vuelve a empezar.', reiniciar: true };
        }
        return { mensaje: 'No pudimos restablecer tu contraseña. Vuelve a empezar.', reiniciar: true };
      }
    }
    return { mensaje: 'No pudimos restablecer tu contraseña. Intenta de nuevo.', reiniciar: false };
  }
}
