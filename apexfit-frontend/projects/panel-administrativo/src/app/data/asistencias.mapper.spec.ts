import { aAsistencia, aDtoConSalida, codigoDe, deDia, estaAdentro, leerCodigo, ultimaAsistenciaPorUsuario } from './asistencias.mapper';
import { Asistencia } from './asistencias.models';

const asis = (id: number, idUsuario: number, fecha: string, horaEntrada: string, horaSalida: string | null = null): Asistencia => ({
  id, idUsuario, fecha, horaEntrada, horaSalida, metodo: 'qr',
});

describe('aAsistencia', () => {
  it('normaliza el método y la salida ausente', () => {
    expect(aAsistencia({ idAsistencia: 3, idUsuario: 7, fecha: '2026-10-13', horaEntrada: '07:42:10', metodoRegistro: 'QR' })).toEqual({
      id: 3, idUsuario: 7, fecha: '2026-10-13', horaEntrada: '07:42:10', horaSalida: null, metodo: 'qr',
    });
  });
});

describe('deDia y estaAdentro', () => {
  const lista = [
    asis(1, 1, '2026-10-13', '07:00:00', '08:00:00'),
    asis(2, 2, '2026-10-13', '09:30:00'),
    asis(3, 3, '2026-10-12', '10:00:00'),
  ];

  it('filtra por día y deja primero la entrada más reciente', () => {
    expect(deDia(lista, '2026-10-13').map((a) => a.id)).toEqual([2, 1]);
  });

  it('está dentro mientras no tenga hora de salida', () => {
    expect(estaAdentro(lista[0])).toBe(false);
    expect(estaAdentro(lista[1])).toBe(true);
  });
});

describe('aDtoConSalida', () => {
  it('reenvía todos los campos (el backend los exige) y solo agrega la salida', () => {
    expect(aDtoConSalida(asis(5, 7, '2026-10-13', '07:42:10'), '09:00:00')).toEqual({
      idAsistencia: 5, idUsuario: 7, fecha: '2026-10-13', horaEntrada: '07:42:10', horaSalida: '09:00:00', metodoRegistro: 'qr',
    });
  });
});

describe('leerCodigo', () => {
  it('entiende el formato completo del QR', () => {
    expect(leerCodigo('APEXFIT-USER-5-carlos@apexfit.com')).toEqual({ tipo: 'id', id: 5 });
    expect(leerCodigo('  apexfit-user-12-ana-maria@apexfit.com ')).toEqual({ tipo: 'id', id: 12 });
  });

  it('entiende un id suelto y un correo', () => {
    expect(leerCodigo('42')).toEqual({ tipo: 'id', id: 42 });
    expect(leerCodigo(' Carlos@ApexFit.com ')).toEqual({ tipo: 'correo', correo: 'carlos@apexfit.com' });
  });

  it('rechaza lo que no se puede interpretar', () => {
    for (const malo of ['', '   ', 'hola', 'APEXFIT-USER-abc-x@y.z', 'APEXFIT-USER-0-x@y.z', 'APEXFIT-USER-']) {
      expect(leerCodigo(malo)).toBeNull();
    }
  });

  it('codigoDe arma el mismo formato que lee leerCodigo', () => {
    expect(leerCodigo(codigoDe({ id: 9, correo: 'x@y.z' }))).toEqual({ tipo: 'id', id: 9 });
  });
});

describe('ultimaAsistenciaPorUsuario', () => {
  it('guarda la fecha más reciente de cada usuario', () => {
    const mapa = ultimaAsistenciaPorUsuario([
      asis(1, 1, '2026-10-01', '07:00:00'), asis(2, 1, '2026-10-10', '07:00:00'), asis(3, 2, '2026-09-20', '07:00:00'),
    ]);
    expect(mapa.get(1)).toBe('2026-10-10');
    expect(mapa.get(2)).toBe('2026-09-20');
    expect(mapa.get(3)).toBeUndefined();
  });
});
