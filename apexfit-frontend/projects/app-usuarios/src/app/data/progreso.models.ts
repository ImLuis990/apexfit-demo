export type TipoMedida = 'cintura' | 'biceps' | 'pecho';

export const TIPOS_MEDIDA: readonly { tipo: TipoMedida; etiqueta: string }[] = [
  { tipo: 'cintura', etiqueta: 'Cintura' },
  { tipo: 'biceps', etiqueta: 'Bíceps' },
  { tipo: 'pecho', etiqueta: 'Pecho' },
];

export interface RegistroProgreso {
  id: number;
  fecha: string; // 'yyyy-MM-dd'
  peso: number; // kg
  altura: number | null; // m
  imc: number | null;
  observaciones: string | null;
  /** Medidas en cm, con la clave normalizada ('biceps', sin tildes ni mayúsculas). */
  medidas: Record<string, number>;
}

/** Lo que se puede cambiar de un registro ya guardado (el backend solo actualiza estos campos). */
export interface CambiosRegistro {
  peso: number;
  altura: number | null;
  observaciones: string | null;
}

/** Lo que el cliente escribe en el formulario. */
export interface NuevoRegistro {
  fecha: string;
  peso: number;
  altura: number | null;
  observaciones: string | null;
  medidas: Partial<Record<TipoMedida, number>>;
}

export interface ResumenProgreso {
  actual: RegistroProgreso;
  /** Cambio de peso respecto al registro anterior (kg); null si solo hay un registro. */
  variacionPeso: number | null;
  /** Hasta los últimos 6 pesos, del más antiguo al más reciente. */
  serie: { fecha: string; peso: number }[];
  altura: number | null;
  imc: number | null;
  medidas: { tipo: TipoMedida; etiqueta: string; valor: number | null }[];
}
