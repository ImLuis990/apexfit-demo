/** Estado de algo que se pide al backend: cargando, con error o listo. */
export type Carga<T> =
  | { tipo: 'cargando' }
  | { tipo: 'error'; mensaje: string }
  | { tipo: 'listo'; datos: T };
