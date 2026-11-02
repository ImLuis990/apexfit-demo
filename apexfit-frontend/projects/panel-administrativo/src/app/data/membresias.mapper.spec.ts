import { MembresiaDto } from './dtos';
import {
  aDto, aMembresia, buscarPlan, contarPorEstado, estadoEfectivo, fechaFinDePlan, filtrar, inicioDeRenovacion,
} from './membresias.mapper';
import { Membresia, PLANES } from './membresias.models';

const HOY = '2026-10-13';

const mem = (over: Partial<Membresia> = {}): Membresia => ({
  id: 1, idUsuario: 7, tipo: 'Mensual', fechaInicio: '2026-09-20', fechaFin: '2026-11-12',
  precio: 90000, estado: 'activa', ...over,
});

describe('aMembresia', () => {
  it('convierte los números que llegan como texto y normaliza el estado', () => {
    const dto: MembresiaDto = {
      idMembresia: 3, idUsuario: 7, tipo: 'Anual', fechaInicio: '2026-01-01', fechaFin: '2026-12-31',
      precio: '800000.00' as unknown as number, estado: 'ACTIVA',
    };
    expect(aMembresia(dto)).toEqual({
      id: 3, idUsuario: 7, tipo: 'Anual', fechaInicio: '2026-01-01', fechaFin: '2026-12-31', precio: 800000, estado: 'activa',
    });
  });

  it('si el backend no manda estado, se toma como activa', () => {
    expect(aMembresia({ idUsuario: 1, tipo: 'x', fechaInicio: 'a', fechaFin: 'b', precio: 1 }).estado).toBe('activa');
  });
});

describe('aDto', () => {
  it('al crear no manda id ni estado', () => {
    const dto = aDto({ idUsuario: 7, tipo: ' Mensual ', fechaInicio: '2026-10-13', fechaFin: '2026-11-12', precio: 90000 });
    expect(dto).toEqual({ idUsuario: 7, tipo: 'Mensual', fechaInicio: '2026-10-13', fechaFin: '2026-11-12', precio: 90000 });
    expect('idMembresia' in dto).toBe(false);
    expect('estado' in dto).toBe(false);
  });

  it('al editar manda el id, el idUsuario y el estado', () => {
    const dto = aDto({ idUsuario: 7, tipo: 'Mensual', fechaInicio: 'a', fechaFin: 'b', precio: 1, estado: 'cancelada' }, 3);
    expect(dto).toMatchObject({ idMembresia: 3, idUsuario: 7, estado: 'cancelada' });
  });
});

describe('estadoEfectivo', () => {
  it('activa si falta más de 7 días', () => {
    expect(estadoEfectivo(mem(), HOY)).toEqual({ estado: 'activa', diasRestantes: 30 });
  });

  it('por vencer cuando faltan 7 días o menos (incluido el último día)', () => {
    expect(estadoEfectivo(mem({ fechaFin: '2026-10-20' }), HOY)).toMatchObject({ estado: 'por-vencer', diasRestantes: 7 });
    expect(estadoEfectivo(mem({ fechaFin: '2026-10-21' }), HOY).estado).toBe('activa');
    expect(estadoEfectivo(mem({ fechaFin: HOY }), HOY)).toMatchObject({ estado: 'por-vencer', diasRestantes: 0 });
  });

  it('"activa" en el backend pero con la fecha ya pasada es vencida', () => {
    expect(estadoEfectivo(mem({ fechaFin: '2026-10-12' }), HOY).estado).toBe('vencida');
  });

  it('respeta los estados vencida y cancelada guardados', () => {
    expect(estadoEfectivo(mem({ estado: 'vencida' }), HOY).estado).toBe('vencida');
    expect(estadoEfectivo(mem({ estado: 'cancelada', fechaFin: '2099-01-01' }), HOY).estado).toBe('cancelada');
  });
});

describe('contarPorEstado y filtrar', () => {
  const lista = [
    mem({ id: 1 }),
    mem({ id: 2, fechaFin: '2026-10-15' }),
    mem({ id: 3, fechaFin: '2026-09-01' }),
    mem({ id: 4, estado: 'cancelada' }),
    mem({ id: 5 }),
  ];

  it('cuenta cada estado', () => {
    expect(contarPorEstado(lista, HOY)).toEqual({ todas: 5, activa: 2, 'por-vencer': 1, vencida: 1, cancelada: 1 });
  });

  const filas = lista.map((m, i) => ({ m, buscable: i === 0 ? 'María Rojas maria@apexfit.test' : `Cliente ${m.id} c${m.id}@apexfit.test` }));

  it('filtra por estado', () => {
    expect(filtrar(filas, { texto: '', estado: 'vencida' }, HOY).map((f) => f.m.id)).toEqual([3]);
    expect(filtrar(filas, { texto: '', estado: 'todas' }, HOY).length).toBe(5);
  });

  it('busca sin importar tildes ni mayúsculas, y combina con el estado', () => {
    expect(filtrar(filas, { texto: 'MARÍA', estado: 'todas' }, HOY).map((f) => f.m.id)).toEqual([1]);
    expect(filtrar(filas, { texto: 'maria', estado: 'vencida' }, HOY)).toEqual([]);
  });
});

describe('planes y renovación', () => {
  it('buscarPlan no distingue mayúsculas y devuelve undefined si no existe', () => {
    expect(buscarPlan('trimestral')?.dias).toBe(90);
    expect(buscarPlan('Premium')).toBeUndefined();
  });

  it('fechaFinDePlan suma los días del plan', () => {
    expect(fechaFinDePlan(PLANES[0], '2026-10-13')).toBe('2026-11-12');
    expect(fechaFinDePlan(PLANES[2], '2026-10-13')).toBe('2027-10-13');
  });

  it('renovar una membresía vigente empieza al día siguiente de su fin', () => {
    expect(inicioDeRenovacion(mem({ fechaFin: '2026-10-20' }), HOY)).toBe('2026-10-21');
  });

  it('renovar una vencida o cancelada empieza hoy', () => {
    expect(inicioDeRenovacion(mem({ fechaFin: '2026-09-01' }), HOY)).toBe(HOY);
    expect(inicioDeRenovacion(mem({ estado: 'cancelada', fechaFin: '2099-01-01' }), HOY)).toBe(HOY);
    expect(inicioDeRenovacion(mem({ estado: 'vencida' }), HOY)).toBe(HOY);
  });
});
