export interface Membresia {
  id: number;
  idUsuario: number;
  tipo: string;
  fechaInicio: string;
  fechaFin: string;
  precio: number;
  estado: string; // lo que guarda el backend: 'activa' | 'vencida' | 'cancelada'
}

/** Lo que el administrador escribe en el formulario. */
export interface DatosMembresia {
  idUsuario: number;
  tipo: string;
  fechaInicio: string;
  fechaFin: string;
  precio: number;
  estado?: string;
}

/**
 * Planes del diseño. El backend guarda `tipo` como texto libre y no tiene tabla de planes:
 * estos valores solo rellenan el formulario y se pueden cambiar a mano.
 */
export interface Plan {
  nombre: string;
  dias: number;
  precio: number;
}

export const PLANES: readonly Plan[] = [
  { nombre: 'Mensual', dias: 30, precio: 90_000 },
  { nombre: 'Trimestral', dias: 90, precio: 240_000 },
  { nombre: 'Anual', dias: 365, precio: 800_000 },
];

/** RF-09: "por vencer" cuando faltan 7 días o menos. */
export const DIAS_POR_VENCER = 7;

/** Estado real de una membresía: se calcula con las fechas, porque el backend no actualiza `estado` solo. */
export type EstadoEfectivo = 'activa' | 'por-vencer' | 'vencida' | 'cancelada';

export const ETIQUETA_ESTADO: Record<EstadoEfectivo, string> = {
  'activa': 'Activa',
  'por-vencer': 'Por vencer',
  'vencida': 'Vencida',
  'cancelada': 'Cancelada',
};

export interface Filtros {
  texto: string;
  estado: EstadoEfectivo | 'todas';
}
