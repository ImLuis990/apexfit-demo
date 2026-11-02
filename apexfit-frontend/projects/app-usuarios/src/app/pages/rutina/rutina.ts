import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { mensajeDeError } from '../../data/errores';
import { RutinaActiva, diaDeHoy } from '../../data/rutinas.models';
import { RutinasService } from '../../data/rutinas.service';

type Estado =
  | { tipo: 'cargando' }
  | { tipo: 'error'; mensaje: string }
  | { tipo: 'vacia' }
  | { tipo: 'lista'; rutina: RutinaActiva };

@Component({
  selector: 'app-rutina',
  templateUrl: './rutina.html',
  styleUrl: './rutina.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Rutina {
  private readonly rutinas = inject(RutinasService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly estado = signal<Estado>({ tipo: 'cargando' });
  protected readonly hoy = diaDeHoy();

  constructor() {
    this.cargar();
  }

  protected cargar(): void {
    this.estado.set({ tipo: 'cargando' });
    this.rutinas
      .rutinaActiva()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (rutina) => this.estado.set(rutina ? { tipo: 'lista', rutina } : { tipo: 'vacia' }),
        error: (error: unknown) =>
          this.estado.set({ tipo: 'error', mensaje: mensajeDeError(error, 'tu rutina') }),
      });
  }
}
