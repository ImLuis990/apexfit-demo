import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { Asistencia } from '../../data/asistencias.models';
import { ClienteAsignado } from '../../data/clientes.models';
import { resumirAsistencia } from '../../data/clientes.mapper';
import { ClientesService } from '../../data/clientes.service';
import { Carga } from '../../data/carga';
import { mensajeDeError } from '../../data/errores';
import { diasEntre, fechaCompleta, fechaCorta, horaCorta, hoyIso, numero } from '../../data/formato';
import { ConfiguracionService } from '../../data/configuracion.service';
import { estaInactivo } from '../../data/resumen.mapper';

interface Vista {
  c: ClienteAsignado;
  peso: string | null;
  fecha: string | null;
  variacion: { texto: string; flecha: '▼' | '▲' | '' } | null;
}

function armarVista(c: ClienteAsignado): Vista {
  const [ultimo, anterior] = c.registros;
  let variacion: Vista['variacion'] = null;
  if (ultimo && anterior) {
    const dif = Math.round((ultimo.peso - anterior.peso) * 100) / 100;
    variacion =
      dif < 0 ? { flecha: '▼', texto: `Bajó ${numero(Math.abs(dif), 2)} kg` }
      : dif > 0 ? { flecha: '▲', texto: `Subió ${numero(dif, 2)} kg` }
      : { flecha: '', texto: 'Sin cambios' };
  }
  return {
    c,
    peso: ultimo ? numero(ultimo.peso, 2) : null,
    fecha: ultimo ? fechaCorta(ultimo.fecha) : null,
    variacion,
  };
}

@Component({
  selector: 'app-clientes',
  imports: [RouterLink],
  templateUrl: './clientes.html',
  styleUrl: './clientes.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Clientes {
  private readonly clientes = inject(ClientesService);
  private readonly configuracion = inject(ConfiguracionService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly carga = signal<Carga<ClienteAsignado[]>>({ tipo: 'cargando' });
  protected readonly abierto = signal<number | null>(null);
  protected readonly asistencias = signal<Record<number, Carga<Asistencia[]>>>({});
  protected readonly asistenciaAbierta = signal<number | null>(null);
  protected readonly fecha = fechaCompleta;
  protected readonly hora = horaCorta;
  protected readonly resumen = (lista: Asistencia[]) => resumirAsistencia(lista, hoyIso());
  protected readonly numero = numero;
  /** Los días de inactividad que el administrador configuró (el entrenador solo los ve). */
  protected readonly dias = this.configuracion.dias;
  protected readonly avisoDias = this.configuracion.aviso;
  /** La misma regla de la pantalla Inactividad, con la última asistencia de este cliente (no revisa la membresía: el entrenador no puede verla). */
  protected readonly inactivo = (ultima: string | null): boolean => estaInactivo(ultima ? diasEntre(ultima, hoyIso()) : null, this.dias());

  protected readonly vistas = computed<Vista[]>(() => {
    const c = this.carga();
    return c.tipo === 'listo' ? c.datos.map(armarVista) : [];
  });

  constructor() {
    this.cargar();
    this.configuracion.obtenerDiasInactividad().pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
  }

  protected cargar(): void {
    this.carga.set({ tipo: 'cargando' });
    this.clientes
      .misClientes()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (datos) => this.carga.set({ tipo: 'listo', datos }),
        error: (error: unknown) => this.carga.set({ tipo: 'error', mensaje: mensajeDeError(error, 'tus clientes') }),
      });
  }

  protected alternar(id: number): void {
    this.abierto.update((actual) => (actual === id ? null : id));
  }

  protected alternarAsistencia(id: number): void {
    if (this.asistenciaAbierta() === id) {
      this.asistenciaAbierta.set(null);
      return;
    }
    this.asistenciaAbierta.set(id);
    if (this.asistencias()[id]?.tipo !== 'listo') this.cargarAsistencia(id);
  }

  protected cargarAsistencia(id: number): void {
    this.fijarAsistencia(id, { tipo: 'cargando' });
    this.clientes
      .asistenciaDe(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (datos) => this.fijarAsistencia(id, { tipo: 'listo', datos }),
        error: (error: unknown) =>
          this.fijarAsistencia(id, { tipo: 'error', mensaje: mensajeDeError(error, 'su asistencia') }),
      });
  }

  private fijarAsistencia(id: number, estado: Carga<Asistencia[]>): void {
    this.asistencias.update((actual) => ({ ...actual, [id]: estado }));
  }
}
