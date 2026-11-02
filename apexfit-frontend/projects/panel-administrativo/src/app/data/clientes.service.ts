import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, forkJoin, map, Observable, of, switchMap } from 'rxjs';
import { API_URL, AuthService } from 'shared';
import { aAsistencia } from './asistencias.mapper';
import { Asistencia } from './asistencias.models';
import { armarCliente, asignacionVigente, ordenarRecientes } from './clientes.mapper';
import { ClienteAsignado } from './clientes.models';
import { AsistenciaDto, EntrenadorClienteDto, Page, ProgresoDto, RutinaDto } from './dtos';
import { UsuariosService } from './usuarios.service';

/** "Mis clientes": los clientes asignados al entrenador con sesión. */
@Injectable({ providedIn: 'root' })
export class ClientesService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(API_URL);
  private readonly auth = inject(AuthService);
  private readonly usuarios = inject(UsuariosService);

  /** Solo los datos para elegir un cliente (sin rutinas ni progreso): 2 llamadas. */
  asignados(): Observable<{ idCliente: number; nombre: string; correo: string }[]> {
    const idEntrenador = this.auth.session()?.id;
    if (idEntrenador === undefined) return of([]);

    return forkJoin({
      asignaciones: this.http.get<EntrenadorClienteDto[]>(`${this.apiUrl}/entrenador-cliente/entrenador/${idEntrenador}`),
      usuarios: this.usuarios.listar(),
    }).pipe(
      map(({ asignaciones, usuarios }) => {
        const porId = new Map(usuarios.usuarios.map((u) => [u.id, u]));
        const ids = [...new Set(asignaciones.filter(asignacionVigente).map((a) => a.idCliente))];
        return ids
          .map((id) => ({ idCliente: id, nombre: porId.get(id)?.nombreCompleto ?? `Cliente #${id}`, correo: porId.get(id)?.correo ?? '' }))
          .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
      }),
    );
  }

  /**
   * Hoy el backend no entrega esto resumido, así que se arma con varias llamadas:
   * asignaciones → nombres (lista de usuarios) → rutinas y progreso de cada cliente.
   * Si falla la rutina o el progreso de un cliente, ese cliente igual aparece (sin ese dato).
   */
  misClientes(): Observable<ClienteAsignado[]> {
    const idEntrenador = this.auth.session()?.id;
    if (idEntrenador === undefined) return of([]);

    return forkJoin({
      asignaciones: this.http.get<EntrenadorClienteDto[]>(`${this.apiUrl}/entrenador-cliente/entrenador/${idEntrenador}`),
      usuarios: this.usuarios.listar(),
    }).pipe(
      switchMap(({ asignaciones, usuarios }) => {
        const idsClientes = [...new Set(asignaciones.filter(asignacionVigente).map((a) => a.idCliente))];
        if (idsClientes.length === 0) return of([] as ClienteAsignado[]);

        const porId = new Map(usuarios.usuarios.map((u) => [u.id, u]));
        return forkJoin(
          idsClientes.map((id) =>
            forkJoin({
              rutinas: this.http
                .get<Page<RutinaDto>>(`${this.apiUrl}/rutinas/cliente/${id}`, { params: { size: 50 } })
                .pipe(map((p) => p.content), catchError(() => of([] as RutinaDto[]))),
              progreso: this.http
                .get<ProgresoDto[]>(`${this.apiUrl}/progresos/usuario/${id}`)
                .pipe(catchError(() => of([] as ProgresoDto[]))),
            }).pipe(map(({ rutinas, progreso }) => armarCliente(id, porId.get(id), rutinas, progreso))),
          ),
        ).pipe(map((lista) => lista.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))));
      }),
    );
  }

  /** Asistencia de un cliente (GET /asistencias/usuario/{id}), la más reciente primero. */
  asistenciaDe(idCliente: number): Observable<Asistencia[]> {
    return this.http
      .get<AsistenciaDto[]>(`${this.apiUrl}/asistencias/usuario/${idCliente}`)
      .pipe(map((lista) => ordenarRecientes(lista.map(aAsistencia))));
  }
}
