import { estiloDe, horaRelativa, iconoDe, rutaDeNotificacion, TIPOS_NOTIFICACION } from './notificacion.utils';

describe('notificaciones: tipo → pantalla', () => {
  it('cliente: membresía → Mi QR, rutina → Rutina, inactivo → Asistencia; sin entrenador no tiene pantalla', () => {
    for (const t of ['MEMBRESIA_RENOVADA', 'MEMBRESIA_POR_VENCER', 'MEMBRESIA_VENCIDA']) expect(rutaDeNotificacion(t, 'cliente')).toBe('/mi-qr');
    for (const t of ['RUTINA_ASIGNADA', 'RUTINA_ACTUALIZADA', 'CLIENTE_SIN_RUTINA']) expect(rutaDeNotificacion(t, 'cliente')).toBe('/rutina');
    expect(rutaDeNotificacion('CLIENTE_INACTIVO', 'cliente')).toBe('/historial');
    expect(rutaDeNotificacion('ENTRENADOR_ASIGNADO', 'cliente')).toBeNull();
  });

  it('entrenador: asignado, sin rutina, inactivo y sesión terminada → Mis clientes', () => {
    for (const t of ['CLIENTE_ASIGNADO', 'CLIENTE_SIN_RUTINA', 'CLIENTE_INACTIVO', 'SESION_TERMINADA']) {
      expect(rutaDeNotificacion(t, 'entrenador')).toBe('/clientes');
    }
    expect(rutaDeNotificacion('RUTINA_ASIGNADA', 'entrenador')).toBeNull();
  });

  it('administrador: resumen de membresías → Membresías, resumen de inactivos → Inactividad', () => {
    expect(rutaDeNotificacion('RESUMEN_MEMBRESIAS', 'administrador')).toBe('/membresias');
    expect(rutaDeNotificacion('RESUMEN_INACTIVOS', 'administrador')).toBe('/inactividad');
    expect(rutaDeNotificacion('CLIENTE_ASIGNADO', 'administrador')).toBeNull();
  });

  it('un tipo desconocido o sin rol no tiene pantalla, y usa el estilo y el ícono neutros', () => {
    expect(rutaDeNotificacion('TIPO_NUEVO', 'cliente')).toBeNull();
    expect(rutaDeNotificacion('MEMBRESIA_VENCIDA', null)).toBeNull();
    expect([estiloDe('TIPO_NUEVO'), iconoDe('TIPO_NUEVO')]).toEqual(['neutro', 'generico']);
    expect(TIPOS_NOTIFICACION.every((t) => iconoDe(t) !== 'generico')).toBe(true);
  });

  it('vencida en rojo, por vencer en ámbar y el resto neutro', () => {
    expect([estiloDe('MEMBRESIA_VENCIDA'), estiloDe('MEMBRESIA_POR_VENCER'), estiloDe('RUTINA_ASIGNADA')]).toEqual(['peligro', 'aviso', 'neutro']);
  });

  it('hora relativa', () => {
    const ahora = new Date('2026-10-31T12:00:00').getTime();
    expect(horaRelativa('2026-10-31T11:59:40', ahora)).toBe('ahora');
    expect(horaRelativa('2026-10-31T11:55:00', ahora)).toBe('hace 5 min');
    expect(horaRelativa('2026-10-31T10:00:00', ahora)).toBe('hace 2 h');
    expect(horaRelativa('2026-10-29T12:00:00', ahora)).toBe('hace 2 días');
    expect(horaRelativa('2026-10-01T09:00:00', ahora)).toBe('01/10/2026');
    expect(horaRelativa('no es una fecha', ahora)).toBe('');
  });
});
