import { Asistencia } from './asistencias.models';
import { mejorMembresia } from './membresias.mapper';
import { Membresia } from './membresias.models';
import { clientesActivos, conMembresiaVigente, entradasPorHora, inactivos, porVencer } from './resumen.mapper';
import { aUsuario } from './usuarios.mapper';
import { ID_ROL, Usuario } from './usuarios.models';
import { Rol } from 'shared';

const HOY = '2026-10-13';

const user = (id: number, nombre: string, rol: Rol = 'cliente', estado = 'activo'): Usuario =>
  aUsuario({ idUsuario: id, nombre, apellido: 'X', correo: `${nombre.toLowerCase()}@apexfit.test`, idRol: ID_ROL[rol], telefono: null, fechaNacimiento: null, estado });

const mem = (id: number, idUsuario: number, fin: string, estado = 'activa'): Membresia => ({
  id, idUsuario, tipo: 'Mensual', fechaInicio: '2026-01-01', fechaFin: fin, precio: 1, estado,
});

const asis = (idUsuario: number, fecha: string, hora = '08:00:00'): Asistencia => ({
  id: Math.random(), idUsuario, fecha, horaEntrada: hora, horaSalida: null, metodo: 'qr',
});

describe('mejorMembresia', () => {
  it('sin membresías, null', () => {
    expect(mejorMembresia([], HOY)).toBeNull();
  });

  it('prefiere la vigente que vence más tarde aunque haya otras vencidas', () => {
    const m = mejorMembresia([mem(1, 1, '2026-08-01'), mem(2, 1, '2026-11-01'), mem(3, 1, '2026-10-20')], HOY);
    expect(m?.m.id).toBe(2);
    expect(m?.estado).toBe('activa');
  });

  it('si ninguna vale, devuelve la más reciente para poder explicar por qué', () => {
    const m = mejorMembresia([mem(1, 1, '2026-08-01'), mem(2, 1, '2026-09-20', 'cancelada')], HOY);
    expect(m?.m.id).toBe(2);
    expect(m?.estado).toBe('cancelada');
  });
});

describe('indicadores del resumen', () => {
  const usuarios = [
    user(1, 'Carlos'), user(2, 'Maria'), user(3, 'Pedro'), user(4, 'Laura'),
    user(5, 'Mario', 'entrenador'), user(6, 'Ana', 'cliente', 'inactivo'),
  ];
  const membresias = [
    mem(1, 1, '2026-12-01'), // Carlos: activa
    mem(2, 2, '2026-10-16'), // María: por vencer (3 días)
    mem(3, 3, '2026-09-01'), // Pedro: vencida
    mem(4, 6, '2026-12-01'), // Ana: inactiva
    // Laura: sin membresía
  ];

  it('clientesActivos cuenta solo clientes activos (no entrenadores ni inactivos)', () => {
    expect(clientesActivos(usuarios).map((u) => u.nombre)).toEqual(['Carlos', 'Maria', 'Pedro', 'Laura']);
  });

  it('conMembresiaVigente cuenta activas y por vencer', () => {
    expect(conMembresiaVigente(usuarios, membresias, HOY)).toBe(2);
  });

  it('porVencer lista solo a los clientes con la membresía por vencer', () => {
    expect(porVencer(usuarios, membresias, HOY)).toEqual([
      { idUsuario: 2, nombre: 'Maria X', vence: '2026-10-16', diasRestantes: 3 },
    ]);
  });

  describe('inactivos', () => {
    it('incluye a los vigentes que nunca asistieron o llevan más de 10 días sin venir', () => {
      const lista = inactivos(usuarios, membresias, [asis(1, '2026-10-01'), asis(2, '2026-10-12')], HOY);
      // Carlos: 12 días sin venir → inactivo. María: vino ayer → no. Pedro (vencida) y Laura (sin membresía) no cuentan.
      expect(lista.map((f) => [f.nombre, f.dias])).toEqual([['Carlos X', 12]]);
    });

    it('un cliente vigente que nunca ha asistido aparece primero, con dias = null', () => {
      const lista = inactivos(usuarios, membresias, [asis(1, '2026-10-01')], HOY);
      expect(lista.map((f) => [f.nombre, f.dias])).toEqual([['Maria X', null], ['Carlos X', 12]]);
    });

    it('exactamente 10 días todavía no es inactivo', () => {
      expect(inactivos(usuarios, membresias, [asis(1, '2026-10-03'), asis(2, '2026-10-12')], HOY)).toEqual([]);
    });
  });

  describe('entradasPorHora', () => {
    it('cubre de 6 a 22 horas aunque no haya entradas', () => {
      const h = entradasPorHora([]);
      expect(h[0]).toEqual({ hora: 6, cantidad: 0 });
      expect(h[h.length - 1]).toEqual({ hora: 22, cantidad: 0 });
      expect(h).toHaveLength(17);
    });

    it('cuenta por hora y amplía el rango si hay entradas fuera del horario normal', () => {
      const h = entradasPorHora([asis(1, HOY, '07:10:00'), asis(2, HOY, '07:55:00'), asis(3, HOY, '23:30:00'), asis(4, HOY, '05:00:00')]);
      expect(h.find((x) => x.hora === 7)?.cantidad).toBe(2);
      expect(h[0].hora).toBe(5);
      expect(h[h.length - 1].hora).toBe(23);
      expect(h.reduce((s, x) => s + x.cantidad, 0)).toBe(4);
    });
  });
});
