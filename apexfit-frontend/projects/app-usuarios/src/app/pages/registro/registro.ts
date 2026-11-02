import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from 'shared';
import { RegistroService } from '../../data/registro.service';

/** Las dos contraseñas escritas deben ser iguales. */
function contrasenasIguales(grupo: AbstractControl): ValidationErrors | null {
  const a = grupo.get('contrasena')?.value as string;
  const b = grupo.get('confirmar')?.value as string;
  return a && b && a !== b ? { noCoinciden: true } : null;
}

@Component({
  selector: 'app-registro',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './registro.html',
  styleUrl: './registro.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Registro {
  private readonly registro = inject(RegistroService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly form = inject(NonNullableFormBuilder).group(
    {
      nombre: ['', [Validators.required, Validators.maxLength(100)]],
      apellido: ['', [Validators.required, Validators.maxLength(100)]],
      correo: ['', [Validators.required, Validators.email, Validators.maxLength(120)]],
      telefono: ['', Validators.pattern(/^[0-9]{7,15}$/)],
      contrasena: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(72)]],
      confirmar: ['', Validators.required],
    },
    { validators: contrasenasIguales },
  );

  protected readonly cargando = signal(false);
  protected readonly error = signal<string | null>(null);

  protected enviar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();
    const correo = v.correo.trim();
    this.cargando.set(true);
    this.error.set(null);

    this.registro
      .registrar({
        nombre: v.nombre.trim(),
        apellido: v.apellido.trim(),
        correo,
        telefono: v.telefono.trim() || null,
        contrasena: v.contrasena,
      })
      .subscribe({
        next: () => this.entrar(correo, v.contrasena),
        error: (error: unknown) => {
          this.cargando.set(false);
          this.error.set(this.mensaje(error));
        },
      });
  }

  /** La cuenta ya existe: se inicia sesión sola para que el cliente no tenga que repetir sus datos. */
  private entrar(correo: string, contrasena: string): void {
    this.auth.login(correo, contrasena).subscribe({
      next: () => void this.router.navigateByUrl('/'),
      error: () => {
        // La cuenta sí se creó; si falla el inicio automático, que entre desde el login.
        this.cargando.set(false);
        void this.router.navigate(['/login']);
      },
    });
  }

  private mensaje(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 0) return 'No se pudo conectar con el servidor. Intenta de nuevo.';
      if (error.status === 400) {
        // En el registro el backend responde el error de correo repetido con el campo "mensaje".
        const texto = String(error.error?.mensaje ?? error.error?.message ?? '').toLowerCase();
        if (texto.includes('correo') && texto.includes('uso')) {
          return 'Ese correo ya está registrado. Inicia sesión.';
        }
        if (error.error?.validationErrors) return 'Revisa los datos e intenta de nuevo.';
      }
    }
    return 'No pudimos crear tu cuenta. Intenta de nuevo.';
  }
}
