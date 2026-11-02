import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, of } from 'rxjs';
import { API_URL } from 'shared';
import { aSolicitud, AvanceDto, deRespuesta, Sesion } from './sesion-guiada';

/** El avance del modo guiado en el servidor (solo el cliente: PUT y GET /sesiones-entrenamiento/hoy). */
@Injectable({ providedIn: 'root' })
export class SesionGuiadaService {
  private readonly http = inject(HttpClient);
  private readonly url = `${inject(API_URL)}/sesiones-entrenamiento/hoy`;

  /**
   * El avance de hoy. Sin avance (404) o de otra rutina: sesion = null. Si el servidor no responde: sesion = null y
   * fallo = true, para quedarse con el respaldo del navegador y avisarlo.
   */
  obtenerHoy(rutinaId: number, ids: readonly number[]): Observable<{ sesion: Sesion | null; fallo: boolean }> {
    return this.http.get<AvanceDto>(this.url).pipe(
      map((r) => ({ sesion: deRespuesta(r, rutinaId, ids), fallo: false })),
      catchError((e: unknown) => of({ sesion: null, fallo: !(e instanceof HttpErrorResponse && e.status === 404) })),
    );
  }

  /** Envía el avance completo. Con terminada = true el backend avisa al entrenador. */
  guardar(rutinaId: number, ids: readonly number[], sesion: Sesion): Observable<void> {
    return this.http.put<unknown>(this.url, aSolicitud(rutinaId, ids, sesion)).pipe(map(() => undefined));
  }
}
