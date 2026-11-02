import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { Carga } from '../../data/carga';
import { AsistenciasService } from '../../data/asistencias.service';
import { Asistencia } from '../../data/asistencias.models';
import { deDia, estaAdentro } from '../../data/asistencias.mapper';
import { ConfiguracionService } from '../../data/configuracion.service';
import { DashboardService } from '../../data/dashboard.service';
import { DashboardResumenDto } from '../../data/dtos';
import { mensajeDeError } from '../../data/errores';
import { fechaCompleta, hoyIso, fechaCorta } from '../../data/formato';
import { Membresia } from '../../data/membresias.models';
import { MembresiasService } from '../../data/membresias.service';
import {
  aforoPorHora,
  clientesActivos,
  conMembresiaVigente,
  entradasPorHora,
  inactivos,
  porVencer,
} from '../../data/resumen.mapper';
import { Usuario } from '../../data/usuarios.models';
import { UsuariosService } from '../../data/usuarios.service';

interface Datos {
  dash: DashboardResumenDto | null;
  asistencias: Asistencia[];
  usuarios: Usuario[];
  membresias: Membresia[];
}

const MAX_FILAS = 5;

@Component({
  selector: 'app-resumen',
  imports: [RouterLink],
  templateUrl: './resumen.html',
  styleUrl: './resumen.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResumenPagina {
  private readonly dashboard = inject(DashboardService);
  private readonly asistencias = inject(AsistenciasService);
  private readonly usuarios = inject(UsuariosService);
  private readonly membresias = inject(MembresiasService);
  private readonly configuracion = inject(ConfiguracionService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly hoy = hoyIso();
  protected readonly fecha = fechaCompleta;
  protected readonly corta = fechaCorta;
  protected readonly maxFilas = MAX_FILAS;
  protected readonly dias = signal(this.configuracion.dias());
  protected readonly avisoDias = this.configuracion.aviso;
  /** Los días que el administrador configuró en la pantalla Inactividad (10 si no ha cambiado nada). */
  protected get diasInactividad(): number {
    return this.dias();
  }
  private readonly horaActual = new Date().getHours();

  protected readonly carga = signal<Carga<Datos>>({ tipo: 'cargando' });

  protected readonly ind = computed(() => {
    const c = this.carga();
    if (c.tipo !== 'listo') return null;
    const { dash, asistencias, usuarios, membresias } = c.datos;

    const deHoy = deDia(asistencias, this.hoy);
    const horas = entradasPorHora(deHoy);
    const maxHora = Math.max(1, ...horas.map((h) => h.cantidad));
    const pico = horas.reduce((a, b) => (b.cantidad > a.cantidad ? b : a), horas[0]);
    const venc = porVencer(usuarios, membresias, this.hoy);
    const inac = inactivos(usuarios, membresias, asistencias, this.hoy, this.dias());
    const aforo = aforoPorHora(deHoy, this.horaActual);
    const maxAforo = Math.max(1, ...aforo.map((h) => h.personas));
    const picoAforo = aforo.reduce((a, b) => (b.personas > a.personas ? b : a), aforo[0]);
    const resumenAforo =
      picoAforo.personas === 0
        ? 'Todavía no ha habido personas en el gimnasio hoy.'
        : `Pico de hoy: ${picoAforo.personas} ${picoAforo.personas === 1 ? 'persona' : 'personas'} a las ${String(picoAforo.hora).padStart(2, '0')}:00.`;

    return {
      dash,
      dentro: deHoy.filter(estaAdentro).length,
      entradasHoy: deHoy.length,
      clientesActivos: clientesActivos(usuarios).length,
      vigentes: conMembresiaVigente(usuarios, membresias, this.hoy),
      porVencer: venc,
      inactivos: inac,
      horas: horas.map((h) => ({ ...h, alto: h.cantidad === 0 ? 3 : Math.max(8, Math.round((100 * h.cantidad) / maxHora)) })),
      aforo: aforo.map((h) => ({ ...h, alto: h.personas === 0 ? 3 : Math.max(8, Math.round((100 * h.personas) / maxAforo)) })),
      resumenAforo,
      descripcionHoras:
        pico.cantidad === 0
          ? 'Todavía no hay entradas hoy.'
          : `Entradas por hora hoy: el pico es a las ${String(pico.hora).padStart(2, '0')}:00 con ${pico.cantidad}.`,
      metodos: dash
        ? Object.entries(dash.asistenciasPorMetodo ?? {}).map(([nombre, cantidad]) => ({
            nombre: nombre.toLowerCase() === 'qr' ? 'QR' : nombre.charAt(0).toUpperCase() + nombre.slice(1).toLowerCase(),
            cantidad,
          }))
        : [],
    };
  });

  constructor() {
    this.cargar();
  }

  protected cargar(): void {
    this.carga.set({ tipo: 'cargando' });
    forkJoin({
      // Si el dashboard falla, el resto del resumen se arma igual con las listas.
      dash: this.dashboard.resumen().pipe(catchError(() => of(null))),
      asistencias: this.asistencias.listar(),
      usuarios: this.usuarios.listar(),
      membresias: this.membresias.listar(),
      dias: this.configuracion.obtenerDiasInactividad(),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ dash, asistencias, usuarios, membresias, dias }) => {
          this.dias.set(dias);
          this.carga.set({ tipo: 'listo', datos: { dash, asistencias, usuarios: usuarios.usuarios, membresias } });
        },
        error: (error: unknown) => this.carga.set({ tipo: 'error', mensaje: mensajeDeError(error, 'el resumen') }),
      });
  }
}
