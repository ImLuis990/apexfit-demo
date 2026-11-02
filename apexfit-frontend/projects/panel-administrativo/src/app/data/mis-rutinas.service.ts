import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { concat, forkJoin, map, Observable, of, throwError, toArray } from 'rxjs';
import { API_URL, AuthService } from 'shared';
import { Page, RutinaDto, RutinaEjercicioDto } from './dtos';
import { aLineaDto, aLineaEditable, aRutinaDelEntrenador, planDeLineas, porDia, recientesPrimero } from './mis-rutinas.mapper';
import { CambiosRutina, DatosMisRutinas, LineaEditable, RutinaDelEntrenador } from './mis-rutinas.models';
import { EjercicioCatalogo } from './rutinas.models';
import { RutinasService } from './rutinas.service';
import { TAMANO_PAGINA, UsuariosService } from './usuarios.service';

/** Error cuando se intenta modificar una rutina que creó otro entrenador. */
export const RUTINA_AJENA = 'RUTINA_AJENA';

/**
 * Las rutinas que creó el entrenador de la sesión. El backend no tiene un filtro por entrenador, así que se
 * piden las rutinas y se filtran aquí; y antes de modificar una se comprueba que sea suya.
 */
@Injectable({ providedIn: 'root' })
export class MisRutinasService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(API_URL);
  private readonly auth = inject(AuthService);
  private readonly usuarios = inject(UsuariosService);
  private readonly rutinas = inject(RutinasService);

  listar(): Observable<DatosMisRutinas> {
    const yo = this.auth.session()?.id;
    if (yo === undefined) return throwError(() => new Error('SIN_SESION'));
    return forkJoin({
      pagina: this.http.get<Page<RutinaDto>>(`${this.apiUrl}/rutinas`, { params: { size: TAMANO_PAGINA } }),
      usuarios: this.usuarios.listar(),
    }).pipe(
      map(({ pagina, usuarios }) => ({
        rutinas: pagina.content
          .filter((r) => r.idEntrenador === yo)
          .map((r) => aRutinaDelEntrenador(r, usuarios.usuarios))
          .sort(recientesPrimero),
        total: pagina.totalElements,
      })),
    );
  }

  /** Los ejercicios de la rutina (con su nombre) y el catálogo para poder agregar más. */
  abrir(idRutina: number): Observable<{ lineas: LineaEditable[]; catalogo: EjercicioCatalogo[] }> {
    return forkJoin({
      lineas: this.http.get<RutinaEjercicioDto[]>(`${this.apiUrl}/rutina-ejercicios/rutina/${idRutina}`),
      catalogo: this.rutinas.ejercicios(),
    }).pipe(
      map(({ lineas, catalogo }) => ({
        lineas: lineas.map((l) => aLineaEditable(l, catalogo)).sort(porDia),
        catalogo,
      })),
    );
  }

  /**
   * Aplica solo lo que cambió, de uno en uno. Primero se agrega y se actualiza, y al final se quita:
   * si algo falla a medias, el cliente no se queda con menos ejercicios de los que tenía.
   */
  guardar(rutina: RutinaDelEntrenador, cambios: CambiosRutina, originales: LineaEditable[]): Observable<void> {
    if (!this.esMia(rutina)) return throwError(() => new Error(RUTINA_AJENA));

    const plan = planDeLineas(originales, cambios.lineas);
    const pasos: Observable<unknown>[] = [];

    const nombre = cambios.nombre.trim();
    const descripcion = cambios.descripcion.trim();
    if (nombre !== rutina.nombre || descripcion !== (rutina.descripcion ?? '')) {
      pasos.push(
        this.http.put(`${this.apiUrl}/rutinas/${rutina.id}`, {
          idRutina: rutina.id,
          nombre,
          descripcion: descripcion || null,
          idEntrenador: rutina.idEntrenador,
          idCliente: rutina.idCliente,
          estado: 'activa',
        }),
      );
    }
    for (const l of plan.agregar) pasos.push(this.http.post(`${this.apiUrl}/rutina-ejercicios`, aLineaDto(rutina.id, l)));
    for (const l of plan.actualizar) pasos.push(this.http.put(`${this.apiUrl}/rutina-ejercicios/${l.idLinea}`, aLineaDto(rutina.id, l)));
    for (const id of plan.quitar) pasos.push(this.http.delete(`${this.apiUrl}/rutina-ejercicios/${id}`));

    return pasos.length === 0 ? of(undefined) : concat(...pasos).pipe(toArray(), map(() => undefined));
  }

  /** El backend no borra la rutina: la pasa a 'inactiva' y el cliente deja de verla. */
  desactivar(rutina: RutinaDelEntrenador): Observable<void> {
    if (!this.esMia(rutina)) return throwError(() => new Error(RUTINA_AJENA));
    return this.http.delete<void>(`${this.apiUrl}/rutinas/${rutina.id}`);
  }

  private esMia(rutina: RutinaDelEntrenador): boolean {
    return rutina.idEntrenador === this.auth.session()?.id;
  }
}
