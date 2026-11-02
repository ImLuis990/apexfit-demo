import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormGroup, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Carga } from '../../data/carga';
import { mensajeDeError, mensajeDeGuardado } from '../../data/errores';
import { fechaCompleta } from '../../data/formato';
import { DatosMisRutinas, LineaEditable, RutinaDelEntrenador } from '../../data/mis-rutinas.models';
import { MisRutinasService, RUTINA_AJENA } from '../../data/mis-rutinas.service';
import { DIAS, DiaSemana, EjercicioCatalogo } from '../../data/rutinas.models';
import { TAMANO_PAGINA } from '../../data/usuarios.service';

/** Entrenador: las rutinas que creó. Puede ver el detalle y editar ejercicios, o desactivar la rutina. */
@Component({
  selector: 'app-mis-rutinas',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './mis-rutinas.html',
  styleUrl: './mis-rutinas.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MisRutinas {
  private readonly servicio = inject(MisRutinasService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly dias = DIAS;
  protected readonly tamanoPagina = TAMANO_PAGINA;
  protected readonly fecha = fechaCompleta;

  protected readonly carga = signal<Carga<DatosMisRutinas>>({ tipo: 'cargando' });
  protected readonly estado = signal<'activa' | 'inactiva' | ''>('activa');
  protected readonly texto = signal('');

  protected readonly editando = signal<RutinaDelEntrenador | null>(null);
  protected readonly editor = signal<'cargando' | 'listo' | 'error'>('cargando');
  protected readonly catalogo = signal<EjercicioCatalogo[]>([]);
  private originales: LineaEditable[] = [];
  protected readonly guardando = signal(false);

  protected readonly confirmandoId = signal<number | null>(null);
  protected readonly ocupado = signal<number | null>(null);
  protected readonly aviso = signal<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  protected readonly form = this.fb.group({
    nombre: ['', [Validators.required, Validators.maxLength(100)]],
    descripcion: ['', Validators.maxLength(500)],
    lineas: this.fb.array<FormGroup>([]),
  });

  protected readonly visibles = computed(() => {
    const c = this.carga();
    if (c.tipo !== 'listo') return [];
    const t = this.texto().trim().toLowerCase();
    return c.datos.rutinas.filter(
      (r) =>
        (this.estado() === '' || r.activa === (this.estado() === 'activa')) &&
        (!t || r.cliente.toLowerCase().includes(t) || r.nombre.toLowerCase().includes(t)),
    );
  });

  constructor() {
    this.cargar();
  }

  protected get lineas() {
    return this.form.controls.lineas;
  }

  protected cargar(mostrarCarga = true): void {
    if (mostrarCarga) this.carga.set({ tipo: 'cargando' });
    this.servicio
      .listar()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (datos) => this.carga.set({ tipo: 'listo', datos }),
        error: (error: unknown) => this.carga.set({ tipo: 'error', mensaje: mensajeDeError(error, 'tus rutinas') }),
      });
  }

  protected valor(evento: Event): string {
    return (evento.target as HTMLInputElement | HTMLSelectElement).value;
  }

  protected cambiarEstado(evento: Event): void {
    this.estado.set(this.valor(evento) as 'activa' | 'inactiva' | '');
  }

  // ── editar ──
  protected abrirEditar(r: RutinaDelEntrenador): void {
    this.editando.set(r);
    this.editor.set('cargando');
    this.confirmandoId.set(null);
    this.aviso.set(null);
    this.servicio
      .abrir(r.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ lineas, catalogo }) => {
          this.originales = lineas;
          this.catalogo.set(catalogo);
          this.form.controls.nombre.setValue(r.nombre);
          this.form.controls.descripcion.setValue(r.descripcion ?? '');
          this.lineas.clear();
          for (const l of lineas) this.lineas.push(this.crearLinea(l));
          this.form.markAsUntouched();
          this.editor.set('listo');
        },
        error: () => this.editor.set('error'),
      });
  }

  protected cancelar(): void {
    this.editando.set(null);
  }

  protected agregarLinea(): void {
    this.lineas.push(this.crearLinea());
  }

  protected quitarLinea(i: number): void {
    this.lineas.removeAt(i);
  }

  protected esLineaNueva(g: FormGroup): boolean {
    return g.controls['idLinea'].value === null;
  }

  private crearLinea(l?: LineaEditable): FormGroup {
    return this.fb.group({
      idLinea: this.fb.control<number | null>(l?.idLinea ?? null),
      ejercicio: [l?.ejercicio ?? ''],
      idEjercicio: [l ? String(l.idEjercicio) : '', Validators.required],
      dia: [l?.dia ?? '', Validators.required],
      series: this.fb.control<number | null>(l?.series ?? 3, [Validators.required, Validators.min(1), Validators.max(20)]),
      repeticiones: this.fb.control<number | null>(l?.repeticiones ?? 10, [Validators.required, Validators.min(1), Validators.max(100)]),
      descanso: this.fb.control<number | null>(l ? l.descansoSeg : 60, [Validators.min(0), Validators.max(600)]),
    });
  }

  protected guardar(): void {
    const rutina = this.editando();
    if (!rutina) return;
    if (this.lineas.length === 0) {
      this.aviso.set({ tipo: 'error', texto: 'Deja al menos un ejercicio en la rutina.' });
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();
    const lineas: LineaEditable[] = v.lineas.map((l: Record<string, unknown>) => {
      const idEjercicio = Number(l['idEjercicio']);
      return {
        idLinea: (l['idLinea'] as number | null) ?? null,
        idEjercicio,
        ejercicio: this.catalogo().find((e) => e.id === idEjercicio)?.nombre ?? String(l['ejercicio']),
        dia: l['dia'] as DiaSemana,
        series: l['series'] as number,
        repeticiones: l['repeticiones'] as number,
        descansoSeg: (l['descanso'] as number | null) ?? null,
      };
    });

    this.guardando.set(true);
    this.aviso.set(null);
    this.servicio
      .guardar(rutina, { nombre: v.nombre, descripcion: v.descripcion, lineas }, this.originales)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.guardando.set(false);
          this.editando.set(null);
          this.aviso.set({ tipo: 'ok', texto: `Rutina «${v.nombre.trim()}» actualizada.` });
          this.cargar(false);
        },
        error: (error: unknown) => {
          // Pudieron aplicarse algunos cambios: se cierra el editor para no repetirlos y se recarga la lista.
          this.guardando.set(false);
          this.editando.set(null);
          this.aviso.set({ tipo: 'error', texto: `${this.mensajeGuardar(error)} Abre la rutina de nuevo para ver cómo quedó.` });
          this.cargar(false);
        },
      });
  }

  // ── desactivar ──
  protected pedirDesactivar(r: RutinaDelEntrenador): void {
    this.confirmandoId.set(r.id);
    this.aviso.set(null);
  }

  protected descartarDesactivar(): void {
    this.confirmandoId.set(null);
  }

  protected desactivar(r: RutinaDelEntrenador): void {
    this.confirmandoId.set(null);
    this.ocupado.set(r.id);
    this.aviso.set(null);
    this.servicio
      .desactivar(r)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.ocupado.set(null);
          this.aviso.set({ tipo: 'ok', texto: `Rutina «${r.nombre}» desactivada: ${r.cliente} ya no la ve.` });
          this.cargar(false);
        },
        error: (error: unknown) => {
          this.ocupado.set(null);
          this.aviso.set({ tipo: 'error', texto: this.mensajeGuardar(error) });
        },
      });
  }

  private mensajeGuardar(error: unknown): string {
    if (error instanceof Error && error.message === RUTINA_AJENA) return 'Esa rutina no es tuya: no puedes modificarla.';
    if (error instanceof HttpErrorResponse && error.status === 404) return 'Esa rutina ya no existe. Actualiza la lista.';
    return mensajeDeGuardado(error);
  }
}
