import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { AuthService } from '../auth/auth.service';
import { CuentaService, PerfilCuenta } from './cuenta.service';

type EstadoPerfil =
  | { tipo: 'cargando' }
  | { tipo: 'error' }
  | { tipo: 'listo'; datos: PerfilCuenta };

const ETIQUETA_ROL = {
  cliente: 'Cliente',
  entrenador: 'Entrenador',
  administrador: 'Administrador',
} as const;

/** La nueva contraseña se confirma bien y no puede ser igual a la actual. */
function contrasenasValidas(grupo: AbstractControl): ValidationErrors | null {
  const actual = grupo.get('actual')?.value as string;
  const nueva = grupo.get('nueva')?.value as string;
  const confirmar = grupo.get('confirmar')?.value as string;
  const errores: ValidationErrors = {};
  if (nueva && confirmar && nueva !== confirmar) errores['noCoinciden'] = true;
  if (nueva && actual && nueva === actual) errores['igualActual'] = true;
  return Object.keys(errores).length ? errores : null;
}

@Component({
  selector: 'lib-mi-cuenta',
  imports: [ReactiveFormsModule],
  templateUrl: './mi-cuenta.html',
  styleUrl: './mi-cuenta.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MiCuenta {
  private readonly auth = inject(AuthService);
  private readonly cuenta = inject(CuentaService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly perfil = signal<EstadoPerfil>({ tipo: 'cargando' });
  protected readonly rol = computed(() => {
    const rol = this.auth.session()?.rol;
    return rol ? ETIQUETA_ROL[rol] : '—';
  });

  protected readonly form = inject(NonNullableFormBuilder).group(
    {
      actual: ['', Validators.required],
      nueva: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(72)]],
      confirmar: ['', Validators.required],
    },
    { validators: contrasenasValidas },
  );

  protected readonly guardando = signal(false);
  protected readonly ok = signal(false);
  protected readonly errorForm = signal<string | null>(null);

  constructor() {
    this.cargar();
  }

  protected cargar(): void {
    this.perfil.set({ tipo: 'cargando' });
    this.cuenta
      .perfil()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (datos) => this.perfil.set({ tipo: 'listo', datos }),
        error: () => this.perfil.set({ tipo: 'error' }),
      });
  }

  protected fecha(iso: string | null): string {
    if (!iso) return '—';
    const [anio, mes, dia] = iso.split('-');
    return `${dia}/${mes}/${anio}`;
  }

  protected cambiar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { actual, nueva } = this.form.getRawValue();
    this.guardando.set(true);
    this.errorForm.set(null);
    this.ok.set(false);

    this.cuenta
      .cambiarContrasena(actual, nueva)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.guardando.set(false);
          this.ok.set(true);
          this.form.reset();
        },
        error: (error: unknown) => {
          this.guardando.set(false);
          this.errorForm.set(this.mensaje(error));
        },
      });
  }

  private mensaje(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 0) return 'No se pudo conectar con el servidor. Intenta de nuevo.';
      if (error.status === 400) {
        if (error.error?.validationErrors) {
          return 'La nueva contraseña debe tener al menos 6 caracteres.';
        }
        if (String(error.error?.message ?? '').toLowerCase().includes('actual')) {
          return 'La contraseña actual no es correcta.';
        }
      }
    }
    return 'No pudimos cambiar la contraseña. Intenta de nuevo.';
  }
}
