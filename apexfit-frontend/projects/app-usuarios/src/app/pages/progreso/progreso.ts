import { HttpErrorResponse } from '@angular/common/http';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  Injector,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { mensajeDeError } from '../../data/errores';
import { fechaCompleta, hoyIso } from '../../data/formato';
import { ordenarCronologico, resumir } from '../../data/progreso.mapper';
import { NuevoRegistro, RegistroProgreso, TipoMedida } from '../../data/progreso.models';
import { ProgresoService } from '../../data/progreso.service';
import { armarVista, VistaProgreso } from '../../data/progreso.vista';

type Estado =
  | { tipo: 'cargando' }
  | { tipo: 'error'; mensaje: string }
  | { tipo: 'vacio' }
  | { tipo: 'lista'; vista: VistaProgreso };

/** La fecha de una medición no puede ser futura. */
function noFutura(control: AbstractControl): ValidationErrors | null {
  const valor = control.value as string;
  return valor && valor > hoyIso() ? { futura: true } : null;
}

@Component({
  selector: 'app-progreso',
  imports: [ReactiveFormsModule],
  templateUrl: './progreso.html',
  styleUrl: './progreso.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Progreso {
  private readonly progreso = inject(ProgresoService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);
  private readonly fb = inject(NonNullableFormBuilder);

  private alturaConocida: number | null = null;
  private readonly pesoInput = viewChild<ElementRef<HTMLInputElement>>('peso');

  protected readonly estado = signal<Estado>({ tipo: 'cargando' });
  protected readonly registros = signal<RegistroProgreso[]>([]); // del más reciente al más antiguo
  protected readonly editando = signal<RegistroProgreso | null>(null);
  protected readonly fecha = fechaCompleta;
  protected readonly formAbierto = signal(false);
  protected readonly guardando = signal(false);
  protected readonly errorForm = signal<string | null>(null);
  protected readonly hoy = hoyIso();

  protected readonly form = this.fb.group({
    fecha: [hoyIso(), [Validators.required, noFutura]],
    peso: this.fb.control<number | null>(null, [
      Validators.required,
      Validators.min(20),
      Validators.max(400),
    ]),
    altura: this.fb.control<number | null>(null, [Validators.min(0.5), Validators.max(2.5)]),
    cintura: this.fb.control<number | null>(null, [Validators.min(10), Validators.max(300)]),
    biceps: this.fb.control<number | null>(null, [Validators.min(10), Validators.max(300)]),
    pecho: this.fb.control<number | null>(null, [Validators.min(10), Validators.max(300)]),
    observaciones: ['', Validators.maxLength(500)],
  });

  constructor() {
    this.cargar();
  }

  protected cargar(mostrarCarga = true): void {
    if (mostrarCarga) this.estado.set({ tipo: 'cargando' });
    this.progreso
      .historial()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (registros) => {
          this.registros.set([...ordenarCronologico(registros)].reverse());
          const resumen = resumir(registros);
          this.alturaConocida = resumen?.altura ?? null;
          this.estado.set(resumen ? { tipo: 'lista', vista: armarVista(resumen) } : { tipo: 'vacio' });
        },
        error: (error: unknown) =>
          this.estado.set({ tipo: 'error', mensaje: mensajeDeError(error, 'tu progreso') }),
      });
  }

  protected alternarFormulario(): void {
    const abrir = !this.formAbierto();
    this.formAbierto.set(abrir);
    this.errorForm.set(null);
    if (!abrir && this.editando()) this.terminarEdicion();
    if (abrir) {
      // La altura casi nunca cambia: se rellena con la última conocida.
      if (this.form.controls.altura.value === null && this.alturaConocida !== null) {
        this.form.controls.altura.setValue(this.alturaConocida);
      }
      afterNextRender(() => this.pesoInput()?.nativeElement.focus(), { injector: this.injector });
    }
  }

  /** Abre el formulario con los datos de un registro propio. Fecha y perímetros no se editan (el backend no los guarda). */
  protected editar(registro: RegistroProgreso): void {
    this.errorForm.set(null);
    this.form.controls.fecha.enable();
    this.form.reset({
      fecha: registro.fecha,
      peso: registro.peso,
      altura: registro.altura,
      cintura: null,
      biceps: null,
      pecho: null,
      observaciones: registro.observaciones ?? '',
    });
    this.form.controls.fecha.disable();
    this.editando.set(registro);
    this.formAbierto.set(true);
    afterNextRender(() => this.pesoInput()?.nativeElement.focus(), { injector: this.injector });
  }

  private terminarEdicion(): void {
    this.editando.set(null);
    this.form.controls.fecha.enable();
    this.form.reset({ fecha: hoyIso(), altura: this.alturaConocida });
  }

  protected guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();
    const medidas: Partial<Record<TipoMedida, number>> = {};
    if (v.cintura !== null) medidas.cintura = v.cintura;
    if (v.biceps !== null) medidas.biceps = v.biceps;
    if (v.pecho !== null) medidas.pecho = v.pecho;

    const nuevo: NuevoRegistro = {
      fecha: v.fecha,
      peso: v.peso as number, // el validador "required" garantiza que no es null
      altura: v.altura,
      observaciones: v.observaciones,
      medidas,
    };

    const editado = this.editando();
    this.guardando.set(true);
    this.errorForm.set(null);
    (editado
      ? this.progreso.actualizar(editado, { peso: nuevo.peso, altura: nuevo.altura, observaciones: nuevo.observaciones })
      : this.progreso.registrar(nuevo)
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.guardando.set(false);
          this.formAbierto.set(false);
          if (editado) this.terminarEdicion();
          else this.form.reset({ fecha: hoyIso(), altura: v.altura });
          this.cargar(false);
        },
        error: (error: unknown) => {
          this.guardando.set(false);
          this.errorForm.set(this.mensajeGuardar(error, editado !== null));
        },
      });
  }

  private mensajeGuardar(error: unknown, edicion: boolean): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 0) return 'No se pudo conectar con el servidor. Intenta de nuevo.';
      if (error.status === 400) return 'Revisa los datos e intenta de nuevo.';
    }
    return edicion ? 'No pudimos guardar los cambios. Intenta de nuevo.' : 'No pudimos guardar tu medición. Intenta de nuevo.';
  }
}
