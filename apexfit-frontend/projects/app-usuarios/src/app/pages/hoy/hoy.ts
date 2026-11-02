import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
  WritableSignal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable } from 'rxjs';
import { RouterLink } from '@angular/router';
import { AuthService } from 'shared';
import { Carga } from '../../data/carga';
import { mensajeDeError } from '../../data/errores';
import { planDeHoy } from '../../data/hoy';
import { EstadoMembresia } from '../../data/membresias.mapper';
import { MembresiasService } from '../../data/membresias.service';
import { armarVistaMembresia } from '../../data/membresias.vista';
import { iniciales, Perfil, primerNombre } from '../../data/perfil';
import { PerfilService } from '../../data/perfil.service';
import { diaDeHoy, ETIQUETA_DIA, RutinaActiva } from '../../data/rutinas.models';
import { RutinasService } from '../../data/rutinas.service';

@Component({
  selector: 'app-hoy',
  imports: [RouterLink],
  templateUrl: './hoy.html',
  styleUrl: './hoy.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Hoy {
  protected readonly auth = inject(AuthService);
  private readonly perfiles = inject(PerfilService);
  private readonly rutinas = inject(RutinasService);
  private readonly membresias = inject(MembresiasService);
  private readonly destroyRef = inject(DestroyRef);

  /** Cada bloque carga por separado: si uno falla, los otros se siguen mostrando. */
  protected readonly perfil = signal<Carga<Perfil>>({ tipo: 'cargando' });
  protected readonly rutina = signal<Carga<RutinaActiva | null>>({ tipo: 'cargando' });
  protected readonly membresia = signal<Carga<EstadoMembresia>>({ tipo: 'cargando' });

  protected readonly dia = ETIQUETA_DIA[diaDeHoy()];
  protected readonly correo = computed(() => this.auth.session()?.correo ?? '');

  protected readonly nombre = computed(() => {
    const p = this.perfil();
    return p.tipo === 'listo' ? primerNombre(p.datos.nombre) : '';
  });

  protected readonly iniciales = computed(() => {
    const p = this.perfil();
    return p.tipo === 'listo'
      ? iniciales(p.datos.nombre, p.datos.apellido)
      : this.correo().slice(0, 2).toUpperCase();
  });

  protected readonly plan = computed(() => {
    const r = this.rutina();
    return r.tipo === 'listo' ? planDeHoy(r.datos, diaDeHoy()) : null;
  });

  protected readonly vistaMembresia = computed(() => {
    const m = this.membresia();
    return m.tipo === 'listo' ? armarVistaMembresia(m.datos) : null;
  });

  constructor() {
    this.cargarPerfil();
    this.cargarRutina();
    this.cargarMembresia();
  }

  protected cargarPerfil(): void {
    this.leer(() => this.perfiles.perfil(), this.perfil, 'tu perfil');
  }

  protected cargarRutina(): void {
    this.leer(() => this.rutinas.rutinaActiva(), this.rutina, 'tu rutina');
  }

  protected cargarMembresia(): void {
    this.leer(() => this.membresias.estado(), this.membresia, 'tu membresía');
  }

  private leer<T>(fuente: () => Observable<T>, destino: WritableSignal<Carga<T>>, queCarga: string) {
    destino.set({ tipo: 'cargando' });
    fuente()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (datos) => destino.set({ tipo: 'listo', datos }),
        error: (error: unknown) =>
          destino.set({ tipo: 'error', mensaje: mensajeDeError(error, queCarga) }),
      });
  }
}
