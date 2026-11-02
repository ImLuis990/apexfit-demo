import { MembresiaDto } from './dtos';
import { resumirMembresia } from './membresias.mapper';
import { armarVistaMembresia } from './membresias.vista';

const HOY = '2026-10-13';

const mem = (over: Partial<MembresiaDto>): MembresiaDto => ({
  idMembresia: 1, idUsuario: 1, tipo: 'mensual', fechaInicio: '2026-09-01', fechaFin: '2026-11-02',
  precio: 90000, estado: 'activa', ...over,
});

describe('resumirMembresia', () => {
  it('sin registros: sin membresía', () => {
    expect(resumirMembresia([], HOY)).toEqual({ tipo: 'sin-membresia' });
  });

  it('activa y vigente: calcula los días que quedan y pone el plan con mayúscula', () => {
    expect(resumirMembresia([mem({})], HOY)).toEqual({
      tipo: 'activa', plan: 'Mensual', vence: '2026-11-02', diasRestantes: 20, porVencer: false,
    });
  });

  it('"por vencer" cuando faltan 7 días o menos', () => {
    const e = (fin: string) => resumirMembresia([mem({ fechaFin: fin })], HOY);
    expect(e('2026-10-20')).toMatchObject({ diasRestantes: 7, porVencer: true });
    expect(e('2026-10-21')).toMatchObject({ diasRestantes: 8, porVencer: false });
  });

  it('el último día sigue vigente (vence hoy)', () => {
    expect(resumirMembresia([mem({ fechaFin: HOY })], HOY)).toMatchObject({ tipo: 'activa', diasRestantes: 0, porVencer: true });
  });

  it('el estado "activa" del backend no basta: si la fecha ya pasó, está vencida', () => {
    const e = resumirMembresia([mem({ estado: 'activa', fechaFin: '2026-10-01' })], HOY);
    expect(e).toEqual({ tipo: 'vencida', plan: 'Mensual', vencio: '2026-10-01' });
  });

  it('entre varias, usa la vigente aunque haya vencidas más antiguas', () => {
    const e = resumirMembresia([
      mem({ idMembresia: 1, estado: 'vencida', fechaFin: '2026-08-01', tipo: 'trimestral' }),
      mem({ idMembresia: 2, estado: 'activa', fechaFin: '2026-12-01', tipo: 'anual' }),
    ], HOY);
    expect(e).toMatchObject({ tipo: 'activa', plan: 'Anual' });
  });

  it('si la más reciente fue cancelada, está cancelada', () => {
    const e = resumirMembresia([
      mem({ idMembresia: 1, estado: 'vencida', fechaFin: '2026-08-01' }),
      mem({ idMembresia: 2, estado: 'cancelada', fechaFin: '2026-12-01' }),
    ], HOY);
    expect(e).toEqual({ tipo: 'cancelada', plan: 'Mensual' });
  });

  it('no distingue mayúsculas en el estado', () => {
    expect(resumirMembresia([mem({ estado: 'ACTIVA' })], HOY).tipo).toBe('activa');
  });
});

describe('armarVistaMembresia', () => {
  it('activa: etiqueta verde y los días que quedan', () => {
    const v = armarVistaMembresia({ tipo: 'activa', plan: 'Mensual', vence: '2026-11-02', diasRestantes: 20, porVencer: false });
    expect(v).toEqual({ etiqueta: 'Activa', estilo: 'ok', detalle: 'Mensual · vence el 02/11/2026 (quedan 20 días)' });
  });

  it('por vencer: etiqueta de advertencia', () => {
    const v = armarVistaMembresia({ tipo: 'activa', plan: 'Mensual', vence: '2026-10-18', diasRestantes: 5, porVencer: true });
    expect(v.etiqueta).toBe('Por vencer');
    expect(v.estilo).toBe('warn');
  });

  it('dice "vence hoy" y "vence mañana"', () => {
    const base = { tipo: 'activa', plan: 'Mensual', vence: '2026-10-13', porVencer: true } as const;
    expect(armarVistaMembresia({ ...base, diasRestantes: 0 }).detalle).toContain('vence hoy');
    expect(armarVistaMembresia({ ...base, diasRestantes: 1 }).detalle).toContain('vence mañana');
  });

  it('vencida, cancelada y sin membresía', () => {
    expect(armarVistaMembresia({ tipo: 'vencida', plan: 'Mensual', vencio: '2026-10-01' })).toMatchObject({ etiqueta: 'Vencida', estilo: 'danger' });
    expect(armarVistaMembresia({ tipo: 'cancelada', plan: 'Mensual' })).toMatchObject({ etiqueta: 'Cancelada', estilo: 'danger' });
    expect(armarVistaMembresia({ tipo: 'sin-membresia' })).toMatchObject({ etiqueta: 'Sin membresía', estilo: 'warn' });
  });
});
