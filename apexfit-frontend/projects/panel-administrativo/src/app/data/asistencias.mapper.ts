import { AsistenciaDto } from './dtos';
import { Asistencia, CodigoLeido } from './asistencias.models';

export function aAsistencia(dto: AsistenciaDto): Asistencia {
  return {
    id: dto.idAsistencia ?? 0,
    idUsuario: dto.idUsuario,
    fecha: dto.fecha,
    horaEntrada: dto.horaEntrada,
    horaSalida: dto.horaSalida ?? null,
    metodo: (dto.metodoRegistro ?? '').toLowerCase(),
  };
}

/** Las de un día, la entrada más reciente primero. */
export function deDia(lista: Asistencia[], dia: string): Asistencia[] {
  return lista.filter((a) => a.fecha === dia).sort((a, b) => b.horaEntrada.localeCompare(a.horaEntrada));
}

export const estaAdentro = (a: Asistencia): boolean => a.horaSalida === null;

/** PUT /asistencias/{id}: el backend exige reenviar todos los campos; solo cambia la hora de salida. */
export function aDtoConSalida(a: Asistencia, horaSalida: string): AsistenciaDto {
  return {
    idAsistencia: a.id,
    idUsuario: a.idUsuario,
    fecha: a.fecha,
    horaEntrada: a.horaEntrada,
    horaSalida,
    metodoRegistro: a.metodo,
  };
}

/**
 * Interpreta lo que llega del lector de QR (o lo que se escribe). Acepta los mismos formatos
 * que el backend: "APEXFIT-USER-{id}-{correo}", un id suelto o un correo.
 */
export function leerCodigo(texto: string): CodigoLeido | null {
  const t = texto.trim();
  if (!t) return null;

  if (t.toUpperCase().startsWith('APEXFIT-USER-')) {
    const id = Number(t.split('-')[2]);
    return Number.isInteger(id) && id > 0 ? { tipo: 'id', id } : null;
  }
  if (/^\d+$/.test(t)) return { tipo: 'id', id: Number(t) };
  if (t.includes('@')) return { tipo: 'correo', correo: t.toLowerCase() };
  return null;
}

/** Última fecha con asistencia de cada usuario ('yyyy-MM-dd'). */
export function ultimaAsistenciaPorUsuario(lista: Asistencia[]): Map<number, string> {
  const mapa = new Map<number, string>();
  for (const a of lista) {
    const previa = mapa.get(a.idUsuario);
    if (!previa || a.fecha > previa) mapa.set(a.idUsuario, a.fecha);
  }
  return mapa;
}

/** Texto que lleva el QR de un cliente (el mismo formato que usa la app de usuarios). */
export const codigoDe = (u: { id: number; correo: string }): string => `APEXFIT-USER-${u.id}-${u.correo}`;
