import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { forkJoin, map, Observable, of } from 'rxjs';
import { API_URL } from 'shared';
import { aAsignacion, aDtoEstado, filasDelPar } from './asignaciones.mapper';
import { Asignacion } from './asignaciones.models';
import { EntrenadorClienteDto } from './dtos';
import { Usuario } from './usuarios.models';
import { UsuariosService } from './usuarios.service';

export interface DatosAsignaciones {
  asignaciones: Asignacion[];
  usuarios: Usuario[];
  /** Cuántos usuarios hay en total en el backend (por si no cupieron todos en la carga). */
  total: number;
}

/**
 * Quién entrena a quién (solo administrador). Las filas nunca se acumulan: por cada pareja
 * entrenador–cliente se reutiliza la misma fila, porque la base tiene UNIQUE (entrenador, cliente, estado)
 * y no deja tener dos filas 'inactiva' de la misma pareja.
 */
@Injectable({ providedIn: 'root' })
export class AsignacionesService {
  private readonly http = inject(HttpClient);
  private readonly url = `${inject(API_URL)}/entrenador-cliente`;
  private readonly usuarios = inject(UsuariosService);

  listar(): Observable<DatosAsignaciones> {
    return forkJoin({
      asignaciones: this.http.get<EntrenadorClienteDto[]>(this.url),
      usuarios: this.usuarios.listar(),
    }).pipe(
      map(({ asignaciones, usuarios }) => ({
        asignaciones: asignaciones.map(aAsignacion),
        usuarios: usuarios.usuarios,
        total: usuarios.total,
      })),
    );
  }

  /**
   * Suma el cliente al entrenador. Si ya estuvo asignado antes (fila 'inactiva') la reactiva en lugar
   * de crear otra; si ya está vigente no hace nada.
   */
  asignar(idEntrenador: number, idCliente: number, todas: Asignacion[]): Observable<Asignacion> {
    const filas = filasDelPar(todas, idEntrenador, idCliente);
    const vigente = filas.find((f) => f.vigente);
    if (vigente) return of(vigente);

    const anterior = filas[0];
    if (anterior) {
      return this.http
        .put<EntrenadorClienteDto>(`${this.url}/${anterior.id}`, aDtoEstado(anterior, 'activa'))
        .pipe(map(aAsignacion));
    }
    return this.http
      .post<EntrenadorClienteDto>(this.url, { idEntrenador, idCliente, estado: 'activa' })
      .pipe(map(aAsignacion));
  }

  /**
   * Quita al cliente del entrenador conservando el historial: la fila pasa a 'inactiva'. Solo si la pareja
   * ya tiene otra fila 'inactiva' (la base no permite dos) se borra esta.
   */
  quitar(asignacion: Asignacion, todas: Asignacion[]): Observable<void> {
    const yaHayInactiva = filasDelPar(todas, asignacion.idEntrenador, asignacion.idCliente).some(
      (f) => f.id !== asignacion.id && !f.vigente,
    );
    if (yaHayInactiva) return this.http.delete<void>(`${this.url}/${asignacion.id}`);

    return this.http
      .put<EntrenadorClienteDto>(`${this.url}/${asignacion.id}`, aDtoEstado(asignacion, 'inactiva'))
      .pipe(map(() => undefined));
  }
}
