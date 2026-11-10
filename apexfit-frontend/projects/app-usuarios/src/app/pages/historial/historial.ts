import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  Asistencia,
  AsistenciasService,
  formatearDuracion,
} from '../../data/asistencias.service';
import { Carga } from '../../data/carga';
import { mensajeDeError } from '../../data/errores';
import { fechaCompleta } from '../../data/formato';

@Component({
  selector: 'app-historial',
  templateUrl: './historial.html',
  styleUrl: './historial.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Historial {
  private readonly asistencias = inject(AsistenciasService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly estado = signal<Carga<Asistencia[]>>({ tipo: 'cargando' });
  protected readonly registrandoSalida = signal<number | null>(null); // id de asistencia en proceso

  protected readonly total = computed(() => {
    const e = this.estado();
    return e.tipo === 'listo' ? e.datos.length : 0;
  });

  protected readonly fecha = fechaCompleta;
  protected readonly duracion = formatearDuracion;

  constructor() {
    this.cargar();
  }

  protected cargar(): void {
    this.estado.set({ tipo: 'cargando' });
    this.asistencias
      .historial()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (datos) => this.estado.set({ tipo: 'listo', datos }),
        error: (error: unknown) =>
          this.estado.set({
            tipo: 'error',
            mensaje: mensajeDeError(error, 'tu historial de asistencia'),
          }),
      });
  }

  protected registrarSalida(a: Asistencia): void {
    this.registrandoSalida.set(a.id);
    this.asistencias
      .registrarSalida(a.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (actualizada) => {
          this.registrandoSalida.set(null);
          // Actualizar solo ese registro en la lista
          const e = this.estado();
          if (e.tipo === 'listo') {
            const datos = e.datos.map((x) => (x.id === actualizada.id ? actualizada : x));
            this.estado.set({ tipo: 'listo', datos });
          }
        },
        error: () => {
          this.registrandoSalida.set(null);
        },
      });
  }
}
