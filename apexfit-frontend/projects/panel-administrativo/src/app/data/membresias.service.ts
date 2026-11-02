import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API_URL } from 'shared';
import { MembresiaDto } from './dtos';
import { aDto, aMembresia } from './membresias.mapper';
import { DatosMembresia, Membresia } from './membresias.models';

@Injectable({ providedIn: 'root' })
export class MembresiasService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(API_URL);

  /** Todas las membresías, la que vence más tarde primero. */
  listar(): Observable<Membresia[]> {
    return this.http.get<MembresiaDto[]>(`${this.apiUrl}/membresias`).pipe(
      map((lista) => lista.map(aMembresia).sort((a, b) => b.fechaFin.localeCompare(a.fechaFin))),
    );
  }

  crear(datos: DatosMembresia): Observable<Membresia> {
    return this.http.post<MembresiaDto>(`${this.apiUrl}/membresias`, aDto(datos)).pipe(map(aMembresia));
  }

  actualizar(original: Membresia, datos: Omit<DatosMembresia, 'idUsuario'>): Observable<Membresia> {
    const cuerpo = aDto({ ...datos, idUsuario: original.idUsuario }, original.id);
    return this.http.put<MembresiaDto>(`${this.apiUrl}/membresias/${original.id}`, cuerpo).pipe(map(aMembresia));
  }

  /**
   * "Cancelar" cambia el estado a 'cancelada' y conserva el registro. No se usa
   * DELETE /membresias/{id} porque ese endpoint borra la fila para siempre.
   */
  cancelar(original: Membresia): Observable<Membresia> {
    return this.actualizar(original, {
      tipo: original.tipo,
      fechaInicio: original.fechaInicio,
      fechaFin: original.fechaFin,
      precio: original.precio,
      estado: 'cancelada',
    });
  }
}
