import { fechaCompleta } from './formato';
import { EstadoMembresia } from './membresias.mapper';

export interface VistaMembresia {
  etiqueta: string;
  estilo: 'ok' | 'warn' | 'danger';
  detalle: string;
}

function cuando(dias: number): string {
  if (dias === 0) return 'vence hoy';
  if (dias === 1) return 'vence mañana';
  return `quedan ${dias} días`;
}

export function armarVistaMembresia(e: EstadoMembresia): VistaMembresia {
  switch (e.tipo) {
    case 'activa':
      return {
        etiqueta: e.porVencer ? 'Por vencer' : 'Activa',
        estilo: e.porVencer ? 'warn' : 'ok',
        detalle: `${e.plan} · vence el ${fechaCompleta(e.vence)} (${cuando(e.diasRestantes)})`,
      };
    case 'vencida':
      return {
        etiqueta: 'Vencida',
        estilo: 'danger',
        detalle: `${e.plan} · venció el ${fechaCompleta(e.vencio)}. Renuévala en recepción.`,
      };
    case 'cancelada':
      return {
        etiqueta: 'Cancelada',
        estilo: 'danger',
        detalle: `${e.plan}. Consulta en recepción para reactivarla.`,
      };
    default:
      return {
        etiqueta: 'Sin membresía',
        estilo: 'warn',
        detalle: 'No tienes una membresía registrada. Consulta en recepción.',
      };
  }
}
