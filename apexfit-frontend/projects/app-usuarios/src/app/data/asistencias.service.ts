import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable, of } from 'rxjs';
import { API_URL, AuthService } from 'shared';

/** Como lo devuelve GET /asistencias/usuario/{id}. */
export interface AsistenciaDto {
  idAsistencia: number;
  idUsuario: number;
  fecha: string;        // 'yyyy-MM-dd'
  horaEntrada: string;  // 'HH:mm:ss'
  horaSalida: string | null;
  metodoRegistro: string;
}

export interface Asistencia {
  id: number;
  fecha: string;         // 'yyyy-MM-dd'
  entrada: string;       // 'HH:mm'
  salida: string | null; // null = aún en el gimnasio
  duracionMin: number | null; // minutos en el gym, null si sin salida
  metodo: 'QR' | 'Manual';
}

const hhmm = (hora: string): string => hora.slice(0, 5);

/** Calcula duración en minutos entre dos strings 'HH:mm:ss'. */
function calcularDuracion(entrada: string, salida: string): number {
  const [eh, em, es = 0] = entrada.split(':').map(Number);
  const [sh, sm, ss = 0] = salida.split(':').map(Number);
  return (sh * 60 + sm + ss / 60) - (eh * 60 + em + es / 60);
}

export function formatearDuracion(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = Math.round(minutos % 60);
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

export function aAsistencia(dto: AsistenciaDto): Asistencia {
  const duracionMin = dto.horaSalida
    ? calcularDuracion(dto.horaEntrada, dto.horaSalida)
    : null;
  return {
    id: dto.idAsistencia,
    fecha: dto.fecha,
    entrada: hhmm(dto.horaEntrada),
    salida: dto.horaSalida ? hhmm(dto.horaSalida) : null,
    duracionMin,
    metodo: dto.metodoRegistro.toLowerCase() === 'qr' ? 'QR' : 'Manual',
  };
}

/** Lo más reciente primero. */
export function ordenarRecientes(lista: Asistencia[]): Asistencia[] {
  return [...lista].sort(
    (a, b) => b.fecha.localeCompare(a.fecha) || b.entrada.localeCompare(a.entrada)
  );
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

  /** Registra la salida de una asistencia abierta. */
  registrarSalida(idAsistencia: number): Observable<Asistencia> {
    return this.http
      .patch<AsistenciaDto>(`${this.apiUrl}/asistencias/${idAsistencia}/salida`, {})
      .pipe(map(aAsistencia));
  }
}
