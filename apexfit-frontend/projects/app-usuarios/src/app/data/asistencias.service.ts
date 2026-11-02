import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable, of } from 'rxjs';
import { API_URL, AuthService } from 'shared';

/** Como lo devuelve GET /asistencias/usuario/{id}. */
export interface AsistenciaDto {
  idAsistencia: number;
  idUsuario: number;
  fecha: string; // 'yyyy-MM-dd'
  horaEntrada: string; // 'HH:mm:ss'
  horaSalida: string | null;
  metodoRegistro: string; // 'qr' | 'manual'
}

export interface Asistencia {
  id: number;
  fecha: string; // 'yyyy-MM-dd'
  entrada: string; // 'HH:mm'
  salida: string | null; // null = aún en el gimnasio
  metodo: 'QR' | 'Manual';
}

const hhmm = (hora: string): string => hora.slice(0, 5);

export function aAsistencia(dto: AsistenciaDto): Asistencia {
  return {
    id: dto.idAsistencia,
    fecha: dto.fecha,
    entrada: hhmm(dto.horaEntrada),
    salida: dto.horaSalida ? hhmm(dto.horaSalida) : null,
    metodo: dto.metodoRegistro.toLowerCase() === 'qr' ? 'QR' : 'Manual',
  };
}

/** Lo más reciente primero. */
export function ordenarRecientes(lista: Asistencia[]): Asistencia[] {
  return [...lista].sort((a, b) => b.fecha.localeCompare(a.fecha) || b.entrada.localeCompare(a.entrada));
}

@Injectable({ providedIn: 'root' })
export class AsistenciasService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(API_URL);
  private readonly auth = inject(AuthService);

  /** Historial de asistencia del cliente con sesión, del más reciente al más antiguo. */
  historial(): Observable<Asistencia[]> {
    const idUsuario = this.auth.session()?.id;
    if (idUsuario === undefined) return of([]);
    return this.http
      .get<AsistenciaDto[]>(`${this.apiUrl}/asistencias/usuario/${idUsuario}`)
      .pipe(map((lista) => ordenarRecientes(lista.map(aAsistencia))));
  }
}
