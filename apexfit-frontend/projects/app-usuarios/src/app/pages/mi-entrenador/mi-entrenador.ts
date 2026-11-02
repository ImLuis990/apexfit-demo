import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { EntrenadorInfo } from '../../data/entrenador.models';
import { EntrenadorService } from '../../data/entrenador.service';

type Estado =
  | { tipo: 'cargando' }
  | { tipo: 'sin-entrenador' }
  | { tipo: 'error'; mensaje: string }
  | { tipo: 'ok'; entrenador: EntrenadorInfo };

@Component({
  selector: 'app-mi-entrenador',
  templateUrl: './mi-entrenador.html',
  styleUrl: './mi-entrenador.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MiEntrenador {
  private readonly svc = inject(EntrenadorService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly estado = signal<Estado>({ tipo: 'cargando' });

  /** Acceso tipado al entrenador cuando estado es 'ok' */
  protected readonly entrenador = computed<EntrenadorInfo | null>(() => {
    const e = this.estado();
    return e.tipo === 'ok' ? e.entrenador : null;
  });

  /** Mensaje de error cuando estado es 'error' */
  protected readonly errorMsg = computed<string>(() => {
    const e = this.estado();
    return e.tipo === 'error' ? e.mensaje : '';
  });

  constructor() {
    this.cargar();
  }

  protected cargar(): void {
    this.estado.set({ tipo: 'cargando' });
    this.svc
      .miEntrenador()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          if (!data) {
            this.estado.set({ tipo: 'sin-entrenador' });
          } else {
            this.estado.set({ tipo: 'ok', entrenador: data });
          }
        },
        error: (err: unknown) => {
          if (err instanceof HttpErrorResponse && err.status === 204) {
            this.estado.set({ tipo: 'sin-entrenador' });
          } else {
            this.estado.set({ tipo: 'error', mensaje: 'No pudimos cargar los datos de tu entrenador. Intenta de nuevo.' });
          }
        },
      });
  }

  protected iniciales(e: EntrenadorInfo): string {
    return ((e.nombre?.[0] ?? '') + (e.apellido?.[0] ?? '')).toUpperCase();
  }

  protected mailtoLink(correo: string): string {
    return `mailto:${correo}`;
  }

  protected telLink(tel: string): string {
    return `tel:${tel.replace(/\s/g, '')}`;
  }
}
