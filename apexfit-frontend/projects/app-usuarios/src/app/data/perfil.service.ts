import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API_URL } from 'shared';
import { UsuarioDto } from './dtos';
import { Perfil } from './perfil';

@Injectable({ providedIn: 'root' })
export class PerfilService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(API_URL);

  /** Datos del usuario del token (el backend lo identifica por la sesión, sin pasar id). */
  perfil(): Observable<Perfil> {
    return this.http.get<UsuarioDto>(`${this.apiUrl}/usuarios/perfil`).pipe(
      map((u) => ({ id: u.idUsuario, nombre: u.nombre, apellido: u.apellido, correo: u.correo })),
    );
  }
}
