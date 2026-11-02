import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, ElementRef, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { armarTablero, opcionesParaEntrenador } from '../../data/asignaciones.mapper';
import { ClienteDeEntrenador, OpcionesCliente, TABLERO_VACIO } from '../../data/asignaciones.models';
import { AsignacionesService, DatosAsignaciones } from '../../data/asignaciones.service';
import { Carga } from '../../data/carga';
import { ConfiguracionService } from '../../data/configuracion.service';
import { mensajeDeError, mensajeDeGuardado } from '../../data/errores';
import { fechaCompleta } from '../../data/formato';
import { InactivosService } from '../../data/inactivos.service';
import { Usuario } from '../../data/usuarios.models';
import { TAMANO_PAGINA } from '../../data/usuarios.service';

const SIN_OPCIONES: OpcionesCliente = { libres: [], conOtros: [] };

const sinTildes = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

/** Administrador: qué entrenador atiende a cada cliente. Sin esto, «Mis clientes» del entrenador sale vacío. */
@Component({
  selector: 'app-asignaciones',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './asignaciones.html',
  styleUrl: './asignaciones.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Asignaciones {
  private readonly servicio = inject(AsignacionesService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly inactivosService = inject(InactivosService);
  private readonly configuracion = inject(ConfiguracionService);
  private inactivosListos = false;

  protected readonly fecha = fechaCompleta;
  protected readonly tamanoPagina = TAMANO_PAGINA;

  protected readonly carga = signal<Carga<DatosAsignaciones>>({ tipo: 'cargando' });
  /** El entrenador elegido en la lista; mientras no se elija ninguno se muestra el primero. */
  protected readonly elegido = signal<number | null>(null);
  protected readonly confirmandoId = signal<number | null>(null);
  /** El cliente al que se le está asignando o quitando entrenador (bloquea los botones mientras tanto). */
  protected readonly ocupado = signal<number | null>(null);
  protected readonly aviso = signal<{ tipo: 'ok' | 'error'; texto: string } | null>(null);
  /** Lo que se escribe en el buscador del selector de clientes. */
  protected readonly busqueda = signal('');
  /** Clientes que la pantalla Inactividad marca hoy (se calcula una vez por visita, con sus mismos días). */
  protected readonly inactivos = signal<ReadonlySet<number>>(new Set());
  protected readonly dias = signal(this.configuracion.dias());
  protected readonly avisoDias = this.configuracion.aviso;
  protected get diasInactividad(): number {
    return this.dias();
  }
  private readonly botonAsignar = viewChild<ElementRef<HTMLButtonElement>>('botonAsignar');

  protected readonly form = this.fb.group({ idCliente: ['', Validators.required] });
  private readonly clienteElegido = toSignal(this.form.controls.idCliente.valueChanges, { initialValue: '' });

  protected readonly tablero = computed(() => {
    const c = this.carga();
    return c.tipo === 'listo' ? armarTablero(c.datos.asignaciones, c.datos.usuarios) : TABLERO_VACIO;
  });

  protected readonly actual = computed(() => {
    const { entrenadores } = this.tablero();
    return entrenadores.find((f) => f.entrenador.id === this.elegido()) ?? entrenadores[0] ?? null;
  });

  protected readonly opciones = computed<OpcionesCliente>(() => {
    const c = this.carga();
    const a = this.actual();
    return c.tipo === 'listo' && a
      ? opcionesParaEntrenador(a.entrenador.id, c.datos.asignaciones, c.datos.usuarios)
      : SIN_OPCIONES;
  });

  /** Si el cliente elegido ya tiene otro entrenador, quién es (para avisar que tendrá dos). */
  protected readonly yaConOtros = computed(() => {
    const id = Number(this.clienteElegido());
    return id ? (this.opciones().conOtros.find((o) => o.cliente.id === id)?.entrenadores ?? null) : null;
  });

  /** Las opciones del selector que coinciden con el buscador (el cliente ya elegido nunca desaparece). */
  protected readonly opcionesVisibles = computed<OpcionesCliente>(() => {
    const todas = this.opciones();
    const q = sinTildes(this.busqueda().trim());
    if (!q) return todas;
    const elegido = Number(this.clienteElegido());
    const coincide = (u: Usuario) => u.id === elegido || sinTildes(`${u.nombreCompleto} ${u.correo}`).includes(q);
    return { libres: todas.libres.filter(coincide), conOtros: todas.conOtros.filter((o) => coincide(o.cliente)) };
  });

  constructor() {
    this.cargar();
  }

  protected cargar(mostrarCarga = true): void {
    if (mostrarCarga) {
      this.carga.set({ tipo: 'cargando' });
      this.inactivosListos = false;
    }
    this.configuracion.obtenerDiasInactividad().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((d) => this.dias.set(d));
    this.servicio
      .listar()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (datos) => {
          this.carga.set({ tipo: 'listo', datos });
          this.cargarInactivos(datos.usuarios);
        },
        error: (error: unknown) =>
          this.carga.set({ tipo: 'error', mensaje: mensajeDeError(error, 'las asignaciones') }),
      });
  }

  protected elegir(idEntrenador: number): void {
    this.elegido.set(idEntrenador);
    this.busqueda.set('');
    this.confirmandoId.set(null);
    this.aviso.set(null);
    this.form.reset({ idCliente: '' });
  }

  // ── asignar ──
  protected asignarElegido(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.asignar(Number(this.form.controls.idCliente.value));
  }

  protected asignar(idCliente: number): void {
    const c = this.carga();
    const a = this.actual();
    if (c.tipo !== 'listo' || !a) return;

    const entrenador = a.entrenador.nombreCompleto;
    const cliente = this.nombreDe(idCliente);
    const otros = this.opciones().conOtros.find((o) => o.cliente.id === idCliente)?.entrenadores ?? [];
    this.ocupado.set(idCliente);
    this.aviso.set(null);

    this.servicio
      .asignar(a.entrenador.id, idCliente, c.datos.asignaciones)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.ocupado.set(null);
          this.form.reset({ idCliente: '' });
          const tambien = otros.length > 0 ? ` También sigue con ${otros.join(', ')}.` : '';
          this.aviso.set({ tipo: 'ok', texto: `${cliente} ahora es cliente de ${entrenador}.${tambien}` });
          this.cargar(false);
        },
        error: (error: unknown) => {
          this.ocupado.set(null);
          // Un rechazo al asignar casi siempre es que otro administrador ya lo asignó: se recarga para verlo.
          const yaAsignado = error instanceof HttpErrorResponse && (error.status === 400 || error.status === 409);
          this.aviso.set({
            tipo: 'error',
            texto: yaAsignado ? `${cliente} ya está asignado a ${entrenador}. Actualicé la lista.` : this.mensajeGuardar(error),
          });
          if (yaAsignado) this.cargar(false);
        },
      });
  }

  protected valor(evento: Event): string {
    return (evento.target as HTMLInputElement | HTMLSelectElement).value;
  }

  /** Al elegir un cliente el foco pasa al botón Asignar: basta con pulsar Enter o Espacio. */
  protected alElegirCliente(evento: Event): void {
    if (this.valor(evento)) this.botonAsignar()?.nativeElement.focus();
  }

  /** Texto de una opción del selector, con «Inactivo» si corresponde. */
  protected textoCliente(u: Usuario, conOtros?: string[]): string {
    const base = conOtros ? u.nombreCompleto : `${u.nombreCompleto} · ${u.correo}`;
    return base + (this.inactivos().has(u.id) ? ' · Inactivo' : '') + (conOtros ? ` · con ${conOtros.join(', ')}` : '');
  }

  private cargarInactivos(usuarios: Usuario[]): void {
    if (this.inactivosListos) return;
    this.inactivosListos = true;
    this.inactivosService
      .ids(usuarios)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((ids) => this.inactivos.set(new Set(ids)));
  }

  // ── quitar ──
  protected pedirConfirmacion(fila: ClienteDeEntrenador): void {
    this.confirmandoId.set(fila.asignacion.id);
    this.aviso.set(null);
  }

  protected descartarConfirmacion(): void {
    this.confirmandoId.set(null);
  }

  protected quitar(fila: ClienteDeEntrenador): void {
    const c = this.carga();
    const a = this.actual();
    if (c.tipo !== 'listo' || !a) return;

    const entrenador = a.entrenador.nombreCompleto;
    this.confirmandoId.set(null);
    this.ocupado.set(fila.idCliente);
    this.aviso.set(null);

    this.servicio
      .quitar(fila.asignacion, c.datos.asignaciones)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.ocupado.set(null);
          this.aviso.set({ tipo: 'ok', texto: `${fila.nombre} ya no es cliente de ${entrenador}.` });
          this.cargar(false);
        },
        error: (error: unknown) => {
          this.ocupado.set(null);
          this.aviso.set({ tipo: 'error', texto: this.mensajeGuardar(error) });
        },
      });
  }

  private nombreDe(idCliente: number): string {
    const c = this.carga();
    return (c.tipo === 'listo' && c.datos.usuarios.find((u) => u.id === idCliente)?.nombreCompleto) || `Cliente #${idCliente}`;
  }

  private mensajeGuardar(error: unknown): string {
    if (error instanceof HttpErrorResponse && error.status === 404) {
      return 'Ese entrenador, ese cliente o esa asignación ya no existe. Actualiza la lista.';
    }
    return mensajeDeGuardado(error);
  }
}
