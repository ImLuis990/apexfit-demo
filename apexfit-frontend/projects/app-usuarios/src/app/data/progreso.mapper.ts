import { ProgresoDto } from './dtos';
import {
  CambiosRegistro,
  NuevoRegistro,
  RegistroProgreso,
  ResumenProgreso,
  TIPOS_MEDIDA,
} from './progreso.models';

const sinTildes = (texto: string) =>
  texto.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();

const redondear = (valor: number, decimales: number) => {
  const factor = 10 ** decimales;
  return Math.round(valor * factor) / factor;
};

export function aRegistro(dto: ProgresoDto): RegistroProgreso {
  const medidas: Record<string, number> = {};
  for (const m of dto.medidas ?? []) {
    medidas[sinTildes(m.tipoMedida)] = Number(m.valorCm);
  }
  return {
    id: dto.idProgreso ?? 0,
    fecha: dto.fecha,
    peso: Number(dto.peso),
    altura: dto.altura === null || dto.altura === undefined ? null : Number(dto.altura),
    imc: dto.imc === null || dto.imc === undefined ? null : Number(dto.imc),
    observaciones: dto.observaciones ?? null,
    medidas,
  };
}

/** Del más antiguo al más reciente (a igual fecha, por orden de creación). */
export function ordenarCronologico(registros: RegistroProgreso[]): RegistroProgreso[] {
  return [...registros].sort((a, b) => a.fecha.localeCompare(b.fecha) || a.id - b.id);
}

/** IMC = peso / altura². La altura va en metros. null si no hay altura válida. */
export function calcularImc(peso: number, altura: number | null): number | null {
  if (altura === null || !(altura > 0)) return null;
  return redondear(peso / (altura * altura), 2);
}

export function resumir(registros: RegistroProgreso[]): ResumenProgreso | null {
  if (registros.length === 0) return null;

  const cronologico = ordenarCronologico(registros);
  const reciente = [...cronologico].reverse(); // del más nuevo al más viejo
  const actual = reciente[0];
  const anterior = reciente[1];

  const altura = reciente.find((r) => r.altura !== null)?.altura ?? null;

  return {
    actual,
    variacionPeso: anterior ? redondear(actual.peso - anterior.peso, 2) : null,
    serie: cronologico.slice(-6).map((r) => ({ fecha: r.fecha, peso: r.peso })),
    altura,
    imc: actual.imc ?? calcularImc(actual.peso, altura),
    // De cada medida se muestra la última que se registró, aunque no sea del último día.
    medidas: TIPOS_MEDIDA.map(({ tipo, etiqueta }) => ({
      tipo,
      etiqueta,
      valor: reciente.find((r) => tipo in r.medidas)?.medidas[tipo] ?? null,
    })),
  };
}

/** Cuerpo del POST /progresos. El IMC se calcula aquí porque el backend no lo calcula. */
export function aDto(idUsuario: number, nuevo: NuevoRegistro): ProgresoDto {
  const medidas = Object.entries(nuevo.medidas)
    .filter(([, valor]) => typeof valor === 'number')
    .map(([tipoMedida, valorCm]) => ({ tipoMedida, valorCm: valorCm as number }));

  return {
    idUsuario,
    fecha: nuevo.fecha,
    peso: nuevo.peso,
    altura: nuevo.altura,
    imc: calcularImc(nuevo.peso, nuevo.altura),
    observaciones: nuevo.observaciones?.trim() ? nuevo.observaciones.trim() : null,
    medidas: medidas.length ? medidas : null,
  };
}

/**
 * Cuerpo del PUT /progresos/{id}. La fecha va igual que la del registro; el backend solo guarda
 * peso, altura, IMC y observaciones (ignora fecha y medidas), por eso las medidas van null.
 */
export function aDtoEdicion(idUsuario: number, registro: RegistroProgreso, cambios: CambiosRegistro): ProgresoDto {
  return {
    idProgreso: registro.id,
    idUsuario,
    fecha: registro.fecha,
    peso: cambios.peso,
    altura: cambios.altura,
    imc: calcularImc(cambios.peso, cambios.altura),
    observaciones: cambios.observaciones?.trim() ? cambios.observaciones.trim() : null,
    medidas: null,
  };
}
