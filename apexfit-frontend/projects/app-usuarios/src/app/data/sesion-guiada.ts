/**
 * Avance del modo guiado «Iniciar rutina de hoy». El backend todavía no guarda ejercicios completados,
 * así que vive en el navegador: una entrada por usuario y por día.
 */
export interface Sesion {
  rutinaId: number;
  /** Ids de las líneas de la rutina (EjercicioRutina.id) que faltan, en el orden en que se muestran: el primero es el actual. */
  pendientes: number[];
  completados: number[];
  /** Los pendientes que ya se aplazaron al menos una vez. */
  aplazados: number[];
  terminada: boolean;
}

export const iniciarSesion = (rutinaId: number, ids: readonly number[]): Sesion => ({
  rutinaId,
  pendientes: [...ids],
  completados: [],
  aplazados: [],
  terminada: ids.length === 0,
});

export const actualId = (s: Sesion): number | null => (s.terminada ? null : (s.pendientes[0] ?? null));

/** Queda algo por hacer y todo lo que queda ya se aplazó: ya no hay ejercicios «nuevos». */
export const soloAplazados = (s: Sesion): boolean =>
  !s.terminada && s.pendientes.length > 0 && s.pendientes.every((id) => s.aplazados.includes(id));

/** Marca el ejercicio actual como hecho y pasa al siguiente; al quedar sin pendientes, termina. */
export function completar(s: Sesion): Sesion {
  const id = actualId(s);
  if (id === null) return s;
  const pendientes = s.pendientes.slice(1);
  return {
    ...s,
    pendientes,
    completados: [...s.completados, id],
    aplazados: s.aplazados.filter((a) => a !== id),
    terminada: pendientes.length === 0,
  };
}

/** Manda el ejercicio actual al final de la fila (la máquina está ocupada). Con uno solo no hay a dónde mandarlo. */
export function aplazar(s: Sesion): Sesion {
  const id = actualId(s);
  if (id === null || s.pendientes.length < 2) return s;
  return {
    ...s,
    pendientes: [...s.pendientes.slice(1), id],
    aplazados: s.aplazados.includes(id) ? s.aplazados : [...s.aplazados, id],
  };
}

/** Cierra la sesión dejando sin hacer los aplazados. Solo se permite cuando ya no queda nada más. */
export function terminar(s: Sesion): Sesion {
  return soloAplazados(s) ? { ...s, terminada: true } : s;
}

// ── contrato con el servidor: PUT y GET /api/v1/sesiones-entrenamiento/hoy ──
// El servidor guarda, por cada ejercicio, completado, aplazado o pendiente; NO guarda el orden de la fila.

/** La forma de la solicitud (PUT) y de la respuesta (GET) del avance de hoy. */
export interface AvanceDto {
  idSesion?: number;
  fecha?: string;
  idRutina: number;
  terminada: boolean;
  ejercicios: { idRutinaEjercicio: number; estado: string }[];
}

/** Lo que se envía al servidor: TODOS los ejercicios de hoy (él reemplaza la lista completa), en el orden de la rutina. */
export function aSolicitud(rutinaId: number, ids: readonly number[], s: Sesion): AvanceDto {
  return {
    idRutina: rutinaId,
    terminada: s.terminada,
    ejercicios: ids.map((id) => ({
      idRutinaEjercicio: id,
      estado: s.completados.includes(id) ? 'completado' : s.aplazados.includes(id) ? 'aplazado' : 'pendiente',
    })),
  };
}

/**
 * Reconstruye la sesión desde lo que guardó el servidor. Como no guarda el orden, los pendientes quedan en el orden
 * de la rutina y los aplazados al final. Devuelve null si el avance es de otra rutina o de otros ejercicios.
 */
export function deRespuesta(r: AvanceDto, rutinaId: number, ids: readonly number[]): Sesion | null {
  if (r.idRutina !== rutinaId) return null;
  const estados = new Map(r.ejercicios.map((e) => [e.idRutinaEjercicio, e.estado]));
  if (estados.size !== ids.length || !ids.every((id) => estados.has(id))) return null;
  const completados = ids.filter((id) => estados.get(id) === 'completado');
  const aplazados = ids.filter((id) => estados.get(id) === 'aplazado');
  const nuevos = ids.filter((id) => !completados.includes(id) && !aplazados.includes(id));
  return { rutinaId, completados, aplazados, pendientes: [...nuevos, ...aplazados], terminada: !!r.terminada };
}

/**
 * Al abrir: el servidor manda (así se retoma en otro dispositivo), salvo que el respaldo del navegador vaya más
 * adelantado (se avanzó sin red): entonces gana el respaldo y hay que subirlo.
 */
export function elegirAvance(local: Sesion | null, servidor: Sesion | null): { sesion: Sesion | null; subir: boolean } {
  if (!local) return { sesion: servidor, subir: false };
  if (!servidor) return { sesion: local, subir: true };
  const progreso = (s: Sesion) => s.completados.length + (s.terminada ? 0.5 : 0);
  return progreso(local) > progreso(servidor) ? { sesion: local, subir: true } : { sesion: servidor, subir: false };
}

// ── persistencia (localStorage; si no está disponible, la sesión sigue en memoria) ──

export const claveSesion = (idUsuario: number, fecha: string): string => `apexfit.sesion.${idUsuario}.${fecha}`;

const esListaDeNumeros = (v: unknown): v is number[] => Array.isArray(v) && v.every((n) => typeof n === 'number');

/**
 * Lee el avance guardado. Devuelve null si no hay, si está dañado, o si ya no corresponde a la rutina de hoy
 * (el entrenador pudo cambiarla): en ese caso se empieza de cero.
 */
export function leerAvance(clave: string, rutinaId: number, ids: readonly number[], almacen: Storage = localStorage): Sesion | null {
  try {
    const crudo = almacen.getItem(clave);
    if (!crudo) return null;
    const s = JSON.parse(crudo) as Partial<Sesion>;
    if (
      s.rutinaId !== rutinaId ||
      typeof s.terminada !== 'boolean' ||
      !esListaDeNumeros(s.pendientes) ||
      !esListaDeNumeros(s.completados) ||
      !esListaDeNumeros(s.aplazados)
    ) {
      return null;
    }
    const guardados = [...s.pendientes, ...s.completados];
    if (guardados.length !== ids.length || !ids.every((id) => guardados.includes(id))) return null;
    return s as Sesion;
  } catch {
    return null;
  }
}

export function guardarAvance(clave: string, s: Sesion, almacen: Storage = localStorage): void {
  try {
    almacen.setItem(clave, JSON.stringify(s));
  } catch {
    // sin almacenamiento (modo privado, cuota llena): el avance sigue en pantalla pero no sobrevive a recargar
  }
}

export function borrarAvance(clave: string, almacen: Storage = localStorage): void {
  try {
    almacen.removeItem(clave);
  } catch {
    // nada que borrar
  }
}
