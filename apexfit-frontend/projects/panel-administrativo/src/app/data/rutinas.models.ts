export type DiaSemana = 'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes' | 'sabado' | 'domingo';

export const DIAS: readonly { valor: DiaSemana; etiqueta: string }[] = [
  { valor: 'lunes', etiqueta: 'Lunes' },
  { valor: 'martes', etiqueta: 'Martes' },
  { valor: 'miercoles', etiqueta: 'Miércoles' },
  { valor: 'jueves', etiqueta: 'Jueves' },
  { valor: 'viernes', etiqueta: 'Viernes' },
  { valor: 'sabado', etiqueta: 'Sábado' },
  { valor: 'domingo', etiqueta: 'Domingo' },
];

export interface EjercicioCatalogo {
  id: number;
  nombre: string;
  grupoMuscular: string | null;
}

/** Un ejercicio dentro de la rutina que arma el entrenador. */
export interface LineaRutina {
  idEjercicio: number;
  dia: DiaSemana;
  series: number;
  repeticiones: number;
  descansoSeg: number | null;
}

export interface NuevaRutina {
  nombre: string;
  descripcion: string | null;
  lineas: LineaRutina[];
}

/** Qué pasó al asignar la rutina a un cliente. */
export interface ResultadoAsignacion {
  idCliente: number;
  ok: boolean;
  /** La rutina nueva quedó guardada, pero algo secundario falló (p. ej. desactivar la anterior). */
  advertencia?: string;
  error?: unknown;
}
