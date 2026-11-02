import { esRutinaActiva } from './clientes.mapper';
import { RutinaDto, RutinaEjercicioDto } from './dtos';
import { LineaEditable, PlanDeLineas, RutinaDelEntrenador } from './mis-rutinas.models';
import { DIAS, DiaSemana, EjercicioCatalogo } from './rutinas.models';
import { Usuario } from './usuarios.models';

export function aRutinaDelEntrenador(dto: RutinaDto, usuarios: Usuario[]): RutinaDelEntrenador {
  return {
    id: dto.idRutina ?? 0,
    nombre: dto.nombre,
    descripcion: dto.descripcion || null,
    idEntrenador: dto.idEntrenador,
    idCliente: dto.idCliente,
    cliente: usuarios.find((u) => u.id === dto.idCliente)?.nombreCompleto ?? `Cliente #${dto.idCliente}`,
    creada: dto.fechaCreacion ? dto.fechaCreacion.slice(0, 10) : null,
    activa: esRutinaActiva(dto),
  };
}

export const recientesPrimero = (a: RutinaDelEntrenador, b: RutinaDelEntrenador) =>
  (b.creada ?? '').localeCompare(a.creada ?? '') || b.id - a.id;

export function aLineaEditable(dto: RutinaEjercicioDto, catalogo: EjercicioCatalogo[]): LineaEditable {
  const dia = DIAS.find((d) => d.valor === dto.diaSemana)?.valor ?? '';
  return {
    idLinea: dto.idRutinaEjercicio ?? null,
    idEjercicio: dto.idEjercicio,
    ejercicio: catalogo.find((e) => e.id === dto.idEjercicio)?.nombre ?? `Ejercicio #${dto.idEjercicio}`,
    dia: dia as DiaSemana | '',
    series: dto.series,
    repeticiones: dto.repeticiones,
    descansoSeg: dto.descansoSeg ?? null,
  };
}

const ordenDia = (l: LineaEditable) => DIAS.findIndex((d) => d.valor === l.dia);
export const porDia = (a: LineaEditable, b: LineaEditable) => ordenDia(a) - ordenDia(b);

/** Cuerpo para POST/PUT /rutina-ejercicios. El backend solo cambia día, series, repeticiones y descanso al editar. */
export const aLineaDto = (idRutina: number, l: LineaEditable): RutinaEjercicioDto => ({
  ...(l.idLinea !== null ? { idRutinaEjercicio: l.idLinea } : {}),
  idRutina,
  idEjercicio: l.idEjercicio,
  diaSemana: l.dia || null,
  series: l.series,
  repeticiones: l.repeticiones,
  descansoSeg: l.descansoSeg,
});

const cambio = (a: LineaEditable, b: LineaEditable) =>
  a.dia !== b.dia || a.series !== b.series || a.repeticiones !== b.repeticiones || a.descansoSeg !== b.descansoSeg;

export function planDeLineas(originales: LineaEditable[], finales: LineaEditable[]): PlanDeLineas {
  const porId = new Map(originales.map((l) => [l.idLinea, l]));
  const idsFinales = new Set(finales.map((l) => l.idLinea));
  return {
    agregar: finales.filter((l) => l.idLinea === null),
    actualizar: finales.filter((l) => {
      const antes = l.idLinea === null ? undefined : porId.get(l.idLinea);
      return !!antes && cambio(antes, l);
    }),
    quitar: originales.filter((l) => !idsFinales.has(l.idLinea)).map((l) => l.idLinea as number),
  };
}
