import { actualId, aplazar, borrarAvance, claveSesion, completar, guardarAvance, iniciarSesion, leerAvance, soloAplazados, terminar } from './sesion-guiada';

const ids = [1, 2, 3, 4];

describe('sesión guiada: completar y aplazar', () => {
  beforeEach(() => localStorage.clear());

  it('completar pasa al siguiente y, al hacer el último, termina', () => {
    let s = iniciarSesion(7, ids);
    expect(actualId(s)).toBe(1);
    s = completar(s);
    expect([actualId(s), s.completados]).toEqual([2, [1]]);
    s = completar(completar(completar(s)));
    expect(s).toMatchObject({ pendientes: [], completados: [1, 2, 3, 4], terminada: true });
    expect(actualId(s)).toBeNull();
  });

  it('aplazar manda el ejercicio al final de la fila y muestra el siguiente', () => {
    const s = aplazar(iniciarSesion(7, ids));
    expect(s.pendientes).toEqual([2, 3, 4, 1]);
    expect(s.aplazados).toEqual([1]);
    expect(soloAplazados(s)).toBe(false);
  });

  it('cuando solo quedan aplazados lo detecta, y se pueden seguir rotando o completar', () => {
    let s = iniciarSesion(7, [1, 2, 3]);
    s = aplazar(s); // [2,3,1]
    s = aplazar(s); // [3,1,2]
    s = completar(s); // [1,2] → solo aplazados
    expect(soloAplazados(s)).toBe(true);
    expect(aplazar(s).pendientes).toEqual([2, 1]); // sigue rotando
    s = completar(s); // [2]
    expect(aplazar(s)).toBe(s); // con uno solo no hay a dónde mandarlo
    expect(completar(s).terminada).toBe(true);
  });

  it('terminar solo vale cuando quedan solo aplazados, y deja esos sin hacer', () => {
    const s = iniciarSesion(7, [1, 2]);
    expect(terminar(s)).toBe(s); // todavía hay uno nuevo
    const solo = completar(aplazar(s)); // [1] aplazado
    const fin = terminar(solo);
    expect(fin).toMatchObject({ terminada: true, pendientes: [1], completados: [2] });
  });

  it('guarda por usuario y fecha, restaura al recargar y se descarta si cambió la rutina', () => {
    const clave = claveSesion(5, '2026-10-22');
    const s = completar(aplazar(iniciarSesion(7, ids)));
    guardarAvance(clave, s);
    expect(leerAvance(clave, 7, ids)).toEqual(s);
    expect(leerAvance(claveSesion(6, '2026-10-22'), 7, ids)).toBeNull(); // otro usuario
    expect(leerAvance(claveSesion(5, '2026-10-23'), 7, ids)).toBeNull(); // otro día
    expect(leerAvance(clave, 8, ids)).toBeNull(); // otra rutina
    expect(leerAvance(clave, 7, [1, 2, 3, 9])).toBeNull(); // el entrenador cambió los ejercicios
    localStorage.setItem(clave, '{roto');
    expect(leerAvance(clave, 7, ids)).toBeNull();
    guardarAvance(clave, s);
    borrarAvance(clave);
    expect(leerAvance(clave, 7, ids)).toBeNull();
  });
});
