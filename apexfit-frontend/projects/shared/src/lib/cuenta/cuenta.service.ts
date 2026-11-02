import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API_URL } from '../auth/auth.tokens';

export interface PerfilCuenta {
  id: number;
  nombre: string;
  apellido: string;
  correo: string;
  telefono: string | null;
  fechaNacimiento: string | null; // 'yyyy-MM-dd'
}

interface UsuarioDto {
  idUsuario: number;
  nombre: string;
  apellido: string;
  correo: string;
  telefono: string | null;
  fechaNacimiento: string | null;
}

/** Datos de la cuenta del usuario con sesión y cambio de contraseña (sirve a los tres roles). */
@Injectable({ providedIn: 'root' })
export class CuentaService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(API_URL);

  perfil(): Observable<PerfilCuenta> {
    return this.http.get<UsuarioDto>(`${this.apiUrl}/usuarios/perfil`).pipe(
      map((u) => ({
        id: u.idUsuario,
        nombre: u.nombre,
        apellido: u.apellido,
        correo: u.correo,
        telefono: u.telefono ?? null,
        fechaNacimiento: u.fechaNacimiento ?? null,
      })),
    );
  }

  cambiarContrasena(contrasenaActual: string, nuevaContrasena: string): Observable<void> {
    return this.http
      .put(`${this.apiUrl}/usuarios/cambiar-password`, { contrasenaActual, nuevaContrasena })
      .pipe(map(() => undefined));
  }
}
