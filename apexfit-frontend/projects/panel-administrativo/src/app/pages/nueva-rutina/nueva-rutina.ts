import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormArray, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { forkJoin } from 'rxjs';
import { Carga } from '../../data/carga';
import { ClientesService } from '../../data/clientes.service';
import { mensajeDeError } from '../../data/errores';
import {
  DIAS,
  DiaSemana,
  EjercicioCatalogo,
  NuevaRutina,
  ResultadoAsignacion,
} from '../../data/rutinas.models';
import { RutinasService } from '../../data/rutinas.service';

interface ClienteOpcion {
  idCliente: number;
  nombre: string;
  correo: string;
}

interface Datos {
  clientes: ClienteOpcion[];
  ejercicios: EjercicioCatalogo[];
}

interface FilaResultado {
  nombre: string;
  tipo: 'ok' | 'aviso' | 'error';
  texto: string;
}

@Component({
  selector: 'app-nueva-rutina',
  imports: [ReactiveFormsModule],
  templateUrl: './nueva-rutina.html',
  styleUrl: './nueva-rutina.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NuevaRutinaPagina {
  private readonly clientes = inject(ClientesService);
  private readonly rutinas = inject(RutinasService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly route = inject(ActivatedRoute);

  protected readonly dias = DIAS;
  protected readonly carga = signal<Carga<Datos>>({ tipo: 'cargando' });
  protected readonly seleccion = signal<ReadonlySet<number>>(new Set());
  protected readonly intentado = signal(false);
  protected readonly enviando = signal(false);
  protected readonly resultados = signal<FilaResultado[] | null>(null);
  protected readonly errorGeneral = signal<string | null>(null);
  protected readonly exito = signal(false);

  protected readonly form = this.fb.group({
    nombre: ['', [Validators.required, Validators.maxLength(100)]],
    descripcion: ['', Validators.maxLength(500)],
    lineas: this.fb.array([this.nuevaLinea()]),
  });

  protected readonly sinClientes = computed(() => {
    const c = this.carga();
    return c.tipo === 'listo' && c.datos.clientes.length === 0;
  });

  protected readonly sinEjercicios = computed(() => {
    const c = this.carga();
    return c.tipo === 'listo' && c.datos.ejercicios.length === 0;
  });

  constructor() {
    this.cargar();
  }

  protected get lineas(): FormArray {
    return this.form.controls.lineas as unknown as FormArray;
  }

  private nuevaLinea() {
    return this.fb.group({
      dia: ['', Validators.required],
      idEjercicio: ['', Validators.required],
      series: this.fb.control<number | null>(3, [Validators.required, Validators.min(1), Validators.max(20)]),
      repeticiones: this.fb.control<number | null>(10, [Validators.required, Validators.min(1), Validators.max(100)]),
      descanso: this.fb.control<number | null>(60, [Validators.min(0), Validators.max(600)]),
    });
  }

  protected cargar(): void {
    this.carga.set({ tipo: 'cargando' });
    forkJoin({ clientes: this.clientes.asignados(), ejercicios: this.rutinas.ejercicios() })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (datos) => {
          this.carga.set({ tipo: 'listo', datos });
          // Si se llegó desde "Nueva rutina" de un cliente, ya viene elegido.
          const id = Number(this.route.snapshot.queryParamMap.get('cliente'));
          if (id && datos.clientes.some((c) => c.idCliente === id)) this.seleccion.set(new Set([id]));
        },
        error: (error: unknown) => this.carga.set({ tipo: 'error', mensaje: mensajeDeError(error, 'los datos') }),
      });
  }

  protected alternarCliente(id: number, marcado: boolean): void {
    this.seleccion.update((actual) => {
      const nuevo = new Set(actual);
      if (marcado) nuevo.add(id);
      else nuevo.delete(id);
      return nuevo;
    });
  }

  protected agregarLinea(): void {
    this.lineas.push(this.nuevaLinea());
  }

  protected quitarLinea(indice: number): void {
    if (this.lineas.length > 1) this.lineas.removeAt(indice);
  }

  protected enviar(): void {
    this.intentado.set(true);
    if (this.form.invalid || this.seleccion().size === 0) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();
    const plan: NuevaRutina = {
      nombre: v.nombre.trim(),
      descripcion: v.descripcion.trim() || null,
      lineas: v.lineas.map((l: { dia: string; idEjercicio: string; series: number | null; repeticiones: number | null; descanso: number | null }) => ({
        idEjercicio: Number(l.idEjercicio),
        dia: l.dia as DiaSemana,
        series: l.series as number,
        repeticiones: l.repeticiones as number,
        descansoSeg: l.descanso ?? null,
      })),
    };
    const ids = [...this.seleccion()];

    this.enviando.set(true);
    this.errorGeneral.set(null);
    this.resultados.set(null);
    this.exito.set(false);

    this.rutinas
      .asignar(plan, ids)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => this.terminar(res),
        error: () => {
          this.enviando.set(false);
          this.errorGeneral.set('No pudimos asignar la rutina. Intenta de nuevo.');
        },
      });
  }

  private terminar(res: ResultadoAsignacion[]): void {
    this.enviando.set(false);
    const fallidos = res.filter((r) => !r.ok);

    this.resultados.set(
      res.map((r) => ({
        nombre: this.nombreDe(r.idCliente),
        tipo: !r.ok ? 'error' : r.advertencia ? 'aviso' : 'ok',
        texto: !r.ok
          ? 'No se pudo guardar la rutina. No quedó nada a medias.'
          : (r.advertencia ?? 'Rutina asignada.'),
      })),
    );

    if (fallidos.length === 0) {
      // Todo salió bien: se limpia el formulario.
      this.exito.set(true);
      this.seleccion.set(new Set());
      this.intentado.set(false);
      this.form.reset({ nombre: '', descripcion: '' });
      while (this.lineas.length > 1) this.lineas.removeAt(1);
      this.lineas.at(0).reset({ dia: '', idEjercicio: '', series: 3, repeticiones: 10, descanso: 60 });
    } else {
      // Quedan marcados solo los que fallaron, para reintentar sin repetir a los demás.
      this.seleccion.set(new Set(fallidos.map((f) => f.idCliente)));
    }
  }

  private nombreDe(id: number): string {
    const c = this.carga();
    return (c.tipo === 'listo' && c.datos.clientes.find((x) => x.idCliente === id)?.nombre) || `Cliente #${id}`;
  }
}
