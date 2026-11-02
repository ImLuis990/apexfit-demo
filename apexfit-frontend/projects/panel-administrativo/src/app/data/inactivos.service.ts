import { inject, Injectable } from '@angular/core';
import { catchError, forkJoin, map, Observable, of } from 'rxjs';
import { AsistenciasService } from './asistencias.service';
import { ConfiguracionService } from './configuracion.service';
import { hoyIso } from './formato';
import { MembresiasService } from './membresias.service';
import { inactivos } from './resumen.mapper';
import { Usuario } from './usuarios.models';

/** Quiénes están inactivos hoy, con el mismo cálculo y los mismos días que la pantalla Inactividad. */
@Injectable({ providedIn: 'root' })
export class InactivosService {
  private readonly asistencias = inject(AsistenciasService);
  private readonly membresias = inject(MembresiasService);
  private readonly configuracion = inject(ConfiguracionService);

  /** Si falla algún dato devuelve vacío: la etiqueta es un extra y no debe romper la pantalla que la usa. */
  ids(usuarios: Usuario[]): Observable<number[]> {
    return forkJoin({
      asistencias: this.asistencias.listar(),
      membresias: this.membresias.listar(),
      dias: this.configuracion.obtenerDiasInactividad(),
    }).pipe(
      map(({ asistencias, membresias, dias }) =>
        inactivos(usuarios, membresias, asistencias, hoyIso(), dias).map((f) => f.idUsuario),
      ),
      catchError(() => of<number[]>([])),
    );
  }
}
