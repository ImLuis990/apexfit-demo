import { DiaSemana } from './rutinas.models';

/** Una rutina que creó el entrenador, lista para la tabla. */
export interface RutinaDelEntrenador {
  id: number;
  nombre: string;
  descripcion: string | null;
  idEntrenador: number;
  idCliente: number;
  cliente: string;
  /** 'yyyy-MM-dd', o null si el backend no envía la fecha. */
  creada: string | null;
  activa: boolean;
}

/** Un ejercicio dentro de la rutina que se está editando. */
export interface LineaEditable {
  /** null = línea nueva, todavía sin guardar. */
  idLinea: number | null;
  idEjercicio: number;
  ejercicio: string;
  dia: DiaSemana | '';
  series: number;
  repeticiones: number;
  descansoSeg: number | null;
}

export interface CambiosRutina {
  nombre: string;
  descripcion: string;
  lineas: LineaEditable[];
}

/** Qué hay que pedirle al backend para pasar de las líneas originales a las editadas. */
export interface PlanDeLineas {
  agregar: LineaEditable[];
  actualizar: LineaEditable[];
  /** ids de las líneas que se quitaron. */
  quitar: number[];
}

export interface DatosMisRutinas {
  rutinas: RutinaDelEntrenador[];
  /** Cuántas rutinas hay en total en el backend (por si no cupieron todas en la carga). */
  total: number;
}
