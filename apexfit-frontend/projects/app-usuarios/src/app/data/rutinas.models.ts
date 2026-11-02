/** Modelos que usan las pantallas (independientes de cómo los envíe el backend). */

export type DiaSemana =
  | 'lunes'
  | 'martes'
  | 'miercoles'
  | 'jueves'
  | 'viernes'
  | 'sabado'
  | 'domingo';

export const DIAS: readonly DiaSemana[] = [
  'lunes',
  'martes',
  'miercoles',
  'jueves',
  'viernes',
  'sabado',
  'domingo',
];

export const ETIQUETA_DIA: Record<DiaSemana, string> = {
  lunes: 'Lunes',
  martes: 'Martes',
  miercoles: 'Miércoles',
  jueves: 'Jueves',
  viernes: 'Viernes',
  sabado: 'Sábado',
  domingo: 'Domingo',
};

export const ABREVIATURA_DIA: Record<DiaSemana, string> = {
  lunes: 'LUN',
  martes: 'MAR',
  miercoles: 'MIÉ',
  jueves: 'JUE',
  viernes: 'VIE',
  sabado: 'SÁB',
  domingo: 'DOM',
};

export interface EjercicioRutina {
  id: number;
  idEjercicio: number;
  nombre: string;
  grupoMuscular: string | null;
  series: number;
  repeticiones: number;
  descansoSeg: number | null;
  /** Enlace al video del ejercicio, si el catálogo lo tiene. */
  videoUrl?: string;
}

export interface DiaRutina {
  /** null = ejercicios que el entrenador no asignó a un día concreto. */
  dia: DiaSemana | null;
  etiqueta: string;
  abreviatura: string;
  /** Grupos musculares distintos del día, p. ej. ['Piernas', 'Glúteos']. */
  grupos: string[];
  ejercicios: EjercicioRutina[];
}

export interface RutinaActiva {
  id: number;
  nombre: string;
  descripcion: string | null;
  dias: DiaRutina[];
}

/** Día de la semana de una fecha (getDay() devuelve 0 para domingo). */
export function diaDeHoy(fecha: Date = new Date()): DiaSemana {
  const porIndice: DiaSemana[] = [
    'domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado',
  ];
  return porIndice[fecha.getDay()];
}
