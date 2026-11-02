import { HttpErrorResponse } from '@angular/common/http';

/** Mensaje en español para cuando falla una carga. */
export function mensajeDeError(error: unknown, queCargaba: string): string {
  if (error instanceof HttpErrorResponse && error.status === 0) {
    return 'No se pudo conectar con el servidor. Revisa tu conexión e intenta de nuevo.';
  }
  if (error instanceof HttpErrorResponse && error.status === 403) {
    return 'No tienes permiso para ver esta información.';
  }
  return `No pudimos cargar ${queCargaba}. Intenta de nuevo.`;
}

/** Mensaje en español para cuando falla guardar, crear, editar o desactivar. */
export function mensajeDeGuardado(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) return 'No se pudo conectar con el servidor. Intenta de nuevo.';
    if (error.status === 403) return 'No tienes permiso para hacer esto.';
    if (error.status === 404) return 'Ese usuario ya no existe. Actualiza la lista.';
    if (error.status === 400) {
      const detalle = error.error?.validationErrors as Record<string, string> | null | undefined;
      if (detalle && Object.keys(detalle).length > 0) {
        return `Revisa los datos: ${Object.values(detalle).join('. ')}.`;
      }
      if (/correo ya est[aá] en uso/i.test(String(error.error?.message ?? ''))) {
        return 'Ese correo ya está registrado con otro usuario.';
      }
    }
  }
  return 'No pudimos guardar los cambios. Intenta de nuevo.';
}
