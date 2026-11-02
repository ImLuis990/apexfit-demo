import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API_URL } from 'shared';
import { aAsistencia, aDtoConSalida } from './asistencias.mapper';
import { Asistencia } from './asistencias.models';
import { AsistenciaDto } from './dtos';
import { horaActual, hoyIso } from './formato';

@Injectable({ providedIn: 'root' })
export class AsistenciasService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(API_URL);

  /** Todas las asistencias (el backend no pagina ni filtra por fecha: se filtra en la pantalla). */
  listar(): Observable<Asistencia[]> {
    return this.http.get<AsistenciaDto[]>(`${this.apiUrl}/asistencias`).pipe(map((l) => l.map(aAsistencia)));
  }

  /** Entrada con el código del QR. El backend pone la fecha y la hora. */
  registrarQr(codigo: string): Observable<Asistencia> {
    return this.http
      .post<AsistenciaDto>(`${this.apiUrl}/asistencias/escanear-qr`, { qrData: codigo })
      .pipe(map(aAsistencia));
  }

  /** Entrada manual (sin código). Aquí fecha y hora las manda el panel. */
  registrarManual(idUsuario: number): Observable<Asistencia> {
    return this.http
      .post<AsistenciaDto>(`${this.apiUrl}/asistencias`, {
        idUsuario,
        fecha: hoyIso(),
        horaEntrada: horaActual(),
        metodoRegistro: 'manual',
      })
      .pipe(map(aAsistencia));
  }

  registrarSalida(a: Asistencia): Observable<Asistencia> {
    return this.http
      .put<AsistenciaDto>(`${this.apiUrl}/asistencias/${a.id}`, aDtoConSalida(a, horaActual()))
      .pipe(map(aAsistencia));
  }
}
