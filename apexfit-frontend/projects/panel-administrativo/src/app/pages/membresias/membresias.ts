import { toSignal } from '@angular/core/rxjs-interop';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  Injector,
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
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { Carga } from '../../data/carga';
import { mensajeDeError, mensajeDeGuardado } from '../../data/errores';
import { dinero, fechaCompleta, hoyIso } from '../../data/formato';
import {
  buscarPlan,
  contarPorEstado,
  estadoEfectivo,
  fechaFinDePlan,
  filtrar,
  inicioDeRenovacion,
} from '../../data/membresias.mapper';
import {
  DatosMembresia,
  EstadoEfectivo,
  ETIQUETA_ESTADO,
  Membresia,
  PLANES,
} from '../../data/membresias.models';
import { MembresiasService } from '../../data/membresias.service';
import { Usuario } from '../../data/usuarios.models';
import { UsuariosService } from '../../data/usuarios.service';

interface Datos {
  membresias: Membresia[];
  usuarios: Usuario[];
}

interface Fila {
  m: Membresia;
  cliente: string;
  correo: string;
  buscable: string;
  estado: EstadoEfectivo;
  diasRestantes: number;
}

type Modo = 'crear' | 'editar' | 'renovar';

const FILTROS: { valor: EstadoEfectivo | 'todas'; etiqueta: string }[] = [
  { valor: 'todas', etiqueta: 'Todas' },
  { valor: 'activa', etiqueta: 'Activas' },
  { valor: 'por-vencer', etiqueta: 'Por vencer' },
  { valor: 'vencida', etiqueta: 'Vencidas' },
  { valor: 'cancelada', etiqueta: 'Canceladas' },
];

/** La membresía no puede terminar antes de empezar. */
function finDespuesDeInicio(grupo: AbstractControl): ValidationErrors | null {
  const inicio = grupo.get('fechaInicio')?.value as string;
  const fin = grupo.get('fechaFin')?.value as string;
  return inicio && fin && fin < inicio ? { finAntesDeInicio: true } : null;
}

@Component({
  selector: 'app-membresias',
  imports: [ReactiveFormsModule],
  templateUrl: './membresias.html',
  styleUrl: './membresias.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Membresias {
  private readonly membresias = inject(MembresiasService);
  private readonly usuarios = inject(UsuariosService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly planes = PLANES;
  protected readonly filtros = FILTROS;
  protected readonly etiquetaEstado = ETIQUETA_ESTADO;
  protected readonly dinero = dinero;
  protected readonly fecha = fechaCompleta;
  protected readonly hoy = hoyIso();

  protected readonly carga = signal<Carga<Datos>>({ tipo: 'cargando' });
  protected readonly texto = signal('');
  protected readonly filtroEstado = signal<EstadoEfectivo | 'todas'>('todas');

  protected readonly modo = signal<Modo | null>(null);
  protected readonly editando = signal<Membresia | null>(null);
  protected readonly confirmandoId = signal<number | null>(null);
  protected readonly guardando = signal(false);
  protected readonly aviso = signal<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  protected readonly form = this.fb.group(
    {
      idUsuario: ['', Validators.required],
      plan: ['Mensual', Validators.required],
      fechaInicio: [hoyIso(), Validators.required],
      fechaFin: ['', Validators.required],
      precio: this.fb.control<number | null>(null, [Validators.required, Validators.min(1)]),
      estado: ['activa'],
    },
    { validators: finDespuesDeInicio },
  );

  /** Mientras se crea o renueva, el plan rellena el precio y la fecha de fin (se pueden cambiar a mano). */
  private autoCalculo = false;

  private readonly clienteElegido = toSignal(this.form.controls.idUsuario.valueChanges, { initialValue: '' });

  protected readonly filas = computed<Fila[]>(() => {
    const c = this.carga();
    if (c.tipo !== 'listo') return [];
    const porId = new Map(c.datos.usuarios.map((u) => [u.id, u]));
    return c.datos.membresias.map((m) => {
      const u = porId.get(m.idUsuario);
      const e = estadoEfectivo(m, this.hoy);
      const cliente = u?.nombreCompleto ?? `Usuario #${m.idUsuario}`;
      const correo = u?.correo ?? '';
      return { m, cliente, correo, buscable: `${cliente} ${correo}`, estado: e.estado, diasRestantes: e.diasRestantes };
    });
  });

  protected readonly conteos = computed(() => {
    const c = this.carga();
    return contarPorEstado(c.tipo === 'listo' ? c.datos.membresias : [], this.hoy);
  });

  protected readonly visibles = computed(() =>
    filtrar(this.filas(), { texto: this.texto(), estado: this.filtroEstado() }, this.hoy),
  );

  /** Los clientes activos que se pueden elegir al crear una membresía. */
  protected readonly clientes = computed(() => {
    const c = this.carga();
    return c.tipo === 'listo' ? c.datos.usuarios.filter((u) => u.rol === 'cliente' && u.activo) : [];
  });

  /** Opciones del plan: las del diseño y, si se edita una con otro nombre, esa también. */
  protected readonly opcionesPlan = computed(() => {
    const e = this.editando();
    const extra = e && !buscarPlan(e.tipo) ? [e.tipo] : [];
    return [...PLANES.map((p) => p.nombre), ...extra];
  });

  /** Aviso al crear: el cliente elegido ya tiene una membresía vigente. */
  protected readonly yaTieneVigente = computed(() => {
    if (this.modo() !== 'crear') return null;
    const id = Number(this.clienteElegido());
    if (!id) return null;
    const vigente = this.filas()
      .filter((f) => f.m.idUsuario === id && (f.estado === 'activa' || f.estado === 'por-vencer'))
      .sort((a, b) => b.m.fechaFin.localeCompare(a.m.fechaFin))[0];
    return vigente ? vigente.m.fechaFin : null;
  });

  constructor() {
    this.cargar();

    this.form.controls.plan.valueChanges.pipe(takeUntilDestroyed()).subscribe((nombre) => {
      const plan = buscarPlan(nombre);
      if (!this.autoCalculo || !plan) return;
      this.form.patchValue(
        { precio: plan.precio, fechaFin: fechaFinDePlan(plan, this.form.controls.fechaInicio.value) },
        { emitEvent: false },
      );
    });

    this.form.controls.fechaInicio.valueChanges.pipe(takeUntilDestroyed()).subscribe((inicio) => {
      const plan = buscarPlan(this.form.controls.plan.value);
      if (!this.autoCalculo || !plan || !inicio) return;
      this.form.patchValue({ fechaFin: fechaFinDePlan(plan, inicio) }, { emitEvent: false });
    });
  }

  protected cargar(mostrarCarga = true): void {
    if (mostrarCarga) this.carga.set({ tipo: 'cargando' });
    forkJoin({ membresias: this.membresias.listar(), usuarios: this.usuarios.listar() })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ membresias, usuarios }) =>
          this.carga.set({ tipo: 'listo', datos: { membresias, usuarios: usuarios.usuarios } }),
        error: (error: unknown) =>
          this.carga.set({ tipo: 'error', mensaje: mensajeDeError(error, 'las membresías') }),
      });
  }

  // ── filtros ──
  protected buscar(evento: Event): void {
    this.texto.set((evento.target as HTMLInputElement).value);
  }

  // ── formulario ──
  protected abrirCrear(): void {
    this.prepararForm('crear', null);
    const plan = PLANES[0];
    this.form.reset({
      idUsuario: '', plan: plan.nombre, fechaInicio: this.hoy,
      fechaFin: fechaFinDePlan(plan, this.hoy), precio: plan.precio, estado: 'activa',
    });
    this.autoCalculo = true;
    this.enfocarPrimerCampo();
  }

  protected abrirRenovar(fila: Fila): void {
    this.prepararForm('renovar', null);
    const plan = buscarPlan(fila.m.tipo) ?? PLANES[0];
    const inicio = inicioDeRenovacion(fila.m, this.hoy);
    this.form.reset({
      idUsuario: String(fila.m.idUsuario), plan: plan.nombre, fechaInicio: inicio,
      fechaFin: fechaFinDePlan(plan, inicio), precio: plan.precio, estado: 'activa',
    });
    this.form.controls.idUsuario.disable();
    this.autoCalculo = true;
    this.enfocarPrimerCampo();
  }

  protected abrirEditar(fila: Fila): void {
    this.prepararForm('editar', fila.m);
    this.form.reset({
      idUsuario: String(fila.m.idUsuario), plan: fila.m.tipo, fechaInicio: fila.m.fechaInicio,
      fechaFin: fila.m.fechaFin, precio: fila.m.precio,
      estado: fila.m.estado === 'cancelada' ? 'cancelada' : 'activa',
    });
    this.form.controls.idUsuario.disable();
    this.autoCalculo = false;
    this.enfocarPrimerCampo();
  }

  protected cerrarFormulario(): void {
    this.modo.set(null);
    this.editando.set(null);
  }

  private prepararForm(modo: Modo, editando: Membresia | null): void {
    this.modo.set(modo);
    this.editando.set(editando);
    this.confirmandoId.set(null);
    this.aviso.set(null);
    this.form.controls.idUsuario.enable();
  }

  private enfocarPrimerCampo(): void {
    afterNextRender(
      () => this.host.nativeElement.querySelector<HTMLElement>('form select, form input')?.focus(),
      { injector: this.injector },
    );
  }

  protected guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();
    const datos = {
      tipo: v.plan,
      fechaInicio: v.fechaInicio,
      fechaFin: v.fechaFin,
      precio: v.precio as number, // "required" garantiza que no es null
    };
    const original = this.editando();

    this.guardando.set(true);
    this.aviso.set(null);

    const peticion = original
      ? this.membresias.actualizar(original, { ...datos, estado: v.estado })
      : this.membresias.crear({ ...datos, idUsuario: Number(v.idUsuario) });

    const cliente = this.nombreDe(original ? original.idUsuario : Number(v.idUsuario));
    const modo = this.modo();

    peticion.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.guardando.set(false);
        this.cerrarFormulario();
        this.aviso.set({
          tipo: 'ok',
          texto:
            modo === 'editar'
              ? `Cambios guardados en la membresía de ${cliente}.`
              : modo === 'renovar'
                ? `Membresía de ${cliente} renovada.`
                : `Membresía creada para ${cliente}.`,
        });
        this.cargar(false);
      },
      error: (error: unknown) => {
        this.guardando.set(false);
        this.aviso.set({ tipo: 'error', texto: this.mensajeGuardar(error) });
      },
    });
  }

  // ── cancelar ──
  protected pedirConfirmacion(fila: Fila): void {
    this.confirmandoId.set(fila.m.id);
    this.aviso.set(null);
  }

  protected descartarConfirmacion(): void {
    this.confirmandoId.set(null);
  }

  protected cancelar(fila: Fila): void {
    this.confirmandoId.set(null);
    this.membresias
      .cancelar(fila.m)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.aviso.set({ tipo: 'ok', texto: `La membresía de ${fila.cliente} quedó cancelada.` });
          this.cargar(false);
        },
        error: (error: unknown) => this.aviso.set({ tipo: 'error', texto: this.mensajeGuardar(error) }),
      });
  }

  private nombreDe(idUsuario: number): string {
    const c = this.carga();
    return (c.tipo === 'listo' && c.datos.usuarios.find((u) => u.id === idUsuario)?.nombreCompleto) || `usuario #${idUsuario}`;
  }

  private mensajeGuardar(error: unknown): string {
    if (error instanceof HttpErrorResponse && error.status === 404) {
      return 'Esa membresía o ese cliente ya no existe. Actualiza la lista.';
    }
    return mensajeDeGuardado(error);
  }
}
