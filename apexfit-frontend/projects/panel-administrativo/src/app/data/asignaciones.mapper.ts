import { asignacionVigente } from './clientes.mapper';
import { Asignacion, ClienteDeEntrenador, OpcionesCliente, Tablero } from './asignaciones.models';
import { EntrenadorClienteDto } from './dtos';
import { ordenar } from './usuarios.mapper';
import { Usuario } from './usuarios.models';

export function aAsignacion(dto: EntrenadorClienteDto): Asignacion {
  return {
    id: dto.idAsignacion ?? 0,
    idEntrenador: dto.idEntrenador,
    idCliente: dto.idCliente,
    desde: dto.fechaAsignacion ? dto.fechaAsignacion.slice(0, 10) : null,
    estado: dto.estado ?? 'activa',
    vigente: asignacionVigente(dto),
  };
}

/** Cuerpo del PUT: el backend solo cambia el estado, pero exige los dos ids. */
export function aDtoEstado(a: Asignacion, estado: 'activa' | 'inactiva'): EntrenadorClienteDto {
  return { idAsignacion: a.id, idEntrenador: a.idEntrenador, idCliente: a.idCliente, estado };
}

/** Todas las filas (vigentes o no) que unen a este entrenador con este cliente. */
export function filasDelPar(asignaciones: Asignacion[], idEntrenador: number, idCliente: number): Asignacion[] {
  return asignaciones.filter((a) => a.idEntrenador === idEntrenador && a.idCliente === idCliente);
}

const porNombre = (a: ClienteDeEntrenador, b: ClienteDeEntrenador) => a.nombre.localeCompare(b.nombre, 'es');

function clienteDe(a: Asignacion, usuario: Usuario | undefined): ClienteDeEntrenador {
  return {
    asignacion: a,
    idCliente: a.idCliente,
    nombre: usuario?.nombreCompleto ?? `Cliente #${a.idCliente}`,
    correo: usuario?.correo ?? '',
  };
}

export function armarTablero(asignaciones: Asignacion[], usuarios: Usuario[]): Tablero {
  const porId = new Map(usuarios.map((u) => [u.id, u]));
  const vigentes = asignaciones.filter((a) => a.vigente);
  const entrenadoresConClientes = new Set(vigentes.map((a) => a.idEntrenador));
  const clientesConEntrenador = new Set(vigentes.map((a) => a.idCliente));

  // Un entrenador inactivo solo aparece si todavía tiene clientes: así no se quedan "huérfanos" sin verse.
  const entrenadores = ordenar(
    usuarios.filter((u) => u.rol === 'entrenador' && (u.activo || entrenadoresConClientes.has(u.id))),
  ).map((entrenador) => ({
    entrenador,
    clientes: vigentes
      .filter((a) => a.idEntrenador === entrenador.id)
      .map((a) => clienteDe(a, porId.get(a.idCliente)))
      .sort(porNombre),
  }));

  const clientesActivos = usuarios.filter((u) => u.rol === 'cliente' && u.activo);
  return {
    entrenadores,
    sinEntrenador: ordenar(clientesActivos.filter((u) => !clientesConEntrenador.has(u.id))),
    conEntrenador: clientesActivos.filter((u) => clientesConEntrenador.has(u.id)).length,
  };
}

/** Los clientes activos que todavía no son de este entrenador, separando los que ya tienen otro. */
export function opcionesParaEntrenador(
  idEntrenador: number,
  asignaciones: Asignacion[],
  usuarios: Usuario[],
): OpcionesCliente {
  const porId = new Map(usuarios.map((u) => [u.id, u]));
  const vigentes = asignaciones.filter((a) => a.vigente);
  const yaSuyos = new Set(vigentes.filter((a) => a.idEntrenador === idEntrenador).map((a) => a.idCliente));

  const entrenadoresDe = (idCliente: number): string[] =>
    vigentes
      .filter((a) => a.idCliente === idCliente && a.idEntrenador !== idEntrenador)
      .map((a) => porId.get(a.idEntrenador)?.nombreCompleto ?? `Entrenador #${a.idEntrenador}`);

  const candidatos = ordenar(usuarios.filter((u) => u.rol === 'cliente' && u.activo && !yaSuyos.has(u.id)));
  const libres: Usuario[] = [];
  const conOtros: OpcionesCliente['conOtros'] = [];
  for (const cliente of candidatos) {
    const otros = entrenadoresDe(cliente.id);
    if (otros.length === 0) libres.push(cliente);
    else conOtros.push({ cliente, entrenadores: otros });
  }
  return { libres, conOtros };
}
