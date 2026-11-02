import { resumir } from './progreso.mapper';
import { RegistroProgreso } from './progreso.models';
import { armarVista } from './progreso.vista';

const reg = (over: Partial<RegistroProgreso>): RegistroProgreso => ({
  id: 1, fecha: '2026-10-01', peso: 75, altura: null, imc: null, observaciones: null, medidas: {}, ...over,
});

const vistaDe = (regs: RegistroProgreso[]) => armarVista(resumir(regs)!);

describe('armarVista', () => {
  const completa = vistaDe([
    reg({ id: 1, fecha: '2026-09-01', peso: 77, altura: 1.76 }),
    reg({ id: 2, fecha: '2026-10-12', peso: 74.6, altura: 1.76, imc: 24.08, medidas: { cintura: 82, biceps: 36.5, pecho: 101 } }),
  ]);

  it('da formato con coma decimal', () => {
    expect(completa.peso).toBe('74,6');
    expect(completa.altura).toBe('1,76');
    expect(completa.imc).toBe('24,1');
    expect(completa.medidas).toEqual([
      { etiqueta: 'cintura', valor: '82' },
      { etiqueta: 'bíceps', valor: '36,5' },
      { etiqueta: 'pecho', valor: '101' },
    ]);
  });

  it('describe la variación con palabras y flecha', () => {
    expect(completa.variacion).toEqual({ flecha: '▼', texto: 'Bajó 2,4 kg' });
    const sube = vistaDe([reg({ id: 1, peso: 70, fecha: '2026-09-01' }), reg({ id: 2, peso: 70.5 })]);
    expect(sube.variacion).toEqual({ flecha: '▲', texto: 'Subió 0,5 kg' });
    const igual = vistaDe([reg({ id: 1, peso: 70, fecha: '2026-09-01' }), reg({ id: 2, peso: 70 })]);
    expect(igual.variacion).toEqual({ flecha: '', texto: 'Sin cambios' });
  });

  it('muestra fechas y descripción de la gráfica', () => {
    expect(completa.fechaUltimo).toBe('12/10/2026');
    expect(completa.rangoFechas).toBe('01/09 – 12/10');
    expect(completa.descripcionGrafica).toContain('de 77 kg a 74,6 kg');
  });

  it('la barra más baja mide 25%, la más alta 100%, y solo la última es la actual', () => {
    expect(completa.barras.map((b) => b.alto)).toEqual([100, 25]);
    expect(completa.barras.map((b) => b.actual)).toEqual([false, true]);
  });

  it('con pesos iguales o un solo registro, las barras tienen una altura media', () => {
    expect(vistaDe([reg({})]).barras.map((b) => b.alto)).toEqual([60]);
    expect(vistaDe([reg({})]).variacion).toBeNull();
  });

  it('lo que no se conoce se muestra como raya', () => {
    const v = vistaDe([reg({})]);
    expect(v.altura).toBe('—');
    expect(v.imc).toBe('—');
    expect(v.medidas.every((m) => m.valor === '—')).toBe(true);
  });
});
