import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Carga } from '../../data/carga';
import { mensajeDeError, mensajeDeGuardado } from '../../data/errores';
import { filtrar, gruposDe } from '../../data/ejercicios.mapper';
import { Ejercicio, NIVELES } from '../../data/ejercicios.models';
import { DatosEjercicios, EjerciciosService } from '../../data/ejercicios.service';
import { TAMANO_PAGINA } from '../../data/usuarios.service';

/** Catálogo de ejercicios: lo usan Nueva rutina y las rutinas de los clientes. Entrenador y administrador. */
@Component({
  selector: 'app-ejercicios',
  imports: [ReactiveFormsModule],
  templateUrl: './ejercicios.html',
  styleUrl: './ejercicios.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Ejercicios {
  private readonly servicio = inject(EjerciciosService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly niveles = NIVELES;
  protected readonly tamanoPagina = TAMANO_PAGINA;

  protected readonly carga = signal<Carga<DatosEjercicios>>({ tipo: 'cargando' });
  protected readonly texto = signal('');
  protected readonly grupo = signal('');
  protected readonly nivel = signal('');
  protected readonly modo = signal<'crear' | 'editar' | null>(null);
  protected readonly editando = signal<Ejercicio | null>(null);
  protected readonly guardando = signal(false);
  protected readonly confirmandoId = signal<number | null>(null);
  /** El ejercicio que se está borrando, o 0 mientras se cargan los de ejemplo. */
  protected readonly ocupado = signal<number | null>(null);
  protected readonly aviso = signal<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  protected readonly form = this.fb.group({
    nombre: ['', [Validators.required, Validators.maxLength(100)]],
    grupoMuscular: ['', Validators.maxLength(50)],
    nivel: [''],
    videoUrl: ['', [Validators.maxLength(255), Validators.pattern(/^https?:\/\/\S+$/i)]],
  });

  protected readonly todos = computed(() => {
    const c = this.carga();
    return c.tipo === 'listo' ? c.datos.ejercicios : [];
  });
  protected readonly grupos = computed(() => gruposDe(this.todos()));
  protected readonly visibles = computed(() => filtrar(this.todos(), this.texto(), this.grupo(), this.nivel()));

  constructor() {
    this.cargar();
  }

  protected cargar(mostrarCarga = true): void {
    if (mostrarCarga) this.carga.set({ tipo: 'cargando' });
    this.servicio
      .listar()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (datos) => this.carga.set({ tipo: 'listo', datos }),
        error: (error: unknown) => this.carga.set({ tipo: 'error', mensaje: mensajeDeError(error, 'los ejercicios') }),
      });
  }

  protected valor(evento: Event): string {
    return (evento.target as HTMLInputElement | HTMLSelectElement).value;
  }

  protected etiquetaNivel(nivel: string | null): string {
    return nivel ? nivel.charAt(0).toUpperCase() + nivel.slice(1) : '—';
  }

  // ── crear / editar ──
  protected abrirCrear(): void {
    this.editando.set(null);
    this.form.reset({ nombre: '', grupoMuscular: '', nivel: '', videoUrl: '' });
    this.modo.set('crear');
    this.aviso.set(null);
  }

  protected abrirEditar(e: Ejercicio): void {
    this.editando.set(e);
    this.form.reset({ nombre: e.nombre, grupoMuscular: e.grupoMuscular ?? '', nivel: e.nivel ?? '', videoUrl: e.videoUrl ?? '' });
    this.modo.set('editar');
    this.confirmandoId.set(null);
    this.aviso.set(null);
  }

  protected cancelar(): void {
    this.modo.set(null);
    this.editando.set(null);
  }

  protected guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const valores = this.form.getRawValue();
    const editando = this.editando();
    this.guardando.set(true);
    this.aviso.set(null);

    const peticion = editando ? this.servicio.actualizar(editando.id, valores) : this.servicio.crear(valores);
    peticion.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (guardado) => {
        this.guardando.set(false);
        this.cancelar();
        this.aviso.set({ tipo: 'ok', texto: `«${guardado.nombre}» ${editando ? 'actualizado' : 'agregado al catálogo'}.` });
        this.cargar(false);
      },
      error: (error: unknown) => {
        this.guardando.set(false);
        this.aviso.set({ tipo: 'error', texto: this.mensajeGuardar(error) });
      },
    });
  }

  // ── borrar ──
  protected pedirBorrado(e: Ejercicio): void {
    this.confirmandoId.set(e.id);
    this.aviso.set(null);
  }

  protected descartarBorrado(): void {
    this.confirmandoId.set(null);
  }

  protected borrar(e: Ejercicio): void {
    this.confirmandoId.set(null);
    this.ocupado.set(e.id);
    this.aviso.set(null);
    this.servicio
      .borrar(e.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.ocupado.set(null);
          this.aviso.set({ tipo: 'ok', texto: `«${e.nombre}» eliminado.` });
          this.cargar(false);
        },
        error: (error: unknown) => {
          this.ocupado.set(null);
          this.aviso.set({ tipo: 'error', texto: this.mensajeBorrar(error) });
        },
      });
  }

  // ── ejemplos ──
  protected cargarEjemplos(): void {
    this.ocupado.set(0);
    this.aviso.set(null);
    this.servicio
      .cargarEjemplos(this.todos().map((e) => e.nombre))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (n) => {
          this.ocupado.set(null);
          this.aviso.set({ tipo: 'ok', texto: `Se cargaron ${n} ejercicios de ejemplo.` });
          this.cargar(false);
        },
        error: (error: unknown) => {
          this.ocupado.set(null);
          this.aviso.set({ tipo: 'error', texto: this.mensajeGuardar(error) });
          this.cargar(false); // pueden haberse creado algunos antes del fallo
        },
      });
  }

  private mensajeGuardar(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 404) return 'Ese ejercicio ya no existe. Actualiza la lista.';
      if (error.status === 400 && /ya existe/i.test(String(error.error?.message ?? ''))) {
        return 'Ya existe un ejercicio con ese nombre.';
      }
    }
    return mensajeDeGuardado(error);
  }

  private mensajeBorrar(error: unknown): string {
    if (error instanceof HttpErrorResponse && [0, 403, 404].includes(error.status)) return this.mensajeGuardar(error);
    return 'No se pudo eliminar. Si el ejercicio está en alguna rutina, no se puede borrar.';
  }
}
