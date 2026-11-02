import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API_URL } from 'shared';

/** Respuesta de POST /auth/solicitar-recuperacion, con los nombres que usa esta app. */
export interface SolicitudRecuperacion {
  token: string;
  correo: string;
  minutos: number;
}

@Injectable({ providedIn: 'root' })
export class RecuperacionService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(API_URL);

  /** Paso 1: el backend devuelve un token temporal (15 min) para ese correo. */
  solicitar(correo: string): Observable<SolicitudRecuperacion> {
    return this.http
      .post<{ tokenRecuperacion: string; correo: string; expiraEnMinutos: number }>(
        `${this.apiUrl}/auth/solicitar-recuperacion`,
        { correo },
      )
      .pipe(map((r) => ({ token: r.tokenRecuperacion, correo: r.correo, minutos: r.expiraEnMinutos })));
  }

  /** Paso 2: con ese token se fija la nueva contraseña (POST /auth/resetear-password). */
  restablecer(token: string, nuevaContrasena: string): Observable<void> {
    return this.http
      .post(`${this.apiUrl}/auth/resetear-password`, { token, nuevaContrasena })
      .pipe(map(() => undefined));
  }
}
