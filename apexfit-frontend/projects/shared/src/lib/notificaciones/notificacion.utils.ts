import { Rol } from '../auth/auth.models';

/** Los tipos que hoy genera el backend. Un tipo nuevo o desconocido no rompe nada: usa el ícono genérico. */
export const TIPOS_NOTIFICACION = [
  'RUTINA_ASIGNADA',
  'RUTINA_ACTUALIZADA',
  'ENTRENADOR_ASIGNADO',
  'CLIENTE_ASIGNADO',
  'MEMBRESIA_RENOVADA',
  'MEMBRESIA_POR_VENCER',
  'MEMBRESIA_VENCIDA',
  'CLIENTE_INACTIVO',
  'CLIENTE_SIN_RUTINA',
  'SESION_TERMINADA',
  'RESUMEN_MEMBRESIAS',
  'RESUMEN_INACTIVOS',
] as const;

export type EstiloNotificacion = 'peligro' | 'aviso' | 'neutro';
export type IconoNotificacion = 'membresia' | 'rutina' | 'persona' | 'inactivo' | 'sesion' | 'resumen' | 'generico';

/** Membresía vencida en rojo, por vencer en ámbar, el resto neutro. */
export function estiloDe(tipo: string): EstiloNotificacion {
  if (tipo === 'MEMBRESIA_VENCIDA') return 'peligro';
  if (tipo === 'MEMBRESIA_POR_VENCER') return 'aviso';
  return 'neutro';
}

export function iconoDe(tipo: string): IconoNotificacion {
  if (tipo.startsWith('MEMBRESIA_')) return 'membresia';
  if (tipo.startsWith('RUTINA_') || tipo === 'CLIENTE_SIN_RUTINA') return 'rutina';
  if (tipo === 'ENTRENADOR_ASIGNADO' || tipo === 'CLIENTE_ASIGNADO') return 'persona';
  if (tipo === 'CLIENTE_INACTIVO') return 'inactivo';
  if (tipo === 'SESION_TERMINADA') return 'sesion';
  if (tipo.startsWith('RESUMEN_')) return 'resumen';
  return 'generico';
}

/**
 * Pantalla a la que lleva una notificación, según el tipo y el rol de quien la recibe (las rutas son las de su
 * propia app). null = ese tipo no tiene pantalla: al pulsarla solo se marca como leída.
 * Ojo: CLIENTE_INACTIVO y CLIENTE_SIN_RUTINA le llegan también al propio cliente, por eso depende del rol.
 */
export function rutaDeNotificacion(tipo: string, rol: Rol | null | undefined): string | null {
  switch (rol) {
    case 'cliente':
      if (tipo.startsWith('MEMBRESIA_')) return '/mi-qr';
      if (tipo === 'RUTINA_ASIGNADA' || tipo === 'RUTINA_ACTUALIZADA' || tipo === 'CLIENTE_SIN_RUTINA') return '/rutina';
      if (tipo === 'CLIENTE_INACTIVO') return '/historial';
      return null;
    case 'entrenador':
      return ['CLIENTE_ASIGNADO', 'CLIENTE_SIN_RUTINA', 'CLIENTE_INACTIVO', 'SESION_TERMINADA'].includes(tipo) ? '/clientes' : null;
    case 'administrador':
      if (tipo === 'RESUMEN_MEMBRESIAS') return '/membresias';
      if (tipo === 'RESUMEN_INACTIVOS') return '/inactividad';
      return null;
    default:
      return null;
  }
}

/** «ahora», «hace 5 min», «hace 2 h», «hace 3 días» y, pasada una semana, la fecha dd/MM/yyyy. */
export function horaRelativa(creadaEn: string, ahora: number = Date.now()): string {
  const t = new Date(creadaEn).getTime();
  if (Number.isNaN(t)) return '';
  const segundos = Math.max(0, Math.round((ahora - t) / 1000));
  if (segundos < 60) return 'ahora';
  const minutos = Math.floor(segundos / 60);
  if (minutos < 60) return `hace ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `hace ${horas} h`;
  const dias = Math.floor(horas / 24);
  if (dias < 7) return `hace ${dias} ${dias === 1 ? 'día' : 'días'}`;
  const f = new Date(t);
  const dd = String(f.getDate()).padStart(2, '0');
  const mm = String(f.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${f.getFullYear()}`;
}
