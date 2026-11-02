/** Cuerpo del backend para ejercicios (el DTO de rutinas solo trae id, nombre y grupo). */
export interface EjercicioCompletoDto {
  idEjercicio?: number;
  nombre: string;
  grupoMuscular?: string | null;
  videoUrl?: string | null;
  nivelDificultad?: string | null;
}

/** Los únicos valores que acepta la columna nivel_dificultad. */
export const NIVELES = ['principiante', 'intermedio', 'avanzado'] as const;

export interface Ejercicio {
  id: number;
  nombre: string;
  grupoMuscular: string | null;
  videoUrl: string | null;
  nivel: string | null;
}

/** Lo que escribe el usuario en el formulario (todo texto; vacío = sin dato). */
export interface FormEjercicio {
  nombre: string;
  grupoMuscular: string;
  nivel: string;
  videoUrl: string;
}

export interface EjercicioEjemplo {
  nombre: string;
  grupoMuscular: string;
  nivel: (typeof NIVELES)[number];
}

/** Catálogo básico para probar Nueva rutina en una base limpia. */
export const EJEMPLOS: readonly EjercicioEjemplo[] = [
  { nombre: 'Press de banca', grupoMuscular: 'Pecho', nivel: 'intermedio' },
  { nombre: 'Flexiones', grupoMuscular: 'Pecho', nivel: 'principiante' },
  { nombre: 'Aperturas con mancuernas', grupoMuscular: 'Pecho', nivel: 'principiante' },
  { nombre: 'Dominadas', grupoMuscular: 'Espalda', nivel: 'avanzado' },
  { nombre: 'Remo con barra', grupoMuscular: 'Espalda', nivel: 'intermedio' },
  { nombre: 'Jalón al pecho', grupoMuscular: 'Espalda', nivel: 'principiante' },
  { nombre: 'Sentadilla con barra', grupoMuscular: 'Piernas', nivel: 'intermedio' },
  { nombre: 'Prensa de piernas', grupoMuscular: 'Piernas', nivel: 'principiante' },
  { nombre: 'Peso muerto rumano', grupoMuscular: 'Piernas', nivel: 'avanzado' },
  { nombre: 'Press militar', grupoMuscular: 'Hombros', nivel: 'intermedio' },
  { nombre: 'Curl de bíceps con mancuernas', grupoMuscular: 'Bíceps', nivel: 'principiante' },
  { nombre: 'Fondos en banco', grupoMuscular: 'Tríceps', nivel: 'principiante' },
  { nombre: 'Plancha abdominal', grupoMuscular: 'Abdomen', nivel: 'principiante' },
  { nombre: 'Puente de glúteos', grupoMuscular: 'Glúteos', nivel: 'principiante' },
  { nombre: 'Trote en cinta', grupoMuscular: 'Cardio', nivel: 'principiante' },
];
