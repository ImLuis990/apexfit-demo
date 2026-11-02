import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Asistencia, AsistenciasService } from '../../data/asistencias.service';
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
  protected readonly total = computed(() => {
    const e = this.estado();
    return e.tipo === 'listo' ? e.datos.length : 0;
  });
  protected readonly fecha = fechaCompleta;

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
          this.estado.set({ tipo: 'error', mensaje: mensajeDeError(error, 'tu historial de asistencia') }),
      });
  }
}
