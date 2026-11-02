import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { concatMap, from, map, Observable, of, toArray } from 'rxjs';
import { API_URL } from 'shared';
import { Page } from './dtos';
import { aDto, aEjercicio, porNombre } from './ejercicios.mapper';
import { Ejercicio, EjercicioCompletoDto, EJEMPLOS, FormEjercicio } from './ejercicios.models';
import { TAMANO_PAGINA } from './usuarios.service';

export interface DatosEjercicios {
  ejercicios: Ejercicio[];
  /** Cuántos hay en total en el backend (por si no cupieron todos en la carga). */
  total: number;
}

/** CRUD del catálogo de ejercicios (entrenador y administrador). El borrado es definitivo en el backend. */
@Injectable({ providedIn: 'root' })
export class EjerciciosService {
  private readonly http = inject(HttpClient);
  private readonly url = `${inject(API_URL)}/ejercicios`;

  listar(): Observable<DatosEjercicios> {
    return this.http.get<Page<EjercicioCompletoDto>>(this.url, { params: { size: TAMANO_PAGINA } }).pipe(
      map((p) => ({ ejercicios: p.content.map(aEjercicio).sort(porNombre), total: p.totalElements })),
    );
  }

  crear(f: FormEjercicio): Observable<Ejercicio> {
    return this.http.post<EjercicioCompletoDto>(this.url, aDto(f)).pipe(map(aEjercicio));
  }

  actualizar(id: number, f: FormEjercicio): Observable<Ejercicio> {
    return this.http.put<EjercicioCompletoDto>(`${this.url}/${id}`, aDto(f)).pipe(map(aEjercicio));
  }

  borrar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }

  /** Crea, de uno en uno, los ejemplos cuyo nombre aún no existe. Devuelve cuántos creó. */
  cargarEjemplos(existentes: readonly string[]): Observable<number> {
    const tengo = new Set(existentes.map((n) => n.trim().toLowerCase()));
    const faltan = EJEMPLOS.filter((e) => !tengo.has(e.nombre.toLowerCase()));
    if (faltan.length === 0) return of(0);
    return from(faltan).pipe(
      concatMap((e) => this.crear({ nombre: e.nombre, grupoMuscular: e.grupoMuscular, nivel: e.nivel, videoUrl: '' })),
      toArray(),
      map((creados) => creados.length),
    );
  }
}
