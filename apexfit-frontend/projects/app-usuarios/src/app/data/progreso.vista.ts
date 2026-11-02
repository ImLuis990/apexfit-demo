import { fechaCompleta, fechaCorta, numero } from './formato';
import { ResumenProgreso } from './progreso.models';

export interface VistaProgreso {
  peso: string;
  fechaUltimo: string;
  variacion: { flecha: '▼' | '▲' | ''; texto: string } | null;
  barras: { alto: number; etiqueta: string; actual: boolean }[];
  rangoFechas: string;
  descripcionGrafica: string;
  altura: string;
  imc: string;
  medidas: { etiqueta: string; valor: string }[];
}

const o = (valor: number | null, decimales: number) =>
  valor === null ? '—' : numero(valor, decimales);

/** Convierte el resumen en los textos que muestra la pantalla (ya con coma decimal). */
export function armarVista(r: ResumenProgreso): VistaProgreso {
  const pesos = r.serie.map((p) => p.peso);
  const min = Math.min(...pesos);
  const max = Math.max(...pesos);

  // La barra más baja mide 25% y la más alta 100%, para que las diferencias se noten.
  const alto = (peso: number) => (max === min ? 60 : 25 + (75 * (peso - min)) / (max - min));

  const barras = r.serie.map((p, i) => ({
    alto: Math.round(alto(p.peso)),
    etiqueta: `${fechaCorta(p.fecha)}: ${numero(p.peso, 2)} kg`,
    actual: i === r.serie.length - 1,
  }));

  const primera = r.serie[0];
  const ultima = r.serie[r.serie.length - 1];

  let variacion: VistaProgreso['variacion'] = null;
  if (r.variacionPeso !== null) {
    if (r.variacionPeso < 0) {
      variacion = { flecha: '▼', texto: `Bajó ${numero(Math.abs(r.variacionPeso), 2)} kg` };
    } else if (r.variacionPeso > 0) {
      variacion = { flecha: '▲', texto: `Subió ${numero(r.variacionPeso, 2)} kg` };
    } else {
      variacion = { flecha: '', texto: 'Sin cambios' };
    }
  }

  return {
    peso: numero(r.actual.peso, 2),
    fechaUltimo: fechaCompleta(r.actual.fecha),
    variacion,
    barras,
    rangoFechas:
      r.serie.length > 1 ? `${fechaCorta(primera.fecha)} – ${fechaCorta(ultima.fecha)}` : fechaCorta(ultima.fecha),
    descripcionGrafica:
      r.serie.length > 1
        ? `Peso en los últimos ${r.serie.length} registros: de ${numero(primera.peso, 2)} kg a ${numero(ultima.peso, 2)} kg`
        : `Un solo registro de peso: ${numero(ultima.peso, 2)} kg`,
    altura: o(r.altura, 2),
    imc: o(r.imc, 1),
    medidas: r.medidas.map((m) => ({ etiqueta: m.etiqueta.toLowerCase(), valor: o(m.valor, 1) })),
  };
}
