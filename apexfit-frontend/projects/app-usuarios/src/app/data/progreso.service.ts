import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable, of, throwError } from 'rxjs';
import { API_URL, AuthService } from 'shared';
import { ProgresoDto } from './dtos';
import { aDto, aDtoEdicion, aRegistro, ordenarCronologico } from './progreso.mapper';
import { CambiosRegistro, NuevoRegistro, RegistroProgreso } from './progreso.models';

/** Acceso al progreso físico del cliente con sesión. */
@Injectable({ providedIn: 'root' })
export class ProgresoService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(API_URL);
  private readonly auth = inject(AuthService);

  /** Todos sus registros, del más antiguo al más reciente. */
  historial(): Observable<RegistroProgreso[]> {
    const idUsuario = this.auth.session()?.id;
    if (idUsuario === undefined) return of([]);

    return this.http
      .get<ProgresoDto[]>(`${this.apiUrl}/progresos/usuario/${idUsuario}`)
      .pipe(map((lista) => ordenarCronologico(lista.map(aRegistro))));
  }

  registrar(nuevo: NuevoRegistro): Observable<RegistroProgreso> {
    const idUsuario = this.auth.session()?.id;
    if (idUsuario === undefined) return throwError(() => new Error('SIN_SESION'));

    return this.http
      .post<ProgresoDto>(`${this.apiUrl}/progresos`, aDto(idUsuario, nuevo))
      .pipe(map(aRegistro));
  }

  /** Edita un registro propio (PUT /progresos/{id}): peso, altura y observaciones. */
  actualizar(registro: RegistroProgreso, cambios: CambiosRegistro): Observable<RegistroProgreso> {
    const idUsuario = this.auth.session()?.id;
    if (idUsuario === undefined) return throwError(() => new Error('SIN_SESION'));
    return this.http
      .put<ProgresoDto>(`${this.apiUrl}/progresos/${registro.id}`, aDtoEdicion(idUsuario, registro, cambios))
      .pipe(map(aRegistro));
  }
}
