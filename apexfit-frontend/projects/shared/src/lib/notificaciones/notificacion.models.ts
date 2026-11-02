/** Un elemento de la página que responde GET /api/v1/notificaciones. */
export interface NotificacionDto {
  idNotificacion: number;
  tipo: string;
  titulo: string;
  mensaje: string;
  referenciaId: number | null;
  /** Fecha y hora sin zona (la del servidor), p. ej. «2026-10-31T10:15:00». */
  creadaEn: string;
  leida: boolean;
}

export interface PaginaNotificaciones {
  content: NotificacionDto[];
  totalElements: number;
}

/** Lo que usa la interfaz. */
export interface Notificacion {
  id: number;
  tipo: string;
  titulo: string;
  mensaje: string;
  referenciaId: number | null;
  creadaEn: string;
  leida: boolean;
}

export const TAMANO_PAGINA_NOTIFICACIONES = 20;

export const aNotificacion = (d: NotificacionDto): Notificacion => ({
  id: d.idNotificacion,
  tipo: d.tipo,
  titulo: d.titulo,
  mensaje: d.mensaje,
  referenciaId: d.referenciaId ?? null,
  creadaEn: d.creadaEn,
  leida: !!d.leida,
});
