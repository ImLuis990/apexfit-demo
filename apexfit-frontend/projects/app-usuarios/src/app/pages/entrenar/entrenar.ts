import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { AuthService } from 'shared';
import { catchError, concatMap, map, of, Subject, switchMap } from 'rxjs';
import { Carga } from '../../data/carga';
import { mensajeDeError } from '../../data/errores';
import { hoyIso } from '../../data/formato';
import { diaDeHoy, RutinaActiva } from '../../data/rutinas.models';
import { RutinasService } from '../../data/rutinas.service';
import {
  actualId, aplazar, borrarAvance, claveSesion, completar, elegirAvance, guardarAvance, iniciarSesion, leerAvance,
  Sesion, soloAplazados, terminar,
} from '../../data/sesion-guiada';
import { SesionGuiadaService } from '../../data/sesion-guiada.service';
import { planDeHoy } from '../../data/hoy';

/**
 * «Iniciar rutina de hoy»: un ejercicio a la vez. El avance se guarda en el servidor (así se retoma en otro dispositivo)
 * y en el navegador como respaldo (un registro por usuario y día).
 */
@Component({
  selector: 'app-entrenar',
  imports: [RouterLink],
  templateUrl: './entrenar.html',
  styleUrl: './entrenar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Entrenar {
  private readonly rutinas = inject(RutinasService);
  private readonly auth = inject(AuthService);
  private readonly servidor = inject(SesionGuiadaService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly carga = signal<Carga<RutinaActiva | null>>({ tipo: 'cargando' });
  protected readonly sesion = signal<Sesion | null>(null);
  protected readonly confirmandoReinicio = signal(false);
  /** true cuando el último intento de hablar con el servidor falló: el avance queda solo en este dispositivo. */
  protected readonly sinSincronizar = signal(false);
  private rutinaId = 0;
  private idsHoy: number[] = [];
  /** Cada cambio se envía en orden, de uno en uno, para que el último estado sea el que queda. */
  private readonly cola = new Subject<Sesion>();
  private clave = '';

  /** Los ejercicios de hoy en el orden de la rutina; vacío si hoy no se entrena. */
  protected readonly ejercicios = computed(() => {
    const c = this.carga();
    const plan = c.tipo === 'listo' ? planDeHoy(c.datos, diaDeHoy()) : null;
    return plan?.tipo === 'entrena' ? plan.dia.ejercicios : [];
  });
  protected readonly total = computed(() => this.ejercicios().length);
  protected readonly actual = computed(() => {
    const s = this.sesion();
    const id = s ? actualId(s) : null;
    return this.ejercicios().find((e) => e.id === id) ?? null;
  });
  /** Su lugar en la rutina («Ejercicio 2 de 6»): un aplazado vuelve con el número que tenía. */
  protected readonly posicion = computed(() => {
    const a = this.actual();
    return a ? this.ejercicios().indexOf(a) + 1 : 0;
  });
  protected readonly soloAplazados = computed(() => {
    const s = this.sesion();
    return !!s && soloAplazados(s);
  });
  protected readonly restantes = computed(() => this.sesion()?.pendientes.length ?? 0);
  protected readonly avance = computed(() => {
    const s = this.sesion();
    return s && this.total() ? Math.round((s.completados.length / this.total()) * 100) : 0;
  });
  protected readonly resumen = computed(() => {
    const s = this.sesion();
    const nombres = (ids: number[]) => ids.map((id) => this.ejercicios().find((e) => e.id === id)?.nombre ?? `Ejercicio #${id}`);
    return { completados: nombres(s?.completados ?? []), sinHacer: nombres(s?.pendientes ?? []) };
  });

  constructor() {
    this.cola
      .pipe(
        concatMap((s) =>
          this.servidor.guardar(this.rutinaId, this.idsHoy, s).pipe(
            map(() => true),
            catchError(() => of(false)),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((ok) => this.sinSincronizar.set(!ok));
    this.cargar();
  }

  protected cargar(): void {
    this.carga.set({ tipo: 'cargando' });
    this.rutinas
      .rutinaActiva()
      .pipe(
        switchMap((rutina) => {
          const ids = this.idsDeHoy(rutina);
          if (!rutina || ids.length === 0 || this.auth.session()?.id === undefined) {
            return of({ rutina, servidor: null as Sesion | null, fallo: false });
          }
          return this.servidor.obtenerHoy(rutina.id, ids).pipe(map((r) => ({ rutina, servidor: r.sesion, fallo: r.fallo })));
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ rutina, servidor, fallo }) => {
          this.carga.set({ tipo: 'listo', datos: rutina });
          this.prepararSesion(rutina, servidor, fallo);
        },
        error: (error: unknown) => this.carga.set({ tipo: 'error', mensaje: mensajeDeError(error, 'tu rutina') }),
      });
  }

  private idsDeHoy(rutina: RutinaActiva | null): number[] {
    const plan = planDeHoy(rutina, diaDeHoy());
    return plan.tipo === 'entrena' ? plan.dia.ejercicios.map((e) => e.id) : [];
  }

  /** Retoma el avance de hoy (el del servidor, o el del navegador si va más adelantado) o empieza uno nuevo. */
  private prepararSesion(rutina: RutinaActiva | null, servidor: Sesion | null = null, fallo = false): void {
    const idUsuario = this.auth.session()?.id;
    const ids = this.ejercicios().map((e) => e.id);
    if (!rutina || idUsuario === undefined || ids.length === 0) {
      this.sesion.set(null);
      return;
    }
    this.clave = claveSesion(idUsuario, hoyIso());
    this.rutinaId = rutina.id;
    this.idsHoy = ids;
    const { sesion, subir } = elegirAvance(leerAvance(this.clave, rutina.id, ids), servidor);
    this.sesion.set(sesion ?? iniciarSesion(rutina.id, ids));
    this.sinSincronizar.set(fallo);
    if (sesion) {
      guardarAvance(this.clave, sesion);
      if (subir) this.cola.next(sesion);
    }
  }

  private cambiar(paso: (s: Sesion) => Sesion): void {
    const actual = this.sesion();
    if (!actual) return;
    const nueva = paso(actual);
    this.sesion.set(nueva);
    guardarAvance(this.clave, nueva);
    this.cola.next(nueva);
  }

  protected completar(): void {
    this.cambiar(completar);
  }

  protected aplazar(): void {
    this.cambiar(aplazar);
  }

  protected terminar(): void {
    this.cambiar(terminar);
  }

  protected pedirReinicio(): void {
    this.confirmandoReinicio.set(true);
  }

  protected cancelarReinicio(): void {
    this.confirmandoReinicio.set(false);
  }

  protected reiniciar(): void {
    this.confirmandoReinicio.set(false);
    borrarAvance(this.clave);
    if (this.idsHoy.length === 0) return;
    const nueva = iniciarSesion(this.rutinaId, this.idsHoy);
    this.sesion.set(nueva);
    this.cola.next(nueva); // el servidor también vuelve a empezar: todo pendiente
  }
}
