import { DIAS, DiaRutina, DiaSemana, RutinaActiva } from './rutinas.models';

export type PlanDeHoy =
  | { tipo: 'sin-rutina' }
  | { tipo: 'entrena'; rutina: string; dia: DiaRutina }
  | { tipo: 'descanso'; rutina: string; proximo: DiaRutina | null };

/** Qué le toca hoy al cliente según su rutina activa. */
export function planDeHoy(rutina: RutinaActiva | null, hoy: DiaSemana): PlanDeHoy {
  if (!rutina) return { tipo: 'sin-rutina' };

  const conDia = rutina.dias.filter((d) => d.dia !== null);
  const sinDia = rutina.dias.find((d) => d.dia === null);

  const deHoy = conDia.find((d) => d.dia === hoy);
  if (deHoy) return { tipo: 'entrena', rutina: rutina.nombre, dia: deHoy };

  // Si el entrenador no asignó días, no hay "descanso": se ofrece el bloque tal cual.
  if (conDia.length === 0 && sinDia) return { tipo: 'entrena', rutina: rutina.nombre, dia: sinDia };

  // Próximo día de entrenamiento, dando la vuelta a la semana si hace falta.
  const desde = DIAS.indexOf(hoy);
  for (let paso = 1; paso <= DIAS.length; paso++) {
    const candidato = DIAS[(desde + paso) % DIAS.length];
    const dia = conDia.find((d) => d.dia === candidato);
    if (dia) return { tipo: 'descanso', rutina: rutina.nombre, proximo: dia };
  }
  return { tipo: 'descanso', rutina: rutina.nombre, proximo: null };
}
