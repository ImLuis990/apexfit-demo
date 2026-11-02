import { Rol } from 'shared';
import { aAsignacion, aDtoEstado, armarTablero, filasDelPar, opcionesParaEntrenador } from './asignaciones.mapper';
import { Asignacion } from './asignaciones.models';
import { aUsuario } from './usuarios.mapper';
import { ID_ROL, Usuario } from './usuarios.models';

const usuario = (id: number, nombre: string, apellido: string, rol: Rol = 'cliente', estado = 'activo'): Usuario =>
  aUsuario({
    idUsuario: id, nombre, apellido, correo: `${nombre.toLowerCase()}@apexfit.test`, idRol: ID_ROL[rol],
    telefono: null, fechaNacimiento: null, estado,
  });

const asig = (id: number, idEntrenador: number, idCliente: number, vigente = true): Asignacion => ({
  id, idEntrenador, idCliente, desde: '2026-10-01', estado: vigente ? 'activa' : 'inactiva', vigente,
});

describe('aAsignacion', () => {
  it('convierte el DTO: recorta la fecha y marca si sigue vigente', () => {
    expect(
      aAsignacion({ idAsignacion: 5, idEntrenador: 2, idCliente: 7, fechaAsignacion: '2026-10-12T09:30:00', estado: 'activa' }),
    ).toEqual({ id: 5, idEntrenador: 2, idCliente: 7, desde: '2026-10-12', estado: 'activa', vigente: true });
  });

  it('una asignación inactiva no está vigente', () => {
    expect(aAsignacion({ idAsignacion: 6, idEntrenador: 2, idCliente: 7, estado: 'inactiva' }).vigente).toBe(false);
  });

  it('si el backend no manda estado ni fecha, se asume activa y sin fecha', () => {
    expect(aAsignacion({ idEntrenador: 2, idCliente: 7 })).toEqual({
      id: 0, idEntrenador: 2, idCliente: 7, desde: null, estado: 'activa', vigente: true,
    });
  });
});

describe('aDtoEstado', () => {
  it('reenvía los ids y cambia solo el estado', () => {
    expect(aDtoEstado(asig(5, 2, 7), 'inactiva')).toEqual({ idAsignacion: 5, idEntrenador: 2, idCliente: 7, estado: 'inactiva' });
  });
});

describe('filasDelPar', () => {
  it('devuelve las filas (vigentes o no) de esa pareja y de ninguna otra', () => {
    const todas = [asig(1, 2, 7), asig(2, 2, 7, false), asig(3, 2, 8), asig(4, 3, 7)];
    expect(filasDelPar(todas, 2, 7).map((f) => f.id)).toEqual([1, 2]);
  });
});

describe('armarTablero', () => {
  const usuarios = [
    usuario(1, 'Carlos', 'Pérez'),
    usuario(2, 'María', 'Rojas'),
    usuario(3, 'Pedro', 'Salgado'),
    usuario(4, 'Luisa', 'Zapata', 'cliente', 'inactivo'),
    usuario(10, 'Mario', 'Díaz', 'entrenador'),
    usuario(11, 'Ana', 'Báez', 'entrenador'),
    usuario(12, 'Jorge', 'Vega', 'entrenador', 'inactivo'),
    usuario(20, 'Admin', 'Uno', 'administrador'),
  ];

  it('agrupa los clientes vigentes de cada entrenador, ordenados por nombre', () => {
    const t = armarTablero([asig(1, 10, 2), asig(2, 10, 1), asig(3, 11, 3)], usuarios);
    const mario = t.entrenadores.find((f) => f.entrenador.id === 10);
    expect(mario?.clientes.map((c) => c.nombre)).toEqual(['Carlos Pérez', 'María Rojas']);
    expect(t.entrenadores.find((f) => f.entrenador.id === 11)?.clientes.map((c) => c.idCliente)).toEqual([3]);
  });

  it('ordena a los entrenadores por apellido y deja fuera a administradores y clientes', () => {
    const t = armarTablero([], usuarios);
    expect(t.entrenadores.map((f) => f.entrenador.id)).toEqual([11, 10]);
  });

  it('las asignaciones inactivas no cuentan', () => {
    const t = armarTablero([asig(1, 10, 1, false)], usuarios);
    expect(t.entrenadores.find((f) => f.entrenador.id === 10)?.clientes).toEqual([]);
    expect(t.sinEntrenador.map((u) => u.id)).toContain(1);
  });

  it('sin entrenador: solo los clientes activos que nadie atiende', () => {
    const t = armarTablero([asig(1, 10, 1)], usuarios);
    expect(t.sinEntrenador.map((u) => u.id)).toEqual([2, 3]); // Luisa está inactiva y no aparece
    expect(t.conEntrenador).toBe(1);
  });

  it('un cliente con dos entrenadores se cuenta una sola vez', () => {
    const t = armarTablero([asig(1, 10, 1), asig(2, 11, 1)], usuarios);
    expect(t.conEntrenador).toBe(1);
  });

  it('un entrenador inactivo solo aparece si todavía tiene clientes', () => {
    expect(armarTablero([], usuarios).entrenadores.some((f) => f.entrenador.id === 12)).toBe(false);
    const t = armarTablero([asig(1, 12, 2)], usuarios);
    const jorge = t.entrenadores.find((f) => f.entrenador.id === 12);
    expect(jorge?.entrenador.activo).toBe(false);
    expect(jorge?.clientes.map((c) => c.idCliente)).toEqual([2]);
  });

  it('si el cliente ya no está en la lista de usuarios, lo muestra por su número', () => {
    const t = armarTablero([asig(1, 10, 99)], usuarios);
    expect(t.entrenadores.find((f) => f.entrenador.id === 10)?.clientes[0]).toMatchObject({ nombre: 'Cliente #99', correo: '' });
  });
});

describe('opcionesParaEntrenador', () => {
  const usuarios = [
    usuario(1, 'Carlos', 'Pérez'),
    usuario(2, 'María', 'Rojas'),
    usuario(3, 'Pedro', 'Salgado'),
    usuario(4, 'Luisa', 'Zapata', 'cliente', 'inactivo'),
    usuario(10, 'Mario', 'Díaz', 'entrenador'),
    usuario(11, 'Ana', 'Báez', 'entrenador'),
  ];

  it('no ofrece a los que ya son de ese entrenador ni a los inactivos', () => {
    const o = opcionesParaEntrenador(10, [asig(1, 10, 1)], usuarios);
    const ids = [...o.libres.map((u) => u.id), ...o.conOtros.map((x) => x.cliente.id)];
    expect(ids).toEqual([2, 3]);
  });

  it('separa a los libres de los que ya tienen otro entrenador, diciendo cuál', () => {
    const o = opcionesParaEntrenador(10, [asig(1, 11, 2)], usuarios);
    expect(o.libres.map((u) => u.id)).toEqual([1, 3]);
    expect(o.conOtros).toEqual([{ cliente: expect.objectContaining({ id: 2 }), entrenadores: ['Ana Báez'] }]);
  });

  it('una asignación inactiva con otro entrenador no cuenta como "tiene otro"', () => {
    const o = opcionesParaEntrenador(10, [asig(1, 11, 2, false)], usuarios);
    expect(o.conOtros).toEqual([]);
    expect(o.libres.map((u) => u.id)).toContain(2);
  });

  it('un cliente que fue de este entrenador y ya no, vuelve a ofrecerse', () => {
    const o = opcionesParaEntrenador(10, [asig(1, 10, 1, false)], usuarios);
    expect(o.libres.map((u) => u.id)).toContain(1);
  });
});
