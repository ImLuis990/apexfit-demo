import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, forkJoin, map, Observable, of, switchMap } from 'rxjs';
import { API_URL, AuthService } from 'shared';
import { EjercicioDto, Page, RutinaDto, RutinaEjercicioDto } from './dtos';
import { armarRutina, elegirActiva } from './rutinas.mapper';
import { RutinaActiva } from './rutinas.models';

/**
 * Acceso a la rutina del cliente. Hoy el backend exige 3 pasos (rutina → sus ejercicios →
 * nombres de ejercicio). Si llega un endpoint único (p. ej. GET /me/rutina-activa), solo
 * cambia este archivo: las pantallas siguen recibiendo una RutinaActiva.
 */
@Injectable({ providedIn: 'root' })
export class RutinasService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(API_URL);
  private readonly auth = inject(AuthService);

  /** La rutina activa del cliente con sesión, o null si no tiene ninguna. */
  rutinaActiva(): Observable<RutinaActiva | null> {
    const idCliente = this.auth.session()?.id;
    if (idCliente === undefined) return of(null);

    return this.http
      .get<Page<RutinaDto>>(`${this.apiUrl}/rutinas/cliente/${idCliente}`, {
        params: { size: 50 },
      })
      .pipe(
        map((pagina) => elegirActiva(pagina.content)),
        switchMap((rutina) => (rutina ? this.detalle(rutina) : of(null))),
      );
  }

  private detalle(rutina: RutinaDto): Observable<RutinaActiva> {
    return this.http
      .get<RutinaEjercicioDto[]>(`${this.apiUrl}/rutina-ejercicios/rutina/${rutina.idRutina}`)
      .pipe(
        switchMap((items) =>
          this.catalogo(items).pipe(map((catalogo) => armarRutina(rutina, items, catalogo))),
        ),
      );
  }

  /** Pide cada ejercicio distinto una sola vez; si uno falla, la rutina igual se muestra. */
  private catalogo(items: RutinaEjercicioDto[]): Observable<Map<number, EjercicioDto>> {
    const ids = [...new Set(items.map((i) => i.idEjercicio))];
    if (ids.length === 0) return of(new Map());

    return forkJoin(
      ids.map((id) =>
        this.http
          .get<EjercicioDto>(`${this.apiUrl}/ejercicios/${id}`)
          .pipe(catchError(() => of(null))),
      ),
    ).pipe(
      map(
        (lista) =>
          new Map(
            lista
              .filter((e): e is EjercicioDto => e !== null)
              .map((e) => [e.idEjercicio, e] as const),
          ),
      ),
    );
  }
}
