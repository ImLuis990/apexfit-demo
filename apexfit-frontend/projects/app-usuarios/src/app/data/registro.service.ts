import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API_URL } from 'shared';

export interface DatosRegistro {
  nombre: string;
  apellido: string;
  correo: string;
  telefono: string | null;
  contrasena: string;
}

@Injectable({ providedIn: 'root' })
export class RegistroService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(API_URL);

  /**
   * Crea una cuenta de cliente. NO se envía el campo "rol": el registro público debe crear
   * siempre un cliente, y el backend lo decide (así esta pantalla nunca pide ser otra cosa).
   */
  registrar(datos: DatosRegistro): Observable<void> {
    return this.http
      .post(`${this.apiUrl}/auth/register`, {
        nombre: datos.nombre,
        apellido: datos.apellido,
        correo: datos.correo,
        telefono: datos.telefono,
        contrasena: datos.contrasena,
      })
      .pipe(map(() => undefined));
  }
}
