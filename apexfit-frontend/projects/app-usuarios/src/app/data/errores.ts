import { HttpErrorResponse } from '@angular/common/http';

/** Mensaje en español para mostrar cuando falla una carga. */
export function mensajeDeError(error: unknown, queCargaba: string): string {
  if (error instanceof HttpErrorResponse && error.status === 0) {
    return 'No se pudo conectar con el servidor. Revisa tu conexión e intenta de nuevo.';
  }
  return `No pudimos cargar ${queCargaba}. Intenta de nuevo.`;
}
