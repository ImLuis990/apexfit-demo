import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable, of } from 'rxjs';
import { API_URL, AuthService } from 'shared';
import { MembresiaDto } from './dtos';
import { hoyIso } from './formato';
import { EstadoMembresia, resumirMembresia } from './membresias.mapper';

@Injectable({ providedIn: 'root' })
export class MembresiasService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(API_URL);
  private readonly auth = inject(AuthService);

  /** Estado de la membresía del cliente con sesión. */
  estado(): Observable<EstadoMembresia> {
    const idUsuario = this.auth.session()?.id;
    if (idUsuario === undefined) return of({ tipo: 'sin-membresia' });

    return this.http
      .get<MembresiaDto[]>(`${this.apiUrl}/membresias/usuario/${idUsuario}`)
      .pipe(map((lista) => resumirMembresia(lista, hoyIso())));
  }
}
