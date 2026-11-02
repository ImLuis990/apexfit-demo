import { MENU, inicioDe, menuDe } from './menu';

describe('menú del panel', () => {
  it('el administrador ve Resumen, Asistencia, Inactividad, Usuarios, Asignaciones, Membresías y Ejercicios, en ese orden', () => {
    expect(menuDe('administrador').map((i) => [i.etiqueta, i.ruta])).toEqual([
      ['Resumen', '/resumen'],
      ['Asistencia', '/asistencia'],
      ['Inactividad', '/inactividad'],
      ['Usuarios', '/usuarios'],
      ['Asignaciones', '/asignaciones'],
      ['Membresías', '/membresias'],
      ['Ejercicios', '/ejercicios'],
    ]);
  });

  it('el entrenador ve Mis clientes, Nueva rutina, Mis rutinas y Ejercicios', () => {
    expect(menuDe('entrenador').map((i) => [i.etiqueta, i.ruta])).toEqual([
      ['Mis clientes', '/clientes'],
      ['Nueva rutina', '/rutinas'],
      ['Mis rutinas', '/mis-rutinas'],
      ['Ejercicios', '/ejercicios'],
    ]);
  });

  it('el cliente (o nadie) no tiene menú', () => {
    expect(menuDe('cliente')).toEqual([]);
    expect(menuDe(undefined)).toEqual([]);
    expect(menuDe(null)).toEqual([]);
  });

  it('el inicio de cada rol es la primera opción de su menú', () => {
    expect(inicioDe('administrador')).toBe('/resumen');
    expect(inicioDe('entrenador')).toBe('/clientes');
  });

  it('sin un rol del panel no falla y devuelve una ruta del panel', () => {
    expect(inicioDe('cliente')).toBe(MENU.administrador[0].ruta);
    expect(inicioDe(undefined)).toBe(MENU.administrador[0].ruta);
  });

  it('todas las rutas son absolutas y no se repiten dentro de un mismo rol', () => {
    for (const items of [MENU.administrador, MENU.entrenador]) {
      const rutas = items.map((i) => i.ruta);
      expect(rutas.every((r) => r.startsWith('/'))).toBe(true);
      expect(new Set(rutas).size).toBe(rutas.length);
    }
  });
});
