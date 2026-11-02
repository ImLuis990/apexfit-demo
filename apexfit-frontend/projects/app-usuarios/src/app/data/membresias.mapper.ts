import { MembresiaDto } from './dtos';
import { diasEntre } from './formato';

export type EstadoMembresia =
  | { tipo: 'sin-membresia' }
  | { tipo: 'activa'; plan: string; vence: string; diasRestantes: number; porVencer: boolean }
  | { tipo: 'vencida'; plan: string; vencio: string }
  | { tipo: 'cancelada'; plan: string };

/** RF-09: se considera "por vencer" cuando faltan 7 días o menos. */
export const DIAS_POR_VENCER = 7;

const capitalizar = (t: string) => t.trim().charAt(0).toUpperCase() + t.trim().slice(1);

/**
 * El campo `estado` del backend no cambia solo cuando pasa la fecha de fin, así que la
 * vigencia se calcula con las fechas: está activa si su estado es 'activa' Y no ha vencido.
 */
export function resumirMembresia(lista: MembresiaDto[], hoy: string): EstadoMembresia {
  if (lista.length === 0) return { tipo: 'sin-membresia' };

  const porFechaFinDesc = [...lista].sort((a, b) => b.fechaFin.localeCompare(a.fechaFin));

  const vigente = porFechaFinDesc.find(
    (m) => m.estado?.toLowerCase() === 'activa' && m.fechaFin >= hoy,
  );
  if (vigente) {
    const diasRestantes = diasEntre(hoy, vigente.fechaFin);
    return {
      tipo: 'activa',
      plan: capitalizar(vigente.tipo),
      vence: vigente.fechaFin,
      diasRestantes,
      porVencer: diasRestantes <= DIAS_POR_VENCER,
    };
  }

  const ultima = porFechaFinDesc[0];
  if (ultima.estado?.toLowerCase() === 'cancelada') {
    return { tipo: 'cancelada', plan: capitalizar(ultima.tipo) };
  }
  return { tipo: 'vencida', plan: capitalizar(ultima.tipo), vencio: ultima.fechaFin };
}
