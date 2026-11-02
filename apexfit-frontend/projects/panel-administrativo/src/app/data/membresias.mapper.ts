import { MembresiaDto } from './dtos';
import { sumarDias, diasEntre } from './formato';
import {
  DatosMembresia,
  DIAS_POR_VENCER,
  EstadoEfectivo,
  Filtros,
  Membresia,
  PLANES,
  Plan,
} from './membresias.models';

export function aMembresia(dto: MembresiaDto): Membresia {
  return {
    id: dto.idMembresia ?? 0,
    idUsuario: dto.idUsuario,
    tipo: dto.tipo,
    fechaInicio: dto.fechaInicio,
    fechaFin: dto.fechaFin,
    precio: Number(dto.precio),
    estado: (dto.estado ?? 'activa').toLowerCase(),
  };
}

/**
 * Cuerpo de POST/PUT. Al editar hay que reenviar TODOS los campos (el backend los reemplaza),
 * y `idUsuario` es obligatorio aunque no cambie.
 */
export function aDto(datos: DatosMembresia, id?: number): MembresiaDto {
  return {
    ...(id !== undefined ? { idMembresia: id } : {}),
    idUsuario: datos.idUsuario,
    tipo: datos.tipo.trim(),
    fechaInicio: datos.fechaInicio,
    fechaFin: datos.fechaFin,
    precio: datos.precio,
    ...(datos.estado ? { estado: datos.estado } : {}),
  };
}

export function estadoEfectivo(m: Membresia, hoy: string): { estado: EstadoEfectivo; diasRestantes: number } {
  const diasRestantes = diasEntre(hoy, m.fechaFin);
  if (m.estado === 'cancelada') return { estado: 'cancelada', diasRestantes };
  if (m.estado === 'vencida' || diasRestantes < 0) return { estado: 'vencida', diasRestantes };
  if (diasRestantes <= DIAS_POR_VENCER) return { estado: 'por-vencer', diasRestantes };
  return { estado: 'activa', diasRestantes };
}

/** Cuántas membresías hay en cada estado (para los contadores de los filtros). */
export function contarPorEstado(lista: Membresia[], hoy: string): Record<EstadoEfectivo | 'todas', number> {
  const cuentas: Record<EstadoEfectivo | 'todas', number> = {
    'todas': lista.length, 'activa': 0, 'por-vencer': 0, 'vencida': 0, 'cancelada': 0,
  };
  for (const m of lista) cuentas[estadoEfectivo(m, hoy).estado]++;
  return cuentas;
}

const sinTildes = (t: string) => t.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();

/** `buscable` es el texto del cliente (nombre + correo) contra el que se busca. */
export function filtrar<T extends { m: Membresia; buscable: string }>(filas: T[], f: Filtros, hoy: string): T[] {
  const q = sinTildes(f.texto);
  return filas.filter(
    (fila) =>
      (f.estado === 'todas' || estadoEfectivo(fila.m, hoy).estado === f.estado) &&
      (!q || sinTildes(fila.buscable).includes(q)),
  );
}

export function buscarPlan(nombre: string): Plan | undefined {
  return PLANES.find((p) => p.nombre.toLowerCase() === nombre.trim().toLowerCase());
}

/** Fecha de fin que le corresponde a un plan que empieza en `inicio`. */
export function fechaFinDePlan(plan: Plan, inicio: string): string {
  return sumarDias(inicio, plan.dias);
}

/**
 * Renovar: si la membresía todavía está vigente, la nueva empieza al día siguiente de su fin
 * (sin perder días); si ya venció o se canceló, empieza hoy.
 */
export function inicioDeRenovacion(m: Membresia, hoy: string): string {
  const vigente = m.estado !== 'cancelada' && m.estado !== 'vencida' && m.fechaFin >= hoy;
  return vigente ? sumarDias(m.fechaFin, 1) : hoy;
}

export interface MejorMembresia {
  m: Membresia;
  estado: EstadoEfectivo;
  diasRestantes: number;
}

/**
 * De las membresías de UN cliente, la que vale hoy (activa o por vencer, la que vence más tarde);
 * si ninguna vale, la más reciente (para poder explicar por qué no). null si no tiene ninguna.
 */
export function mejorMembresia(deUsuario: Membresia[], hoy: string): MejorMembresia | null {
  const evaluadas = deUsuario
    .map((m) => ({ m, ...estadoEfectivo(m, hoy) }))
    .sort((a, b) => b.m.fechaFin.localeCompare(a.m.fechaFin));
  return (
    evaluadas.find((e) => e.estado === 'activa' || e.estado === 'por-vencer') ?? evaluadas[0] ?? null
  );
}
