import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from 'shared';
import { EntrenadorInfo } from './entrenador.models';

/** Consulta el entrenador asignado al cliente autenticado. */
@Injectable({ providedIn: 'root' })
export class EntrenadorService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(API_URL);

  /** GET /mi-entrenador → 200 con datos o 204 sin contenido */
  miEntrenador(): Observable<EntrenadorInfo | null> {
    return this.http.get<EntrenadorInfo>(`${this.apiUrl}/mi-entrenador`);
  }
}
