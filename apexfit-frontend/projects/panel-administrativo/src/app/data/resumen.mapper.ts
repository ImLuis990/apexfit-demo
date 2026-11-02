import { Asistencia } from './asistencias.models';
import { ultimaAsistenciaPorUsuario } from './asistencias.mapper';
import { diasEntre } from './formato';
import { mejorMembresia } from './membresias.mapper';
import { Membresia } from './membresias.models';
import { Usuario } from './usuarios.models';

/** RF-09: un cliente es "inactivo" si lleva más de 10 días sin asistir. */
export const DIAS_INACTIVIDAD = 10;

export interface FilaPorVencer {
  idUsuario: number;
  nombre: string;
  vence: string;
  diasRestantes: number;
}

export interface FilaInactivo {
  idUsuario: number;
  nombre: string;
  ultima: string | null;
  dias: number | null;
}

export const clientesActivos = (usuarios: Usuario[]): Usuario[] =>
  usuarios.filter((u) => u.rol === 'cliente' && u.activo);

function membresiasDe(membresias: Membresia[], idUsuario: number): Membresia[] {
  return membresias.filter((m) => m.idUsuario === idUsuario);
}

/** Clientes activos cuya membresía vence en 7 días o menos, los que vencen antes primero. */
export function porVencer(usuarios: Usuario[], membresias: Membresia[], hoy: string): FilaPorVencer[] {
  const filas: FilaPorVencer[] = [];
  for (const u of clientesActivos(usuarios)) {
    const mejor = mejorMembresia(membresiasDe(membresias, u.id), hoy);
    if (mejor?.estado === 'por-vencer') {
      filas.push({ idUsuario: u.id, nombre: u.nombreCompleto, vence: mejor.m.fechaFin, diasRestantes: mejor.diasRestantes });
    }
  }
  return filas.sort((a, b) => a.diasRestantes - b.diasRestantes);
}

/** La regla de inactividad: nunca ha asistido (null) o lleva más de `limite` días. La usan Inactividad, Resumen y Mis clientes. */
export const estaInactivo = (dias: number | null, limite: number): boolean => dias === null || dias > limite;

/** Clientes con membresía vigente que no asisten hace más de `limite` días (o que nunca han asistido). */
export function inactivos(
  usuarios: Usuario[],
  membresias: Membresia[],
  asistencias: Asistencia[],
  hoy: string,
  limite = DIAS_INACTIVIDAD,
): FilaInactivo[] {
  const ultimas = ultimaAsistenciaPorUsuario(asistencias);
  const filas: FilaInactivo[] = [];
  for (const u of clientesActivos(usuarios)) {
    const mejor = mejorMembresia(membresiasDe(membresias, u.id), hoy);
    if (mejor?.estado !== 'activa' && mejor?.estado !== 'por-vencer') continue;
    const ultima = ultimas.get(u.id) ?? null;
    const dias = ultima ? diasEntre(ultima, hoy) : null;
    if (estaInactivo(dias, limite)) filas.push({ idUsuario: u.id, nombre: u.nombreCompleto, ultima, dias });
  }
  // primero los que nunca han venido, luego los que llevan más días
  return filas.sort((a, b) => (b.dias ?? Infinity) - (a.dias ?? Infinity));
}

/** Cuántos clientes tienen una membresía que vale hoy. */
export function conMembresiaVigente(usuarios: Usuario[], membresias: Membresia[], hoy: string): number {
  return clientesActivos(usuarios).filter((u) => {
    const e = mejorMembresia(membresiasDe(membresias, u.id), hoy)?.estado;
    return e === 'activa' || e === 'por-vencer';
  }).length;
}

/** Entradas de un día por hora (6:00 a 22:00 como mínimo; más si hay entradas fuera de ese rango). */
export function entradasPorHora(delDia: Asistencia[]): { hora: number; cantidad: number }[] {
  const cuentas = new Map<number, number>();
  for (const a of delDia) {
    const h = Number(a.horaEntrada.slice(0, 2));
    cuentas.set(h, (cuentas.get(h) ?? 0) + 1);
  }
  const horas = [...cuentas.keys()];
  const desde = Math.min(6, ...horas);
  const hasta = Math.max(22, ...horas);
  return Array.from({ length: hasta - desde + 1 }, (_, i) => ({ hora: desde + i, cantidad: cuentas.get(desde + i) ?? 0 }));
}

/**
 * Aforo de un día: personas presentes en cada hora (entraron a esa hora o antes y no habían salido antes de ella).
 * Quien aún no registra salida cuenta hasta `horaActual`. Rango 6:00 a 22:00 como mínimo; más si hay visitas fuera de él.
 */
export function aforoPorHora(delDia: Asistencia[], horaActual: number): { hora: number; personas: number }[] {
  const hh = (t: string) => Number(t.slice(0, 2));
  const tramos = delDia.map((a) => {
    const desde = hh(a.horaEntrada);
    return { desde, hasta: a.horaSalida ? hh(a.horaSalida) : Math.max(horaActual, desde) };
  });
  const extremos = tramos.flatMap((t) => [t.desde, t.hasta]);
  const primera = Math.min(6, ...extremos);
  const ultima = Math.max(22, ...extremos);
  return Array.from({ length: ultima - primera + 1 }, (_, i) => {
    const hora = primera + i;
    return { hora, personas: tramos.filter((t) => t.desde <= hora && hora <= t.hasta).length };
  });
}
