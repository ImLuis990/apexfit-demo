import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { DestroyRef, Injectable, effect, inject, signal, untracked } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { API_URL } from '../auth/auth.tokens';
import {
  Notificacion,
  NotificacionDto,
  PaginaNotificaciones,
  TAMANO_PAGINA_NOTIFICACIONES,
  aNotificacion,
} from './notificacion.models';

const CADA_MS = 60_000;

/**
 * Notificaciones dentro de la app (API real: /api/v1/notificaciones). El contador se refresca cada 60 s mientras
 * la pestaña está visible y hay sesión; marcar y borrar se reflejan al instante y se revierten si el backend falla.
 */
@Injectable({ providedIn: 'root' })
export class NotificacionesService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly url = `${inject(API_URL)}/notificaciones`;

  readonly contador = signal(0);
  readonly items = signal<Notificacion[]>([]);
  readonly estado = signal<'sin-cargar' | 'cargando' | 'listo' | 'error'>('sin-cargar');
  readonly hayMas = signal(false);
  readonly cargandoMas = signal(false);
  /** Mensaje del último marcar, borrar o «cargar más» que falló. */
  readonly errorAccion = signal<string | null>(null);

  private pagina = 0;
  private temporizador: ReturnType<typeof setInterval> | null = null;
  private escuchando = false;
  private readonly alCambiarVisibilidad = () => {
    if (document.visibilityState === 'visible') {
      this.refrescarContador();
      this.armarTemporizador();
    } else {
      this.pararTemporizador();
    }
  };

  constructor() {
    effect(() => {
      const haySesion = this.auth.session() !== null;
      untracked(() => (haySesion ? this.iniciar() : this.detener()));
    });
    inject(DestroyRef).onDestroy(() => this.detener());
  }

  // ── refresco del contador ──
  private iniciar(): void {
    if (this.escuchando) return;
    this.escuchando = true;
    document.addEventListener('visibilitychange', this.alCambiarVisibilidad);
    if (document.visibilityState === 'visible') {
      this.refrescarContador();
      this.armarTemporizador();
    }
  }

  /** Cierre de sesión: se detiene todo y se borra lo que había en memoria. */
  private detener(): void {
    this.pararTemporizador();
    if (this.escuchando) document.removeEventListener('visibilitychange', this.alCambiarVisibilidad);
    this.escuchando = false;
    this.contador.set(0);
    this.items.set([]);
    this.estado.set('sin-cargar');
    this.hayMas.set(false);
    this.cargandoMas.set(false);
    this.errorAccion.set(null);
    this.pagina = 0;
  }

  private armarTemporizador(): void {
    if (this.temporizador === null) this.temporizador = setInterval(() => this.refrescarContador(), CADA_MS);
  }

  private pararTemporizador(): void {
    if (this.temporizador !== null) clearInterval(this.temporizador);
    this.temporizador = null;
  }

  refrescarContador(): void {
    this.http.get<{ total: number }>(`${this.url}/no-leidas/contador`).subscribe({
      next: (r) => this.contador.set(r.total ?? 0),
      error: () => {
        // el contador es un extra: se queda con el último valor
      },
    });
  }

  // ── lista ──
  private pedirPagina(pagina: number): Observable<PaginaNotificaciones> {
    return this.http.get<PaginaNotificaciones>(this.url, {
      params: { soloNoLeidas: false, page: pagina, size: TAMANO_PAGINA_NOTIFICACIONES },
    });
  }

  /** Al abrir la campana: recarga desde la primera página. */
  cargarPrimera(): void {
    this.errorAccion.set(null);
    if (this.items().length === 0) this.estado.set('cargando');
    this.pedirPagina(0).subscribe({
      next: (p) => {
        this.pagina = 0;
        this.items.set(p.content.map((d: NotificacionDto) => aNotificacion(d)));
        this.hayMas.set(TAMANO_PAGINA_NOTIFICACIONES < p.totalElements);
        this.estado.set('listo');
        this.refrescarContador();
      },
      error: () => {
        if (this.items().length === 0) this.estado.set('error');
        else this.errorAccion.set('No se pudo actualizar la lista.');
      },
    });
  }

  cargarMas(): void {
    if (!this.hayMas() || this.cargandoMas()) return;
    this.cargandoMas.set(true);
    this.errorAccion.set(null);
    const siguiente = this.pagina + 1;
    this.pedirPagina(siguiente).subscribe({
      next: (p) => {
        const existentes = new Set(this.items().map((n) => n.id));
        const nuevas = p.content.map((d) => aNotificacion(d)).filter((n) => !existentes.has(n.id));
        this.pagina = siguiente;
        this.items.update((lista) => [...lista, ...nuevas]);
        this.hayMas.set((siguiente + 1) * TAMANO_PAGINA_NOTIFICACIONES < p.totalElements);
        this.cargandoMas.set(false);
      },
      error: () => {
        this.cargandoMas.set(false);
        this.errorAccion.set('No se pudieron cargar más notificaciones.');
      },
    });
  }

  limpiarError(): void {
    this.errorAccion.set(null);
  }

  // ── acciones (al instante; se revierten si el backend falla) ──
  marcarLeida(id: number): void {
    const n = this.items().find((x) => x.id === id);
    if (!n || n.leida) return;
    this.errorAccion.set(null);
    this.items.update((l) => l.map((x) => (x.id === id ? { ...x, leida: true } : x)));
    this.contador.update((c) => Math.max(0, c - 1));
    this.http.put<void>(`${this.url}/${id}/leida`, null).subscribe({
      error: (e: unknown) => {
        if (this.noExiste(e)) {
          this.items.update((l) => l.filter((x) => x.id !== id)); // ya no existe: se quita y se corrige el contador
          this.refrescarContador();
          return;
        }
        this.items.update((l) => l.map((x) => (x.id === id ? { ...x, leida: false } : x)));
        this.contador.update((c) => c + 1);
        this.errorAccion.set('No se pudo marcar como leída.');
      },
    });
  }

  marcarTodas(): void {
    const antes = this.items();
    const noLeidasAntes = new Set(antes.filter((n) => !n.leida).map((n) => n.id));
    const contadorAntes = this.contador();
    if (noLeidasAntes.size === 0 && contadorAntes === 0) return;
    this.errorAccion.set(null);
    this.items.update((l) => l.map((x) => ({ ...x, leida: true })));
    this.contador.set(0);
    this.http.put<{ marcadas: number }>(`${this.url}/leidas`, null).subscribe({
      error: () => {
        this.items.update((l) => l.map((x) => (noLeidasAntes.has(x.id) ? { ...x, leida: false } : x)));
        this.contador.set(contadorAntes);
        this.errorAccion.set('No se pudieron marcar como leídas.');
      },
    });
  }

  borrar(id: number): void {
    const lista = this.items();
    const indice = lista.findIndex((x) => x.id === id);
    if (indice < 0) return;
    const borrada = lista[indice];
    this.errorAccion.set(null);
    this.items.update((l) => l.filter((x) => x.id !== id));
    if (!borrada.leida) this.contador.update((c) => Math.max(0, c - 1));
    this.http.delete<void>(`${this.url}/${id}`).subscribe({
      error: (e: unknown) => {
        if (this.noExiste(e)) {
          this.refrescarContador(); // ya no existía: queda borrada
          return;
        }
        this.items.update((l) => {
          const copia = [...l];
          copia.splice(Math.min(indice, copia.length), 0, borrada);
          return copia;
        });
        if (!borrada.leida) this.contador.update((c) => c + 1);
        this.errorAccion.set('No se pudo borrar la notificación.');
      },
    });
  }

  private noExiste(e: unknown): boolean {
    return e instanceof HttpErrorResponse && e.status === 404;
  }
}
