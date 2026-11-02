import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API_URL } from 'shared';
import { Page, UsuarioDto } from './dtos';
import { aDtoEdicion, aDtoEstado, aDtoNuevo, aUsuario, ordenar } from './usuarios.mapper';
import { DatosUsuario, Usuario } from './usuarios.models';

/** Cuántos usuarios se piden de una vez (el backend no filtra por rol ni estado). */
export const TAMANO_PAGINA = 200;

@Injectable({ providedIn: 'root' })
export class UsuariosService {
  private readonly http = inject(HttpClient);
  private readonly url = `${inject(API_URL)}/usuarios`;

  listar(): Observable<{ usuarios: Usuario[]; total: number }> {
    return this.http
      .get<Page<UsuarioDto>>(this.url, { params: { size: TAMANO_PAGINA } })
      .pipe(
        map((pagina) => ({
          usuarios: ordenar(pagina.content.map(aUsuario)),
          total: pagina.totalElements,
        })),
      );
  }

  crear(datos: DatosUsuario): Observable<Usuario> {
    return this.http.post<UsuarioDto>(this.url, aDtoNuevo(datos)).pipe(map(aUsuario));
  }

  actualizar(original: Usuario, datos: DatosUsuario): Observable<Usuario> {
    return this.http
      .put<UsuarioDto>(`${this.url}/${original.id}`, aDtoEdicion(original, datos))
      .pipe(map(aUsuario));
  }

  /** El backend no borra: pone el usuario en 'inactivo' (soft delete). */
  desactivar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }

  activar(original: Usuario): Observable<Usuario> {
    return this.http
      .put<UsuarioDto>(`${this.url}/${original.id}`, aDtoEstado(original, 'activo'))
      .pipe(map(aUsuario));
  }
}
