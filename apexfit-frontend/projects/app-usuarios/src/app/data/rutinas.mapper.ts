import { EjercicioDto, RutinaDto, RutinaEjercicioDto } from './dtos';
import {
  ABREVIATURA_DIA,
  DIAS,
  DiaRutina,
  DiaSemana,
  EjercicioRutina,
  ETIQUETA_DIA,
  RutinaActiva,
} from './rutinas.models';

const sinTildes = (texto: string) =>
  texto.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();

function normalizarDia(valor: string | null): DiaSemana | null {
  if (!valor) return null;
  const dia = sinTildes(valor);
  return (DIAS as readonly string[]).includes(dia) ? (dia as DiaSemana) : null;
}

const capitalizar = (texto: string) => texto.charAt(0).toUpperCase() + texto.slice(1);

/**
 * El cliente debería tener una sola rutina activa; si por error hubiera varias,
 * se toma la más reciente.
 */
export function elegirActiva(rutinas: RutinaDto[]): RutinaDto | null {
  const activas = rutinas.filter((r) => r.estado?.toLowerCase() === 'activa');
  activas.sort((a, b) => (b.fechaCreacion ?? '').localeCompare(a.fechaCreacion ?? ''));
  return activas[0] ?? null;
}

/** Junta la rutina, sus ejercicios y el catálogo en el modelo que usa la pantalla. */
export function armarRutina(
  rutina: RutinaDto,
  items: RutinaEjercicioDto[],
  catalogo: Map<number, EjercicioDto>,
): RutinaActiva {
  const porDia = new Map<DiaSemana | null, EjercicioRutina[]>();

  for (const item of [...items].sort((a, b) => a.idRutinaEjercicio - b.idRutinaEjercicio)) {
    const ejercicio = catalogo.get(item.idEjercicio);
    const fila: EjercicioRutina = {
      id: item.idRutinaEjercicio,
      idEjercicio: item.idEjercicio,
      nombre: ejercicio?.nombre ?? `Ejercicio #${item.idEjercicio}`,
      grupoMuscular: ejercicio?.grupoMuscular ?? null,
      series: item.series,
      repeticiones: item.repeticiones,
      descansoSeg: item.descansoSeg ?? null,
      ...(ejercicio?.videoUrl ? { videoUrl: ejercicio.videoUrl } : {}),
    };
    const dia = normalizarDia(item.diaSemana);
    porDia.set(dia, [...(porDia.get(dia) ?? []), fila]);
  }

  const orden: (DiaSemana | null)[] = [...DIAS, null];
  const dias: DiaRutina[] = orden
    .filter((dia) => porDia.has(dia))
    .map((dia) => {
      const ejercicios = porDia.get(dia) ?? [];
      const grupos = [
        ...new Set(
          ejercicios
            .map((e) => e.grupoMuscular?.trim())
            .filter((g): g is string => !!g)
            .map(capitalizar),
        ),
      ];
      return {
        dia,
        etiqueta: dia ? ETIQUETA_DIA[dia] : 'Sin día asignado',
        abreviatura: dia ? ABREVIATURA_DIA[dia] : '•',
        grupos,
        ejercicios,
      };
    });

  return { id: rutina.idRutina, nombre: rutina.nombre, descripcion: rutina.descripcion, dias };
}
