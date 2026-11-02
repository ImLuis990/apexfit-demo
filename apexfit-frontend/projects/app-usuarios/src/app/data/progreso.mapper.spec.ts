import { ProgresoDto } from './dtos';
import { aDto, aRegistro, calcularImc, ordenarCronologico, resumir } from './progreso.mapper';
import { RegistroProgreso } from './progreso.models';

const dto = (over: Partial<ProgresoDto> = {}): ProgresoDto => ({
  idProgreso: 1, idUsuario: 1, fecha: '2026-10-01', peso: 75, altura: null, imc: null,
  observaciones: null, medidas: null, ...over,
});

const reg = (over: Partial<RegistroProgreso> = {}): RegistroProgreso => ({
  id: 1, fecha: '2026-10-01', peso: 75, altura: null, imc: null, observaciones: null, medidas: {}, ...over,
});

describe('aRegistro', () => {
  it('normaliza el nombre de las medidas (tildes y mayúsculas)', () => {
    const r = aRegistro(dto({ medidas: [{ tipoMedida: 'Bíceps', valorCm: 36 }, { tipoMedida: 'CINTURA', valorCm: 82.5 }] }));
    expect(r.medidas).toEqual({ biceps: 36, cintura: 82.5 });
  });

  it('convierte a número los decimales que llegan como texto y respeta los nulos', () => {
    const r = aRegistro(dto({ peso: '74.60' as unknown as number, altura: '1.76' as unknown as number }));
    expect(r.peso).toBe(74.6);
    expect(r.altura).toBe(1.76);
    expect(r.imc).toBeNull();
    expect(r.medidas).toEqual({});
  });
});

describe('ordenarCronologico', () => {
  it('ordena de más antiguo a más reciente y desempata por id', () => {
    const r = ordenarCronologico([
      reg({ id: 3, fecha: '2026-10-05' }), reg({ id: 2, fecha: '2026-10-01' }), reg({ id: 1, fecha: '2026-10-05' }),
    ]);
    expect(r.map((x) => x.id)).toEqual([2, 1, 3]);
  });
});

describe('calcularImc', () => {
  it('peso / altura², con 2 decimales', () => {
    expect(calcularImc(74.6, 1.76)).toBe(24.08);
  });

  it('sin altura válida no hay IMC', () => {
    expect(calcularImc(70, null)).toBeNull();
    expect(calcularImc(70, 0)).toBeNull();
  });
});

describe('resumir', () => {
  it('sin registros no hay resumen', () => {
    expect(resumir([])).toBeNull();
  });

  it('con un solo registro no hay variación', () => {
    const r = resumir([reg({ peso: 80 })]);
    expect(r?.variacionPeso).toBeNull();
    expect(r?.serie).toEqual([{ fecha: '2026-10-01', peso: 80 }]);
  });

  it('calcula la variación contra el registro anterior (sin errores de decimales)', () => {
    const r = resumir([reg({ id: 1, fecha: '2026-09-01', peso: 77 }), reg({ id: 2, fecha: '2026-10-01', peso: 74.6 })]);
    expect(r?.actual.peso).toBe(74.6);
    expect(r?.variacionPeso).toBe(-2.4);
  });

  it('la serie trae como máximo los últimos 6 pesos, en orden cronológico', () => {
    const regs = Array.from({ length: 8 }, (_, i) => reg({ id: i + 1, fecha: `2026-10-0${i + 1}`, peso: 70 + i }));
    const r = resumir(regs);
    expect(r?.serie.map((p) => p.peso)).toEqual([72, 73, 74, 75, 76, 77]);
  });

  it('usa la última altura conocida y calcula el IMC si el registro no lo trae', () => {
    const r = resumir([
      reg({ id: 1, fecha: '2026-09-01', peso: 80, altura: 1.8 }),
      reg({ id: 2, fecha: '2026-10-01', peso: 72.9, altura: null }),
    ]);
    expect(r?.altura).toBe(1.8);
    expect(r?.imc).toBe(22.5);
  });

  it('respeta el IMC guardado en el registro actual', () => {
    const r = resumir([reg({ peso: 80, altura: 1.8, imc: 24.5 })]);
    expect(r?.imc).toBe(24.5);
  });

  it('de cada medida muestra la última registrada, aunque no sea del último día', () => {
    const r = resumir([
      reg({ id: 1, fecha: '2026-09-01', medidas: { cintura: 85, biceps: 35, pecho: 100 } }),
      reg({ id: 2, fecha: '2026-10-01', medidas: { cintura: 82 } }),
    ]);
    expect(r?.medidas.map((m) => [m.tipo, m.valor])).toEqual([['cintura', 82], ['biceps', 35], ['pecho', 100]]);
  });

  it('una medida que nunca se registró queda en null', () => {
    const r = resumir([reg()]);
    expect(r?.medidas.every((m) => m.valor === null)).toBe(true);
  });
});

describe('aDto (cuerpo del POST)', () => {
  it('calcula el IMC, arma las medidas y limpia las observaciones', () => {
    const body = aDto(7, {
      fecha: '2026-10-12', peso: 74.6, altura: 1.76, observaciones: '  Buen día  ',
      medidas: { cintura: 82, biceps: 36 },
    });
    expect(body).toEqual({
      idUsuario: 7, fecha: '2026-10-12', peso: 74.6, altura: 1.76, imc: 24.08,
      observaciones: 'Buen día',
      medidas: [{ tipoMedida: 'cintura', valorCm: 82 }, { tipoMedida: 'biceps', valorCm: 36 }],
    });
  });

  it('sin altura no manda IMC; sin medidas ni observaciones manda null', () => {
    const body = aDto(7, { fecha: '2026-10-12', peso: 70, altura: null, observaciones: '   ', medidas: {} });
    expect(body.imc).toBeNull();
    expect(body.medidas).toBeNull();
    expect(body.observaciones).toBeNull();
  });
});
