import { Usuario } from './usuarios.models';

/** Una fila de la tabla entrenador_cliente, lista para usar en pantalla. */
export interface Asignacion {
  id: number;
  idEntrenador: number;
  idCliente: number;
  /** 'yyyy-MM-dd', o null si el backend no envía la fecha. */
  desde: string | null;
  estado: string;
  /** false cuando el backend la marcó 'inactiva' (ya no cuenta como cliente del entrenador). */
  vigente: boolean;
}

/** Un cliente dentro de la tarjeta de un entrenador. */
export interface ClienteDeEntrenador {
  asignacion: Asignacion;
  idCliente: number;
  nombre: string;
  correo: string;
}

export interface FilaEntrenador {
  entrenador: Usuario;
  clientes: ClienteDeEntrenador[];
}

/** Todo lo que pinta la pantalla, calculado a partir de las asignaciones y los usuarios. */
export interface Tablero {
  entrenadores: FilaEntrenador[];
  /** Clientes activos que ningún entrenador atiende hoy. */
  sinEntrenador: Usuario[];
  /** Clientes activos que tienen al menos un entrenador vigente. */
  conEntrenador: number;
}

/** Clientes que se pueden sumar a un entrenador, separados por si ya tienen otro. */
export interface OpcionesCliente {
  libres: Usuario[];
  conOtros: { cliente: Usuario; entrenadores: string[] }[];
}

export const TABLERO_VACIO: Tablero = { entrenadores: [], sinEntrenador: [], conEntrenador: 0 };
