import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from 'shared';
import { Carga } from '../../data/carga';
import { mensajeDeError } from '../../data/errores';
import { EstadoMembresia } from '../../data/membresias.mapper';
import { MembresiasService } from '../../data/membresias.service';
import { armarVistaMembresia } from '../../data/membresias.vista';
import { dibujarQr, textoQr } from '../../data/qr';

@Component({
  selector: 'app-mi-qr',
  templateUrl: './mi-qr.html',
  styleUrl: './mi-qr.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MiQr {
  private readonly auth = inject(AuthService);
  private readonly membresias = inject(MembresiasService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly membresia = signal<Carga<EstadoMembresia>>({ tipo: 'cargando' });

  protected readonly codigo = computed(() => {
    const s = this.auth.session();
    return s ? textoQr(s.id, s.correo) : null;
  });

  protected readonly qr = computed(() => {
    const texto = this.codigo();
    return texto ? dibujarQr(texto) : null;
  });

  protected readonly vista = computed(() => {
    const m = this.membresia();
    return m.tipo === 'listo' ? armarVistaMembresia(m.datos) : null;
  });

  constructor() {
    this.cargarMembresia();
  }

  protected cargarMembresia(): void {
    this.membresia.set({ tipo: 'cargando' });
    this.membresias
      .estado()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (datos) => this.membresia.set({ tipo: 'listo', datos }),
        error: (error: unknown) =>
          this.membresia.set({ tipo: 'error', mensaje: mensajeDeError(error, 'tu membresía') }),
      });
  }
}
