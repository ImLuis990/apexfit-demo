import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, concatMap, from, map, Observable, of, switchMap, throwError, toArray } from 'rxjs';
import { API_URL, AuthService } from 'shared';
import { esRutinaActiva } from './clientes.mapper';
import { EjercicioDto, Page, RutinaDto, RutinaEjercicioDto } from './dtos';
import { EjercicioCatalogo, LineaRutina, NuevaRutina, ResultadoAsignacion } from './rutinas.models';

const aLineaDto = (idRutina: number, l: LineaRutina): RutinaEjercicioDto => ({
  idRutina,
  idEjercicio: l.idEjercicio,
  diaSemana: l.dia,
  series: l.series,
  repeticiones: l.repeticiones,
  descansoSeg: l.descansoSeg,
});

@Injectable({ providedIn: 'root' })
export class RutinasService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(API_URL);
  private readonly auth = inject(AuthService);

  /** Catálogo de ejercicios (hasta 200), por orden alfabético. */
  ejercicios(): Observable<EjercicioCatalogo[]> {
    return this.http.get<Page<EjercicioDto>>(`${this.apiUrl}/ejercicios`, { params: { size: 200 } }).pipe(
      map((p) =>
        p.content
          .map((e) => ({ id: e.idEjercicio, nombre: e.nombre, grupoMuscular: e.grupoMuscular ?? null }))
          .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
      ),
    );
  }

  /**
   * Asigna la rutina a cada cliente, de uno en uno. Un fallo con un cliente no detiene a los demás:
   * cada uno devuelve su propio resultado.
   */
  asignar(plan: NuevaRutina, idsClientes: number[]): Observable<ResultadoAsignacion[]> {
    const idEntrenador = this.auth.session()?.id;
    if (idEntrenador === undefined) return throwError(() => new Error('SIN_SESION'));

    return from(idsClientes).pipe(
      concatMap((idCliente) =>
        this.asignarA(plan, idCliente, idEntrenador).pipe(
          catchError((error: unknown) => of<ResultadoAsignacion>({ idCliente, ok: false, error })),
        ),
      ),
      toArray(),
    );
  }

  /**
   * El backend no crea una rutina completa de una vez ni desactiva la anterior, así que:
   *  1) se leen las rutinas activas que tiene hoy el cliente;
   *  2) se crea la rutina nueva y se agrega cada ejercicio;
   *  3) si algún ejercicio falla, se desactiva la rutina a medias (para que el cliente no la vea);
   *  4) solo si todo salió bien, se desactivan las anteriores (así nunca queda sin rutina).
   */
  private asignarA(plan: NuevaRutina, idCliente: number, idEntrenador: number): Observable<ResultadoAsignacion> {
    return this.http.get<Page<RutinaDto>>(`${this.apiUrl}/rutinas/cliente/${idCliente}`, { params: { size: 50 } }).pipe(
      map((p) => p.content.filter(esRutinaActiva).map((r) => r.idRutina as number)),
      switchMap((previas) =>
        this.http
          .post<RutinaDto>(`${this.apiUrl}/rutinas`, {
            nombre: plan.nombre,
            descripcion: plan.descripcion,
            idEntrenador,
            idCliente,
            estado: 'activa',
          })
          .pipe(
            switchMap((nueva) =>
              from(plan.lineas).pipe(
                concatMap((linea) => this.http.post(`${this.apiUrl}/rutina-ejercicios`, aLineaDto(nueva.idRutina as number, linea))),
                toArray(),
                catchError((error: unknown) =>
                  this.http.delete(`${this.apiUrl}/rutinas/${nueva.idRutina}`).pipe(
                    catchError(() => of(null)),
                    switchMap(() => throwError(() => error)),
                  ),
                ),
              ),
            ),
            switchMap(() => this.desactivar(previas)),
            map((advertencia): ResultadoAsignacion => ({ idCliente, ok: true, ...(advertencia ? { advertencia } : {}) })),
          ),
      ),
    );
  }

  /** Devuelve un texto de advertencia si no se pudieron desactivar (la rutina nueva ya quedó guardada). */
  private desactivar(ids: number[]): Observable<string | undefined> {
    if (ids.length === 0) return of(undefined);
    return from(ids).pipe(
      concatMap((id) => this.http.delete(`${this.apiUrl}/rutinas/${id}`)),
      toArray(),
      map(() => undefined),
      catchError(() => of('La rutina nueva quedó guardada, pero no se pudo desactivar la anterior.')),
    );
  }
}
