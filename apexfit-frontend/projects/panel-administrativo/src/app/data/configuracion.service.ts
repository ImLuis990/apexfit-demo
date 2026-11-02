import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { catchError, map, Observable, of, shareReplay, tap } from 'rxjs';
import { API_URL } from 'shared';
import { normalizarDias } from './inactividad.config';
import { DIAS_INACTIVIDAD } from './resumen.mapper';

export interface InactividadResponse {
  dias: number;
}

/**
 * Los días de inactividad viven en el servidor (GET y PUT /configuracion/inactividad) y valen para todos.
 * Un solo servicio, con caché, lo comparten Inactividad, Resumen, Asignaciones y Mis clientes: se lee una vez.
 * El administrador lo cambia; los demás roles solo lo leen.
 */
@Injectable({ providedIn: 'root' })
export class ConfiguracionService {
  private readonly http = inject(HttpClient);
  private readonly url = `${inject(API_URL)}/configuracion/inactividad`;

  /** Los días vigentes (10 mientras no se haya podido leer el servidor). */
  readonly dias = signal(DIAS_INACTIVIDAD);
  /** Se llena cuando no se pudo leer el servidor y se usan los días por defecto. */
  readonly aviso = signal<string | null>(null);

  private lectura: Observable<number> | null = null;

  /** Una sola lectura compartida. Si falla, usa 10 y avisa; la próxima pantalla que lo pida vuelve a intentar. */
  obtenerDiasInactividad(): Observable<number> {
    this.lectura ??= this.http.get<InactividadResponse>(this.url).pipe(
      map((r) => normalizarDias(r?.dias)),
      tap((d) => {
        this.dias.set(d);
        this.aviso.set(null);
      }),
      catchError(() => {
        this.lectura = null;
        this.dias.set(DIAS_INACTIVIDAD);
        this.aviso.set(`No se pudieron leer los días de inactividad del servidor: se usan ${DIAS_INACTIVIDAD}.`);
        return of(DIAS_INACTIVIDAD);
      }),
      shareReplay(1),
    );
    return this.lectura;
  }

  /** Solo el administrador (el backend responde 403 al resto). Si falla, el error llega a quien lo pidió. */
  guardarDiasInactividad(dias: number): Observable<number> {
    const valor = normalizarDias(dias);
    return this.http.put<InactividadResponse>(this.url, { dias: valor }).pipe(
      map((r) => normalizarDias(r?.dias ?? valor)),
      tap((d) => {
        this.dias.set(d);
        this.aviso.set(null);
        this.lectura = of(d);
      }),
    );
  }
}
