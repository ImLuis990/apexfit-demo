import { armarCliente, aRegistros, asignacionVigente, elegirRutinaActiva, iniciales } from './clientes.mapper';
import { RutinaDto } from './dtos';
import { aUsuario } from './usuarios.mapper';

const rutina = (id: number, estado: string, fecha: string | null, nombre = `Rutina ${id}`): RutinaDto => ({
  idRutina: id, nombre, descripcion: null, idEntrenador: 2, idCliente: 5, fechaCreacion: fecha, estado,
});

describe('asignacionVigente', () => {
  it('vigente salvo que el backend la marque inactiva o terminada', () => {
    expect(asignacionVigente({ idEntrenador: 1, idCliente: 2 })).toBe(true);
    expect(asignacionVigente({ idEntrenador: 1, idCliente: 2, estado: 'activa' })).toBe(true);
    expect(asignacionVigente({ idEntrenador: 1, idCliente: 2, estado: 'activo' })).toBe(true);
    expect(asignacionVigente({ idEntrenador: 1, idCliente: 2, estado: 'inactiva' })).toBe(false);
    expect(asignacionVigente({ idEntrenador: 1, idCliente: 2, estado: 'Finalizada' })).toBe(false);
  });
});

describe('elegirRutinaActiva', () => {
  it('ignora las inactivas y devuelve null si no hay ninguna activa', () => {
    expect(elegirRutinaActiva([rutina(1, 'inactiva', '2026-01-01T00:00:00')])).toBeNull();
    expect(elegirRutinaActiva([])).toBeNull();
  });

  it('si hubiera varias activas, toma la más reciente', () => {
    const r = elegirRutinaActiva([rutina(1, 'activa', '2026-01-01T00:00:00'), rutina(2, 'ACTIVA', '2026-03-01T00:00:00')]);
    expect(r?.idRutina).toBe(2);
  });
});

describe('aRegistros', () => {
  it('ordena del más reciente al más antiguo, desempata por id y convierte a número', () => {
    const r = aRegistros([
      { idProgreso: 1, fecha: '2026-09-01', peso: '77.00' as unknown as number, imc: null },
      { idProgreso: 3, fecha: '2026-10-12', peso: 74.6, imc: 24.08 },
      { idProgreso: 2, fecha: '2026-10-12', peso: 75, imc: 24.2 },
    ]);
    expect(r.map((x) => x.id)).toEqual([3, 2, 1]);
    expect(r[2].peso).toBe(77);
    expect(r[2].imc).toBeNull();
  });
});

describe('iniciales', () => {
  it('nombre y apellido; o las dos primeras letras si falta uno', () => {
    expect(iniciales('Carlos', 'Pérez')).toBe('CP');
    expect(iniciales('carlos', '')).toBe('CA');
  });
});

describe('armarCliente', () => {
  const usuario = aUsuario({ idUsuario: 5, nombre: 'Carlos', apellido: 'Pérez', correo: 'c@apexfit.test', idRol: 1, telefono: null, fechaNacimiento: null, estado: 'activo' });

  it('junta nombre, rutina activa y registros', () => {
    const c = armarCliente(5, usuario, [rutina(1, 'inactiva', null), rutina(2, 'activa', '2026-10-01T00:00:00', 'Fuerza semana 1')], [
      { fecha: '2026-10-12', peso: 74.6, imc: 24.08 },
    ]);
    expect(c).toMatchObject({ idCliente: 5, nombre: 'Carlos Pérez', correo: 'c@apexfit.test', iniciales: 'CP', rutinaActiva: 'Fuerza semana 1' });
    expect(c.registros).toHaveLength(1);
  });

  it('si el usuario no está en la lista, usa un nombre de respaldo', () => {
    const c = armarCliente(9, undefined, [], []);
    expect(c).toMatchObject({ nombre: 'Cliente #9', correo: '', iniciales: '?', rutinaActiva: null, registros: [] });
  });
});
