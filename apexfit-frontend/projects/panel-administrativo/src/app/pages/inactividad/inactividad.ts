import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';
import { Asistencia } from '../../data/asistencias.models';
import { AsistenciasService } from '../../data/asistencias.service';
import { Carga } from '../../data/carga';
import { ConfiguracionService } from '../../data/configuracion.service';
import { mensajeDeError } from '../../data/errores';
import { fechaCompleta, hoyIso } from '../../data/formato';
import { MAX_DIAS, MIN_DIAS, normalizarDias } from '../../data/inactividad.config';
import { Membresia } from '../../data/membresias.models';
import { MembresiasService } from '../../data/membresias.service';
import { inactivos } from '../../data/resumen.mapper';
import { Usuario } from '../../data/usuarios.models';
import { UsuariosService } from '../../data/usuarios.service';

interface Datos {
  asistencias: Asistencia[];
  usuarios: Usuario[];
  membresias: Membresia[];
}

@Component({
  selector: 'app-inactividad',
  templateUrl: './inactividad.html',
  styleUrl: './inactividad.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InactividadPagina {
  private readonly asistencias = inject(AsistenciasService);
  private readonly usuarios = inject(UsuariosService);
  private readonly membresias = inject(MembresiasService);
  private readonly configuracion = inject(ConfiguracionService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly hoy = hoyIso();
  protected readonly fecha = fechaCompleta;
  protected readonly minDias = MIN_DIAS;
  protected readonly maxDias = MAX_DIAS;
  protected readonly dias = signal(this.configuracion.dias());
  protected readonly avisoDias = this.configuracion.aviso;
  protected readonly errorGuardado = signal<string | null>(null);
  protected readonly carga = signal<Carga<Datos>>({ tipo: 'cargando' });

  /** Clientes activos con membresía vigente que llevan más de `dias` sin asistir (o que nunca han asistido). */
  protected readonly filas = computed(() => {
    const c = this.carga();
    if (c.tipo !== 'listo') return [];
    const { asistencias, usuarios, membresias } = c.datos;
    const correos = new Map(usuarios.map((u) => [u.id, u.correo]));
    return inactivos(usuarios, membresias, asistencias, this.hoy, this.dias()).map((f) => ({
      ...f,
      correo: correos.get(f.idUsuario) ?? '',
    }));
  });

  constructor() {
    this.cargar();
  }

  protected cargar(): void {
    this.carga.set({ tipo: 'cargando' });
    forkJoin({
      asistencias: this.asistencias.listar(),
      usuarios: this.usuarios.listar(),
      membresias: this.membresias.listar(),
      dias: this.configuracion.obtenerDiasInactividad(),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ asistencias, usuarios, membresias, dias }) => {
          this.dias.set(dias);
          this.carga.set({ tipo: 'listo', datos: { asistencias, usuarios: usuarios.usuarios, membresias } });
        },
        error: (error: unknown) => this.carga.set({ tipo: 'error', mensaje: mensajeDeError(error, 'la inactividad') }),
      });
  }

  protected cambiarDias(campo: HTMLInputElement): void {
    const dias = normalizarDias(campo.value);
    campo.value = String(dias); // si escribió algo inválido, el campo vuelve al valor aceptado
    const anterior = this.dias();
    this.dias.set(dias);
    this.errorGuardado.set(null);
    this.configuracion
      .guardarDiasInactividad(dias)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (guardado) => this.dias.set(guardado),
        error: () => {
          // El servidor no lo guardó: la pantalla vuelve al valor que sí está vigente.
          this.dias.set(anterior);
          campo.value = String(anterior);
          this.errorGuardado.set(`No se pudo guardar en el servidor. Se mantienen ${anterior} días.`);
        },
      });
  }
}
