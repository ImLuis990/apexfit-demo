import { Asistencia } from './asistencias.models';
import { EntrenadorClienteDto, ProgresoDto, RutinaDto } from './dtos';
import { diasEntre } from './formato';
import { ClienteAsignado, RegistroPeso } from './clientes.models';
import { Usuario } from './usuarios.models';

/** Una asignación sigue vigente salvo que el backend la marque como inactiva/terminada. */
export function asignacionVigente(a: EntrenadorClienteDto): boolean {
  return !/inactiv|termin|finaliz|cancel/i.test(a.estado ?? '');
}

export const esRutinaActiva = (r: RutinaDto): boolean => (r.estado ?? '').toLowerCase() === 'activa';

/** Si por error hubiera varias rutinas activas, la más reciente. */
export function elegirRutinaActiva(rutinas: RutinaDto[]): RutinaDto | null {
  const activas = rutinas.filter(esRutinaActiva);
  activas.sort((a, b) => (b.fechaCreacion ?? '').localeCompare(a.fechaCreacion ?? ''));
  return activas[0] ?? null;
}

/** Del más reciente al más antiguo (a igual fecha, el que se creó después). */
export function aRegistros(dtos: ProgresoDto[]): RegistroPeso[] {
  return dtos
    .map((d) => ({
      id: d.idProgreso ?? 0,
      fecha: d.fecha,
      peso: Number(d.peso),
      imc: d.imc === null || d.imc === undefined ? null : Number(d.imc),
    }))
    .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id - a.id);
}

export function iniciales(nombre: string, apellido: string): string {
  const n = nombre.trim();
  const a = apellido.trim();
  return (n && a ? n[0] + a[0] : (n || a).slice(0, 2)).toUpperCase();
}

export function armarCliente(
  idCliente: number,
  usuario: Usuario | undefined,
  rutinas: RutinaDto[],
  progreso: ProgresoDto[],
): ClienteAsignado {
  return {
    idCliente,
    nombre: usuario?.nombreCompleto ?? `Cliente #${idCliente}`,
    correo: usuario?.correo ?? '',
    iniciales: usuario ? iniciales(usuario.nombre, usuario.apellido) : '?',
    rutinaActiva: elegirRutinaActiva(rutinas)?.nombre ?? null,
    registros: aRegistros(progreso),
  };
}

/** Del más reciente al más antiguo (a igual fecha, la que entró más tarde). */
export function ordenarRecientes(lista: Asistencia[]): Asistencia[] {
  return [...lista].sort((a, b) => b.fecha.localeCompare(a.fecha) || b.horaEntrada.localeCompare(a.horaEntrada));
}

/** Visitas de los últimos 30 días y fecha de la última (la lista ya viene del más reciente al más antiguo). */
export function resumirAsistencia(lista: Asistencia[], hoy: string): { visitas30: number; ultima: string | null } {
  const visitas30 = lista.filter((a) => {
    const dias = diasEntre(a.fecha, hoy);
    return dias >= 0 && dias < 30;
  }).length;
  return { visitas30, ultima: lista[0]?.fecha ?? null };
}
