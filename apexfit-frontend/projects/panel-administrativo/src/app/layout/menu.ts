import { Rol } from 'shared';

/** Íconos que sabe dibujar el menú (panel-shell.html tiene un caso por cada uno). */
export type IconoMenu = 'resumen' | 'asistencia' | 'inactividad' | 'usuarios' | 'asignaciones' | 'membresias' | 'ejercicios' | 'clientes' | 'rutinas' | 'lista';

export interface ItemMenu {
  /** Ruta absoluta dentro del panel. Tiene que existir en app.routes.ts: app.routes.spec lo comprueba. */
  ruta: string;
  etiqueta: string;
  icono: IconoMenu;
}

export type RolDelPanel = 'administrador' | 'entrenador';

/**
 * Única fuente de verdad del menú del panel. El orden de cada lista es el orden del menú
 * y la primera opción de cada rol es su pantalla de inicio (la usa inicioGuard).
 */
export const MENU: Readonly<Record<RolDelPanel, readonly ItemMenu[]>> = {
  administrador: [
    { ruta: '/resumen', etiqueta: 'Resumen', icono: 'resumen' },
    { ruta: '/asistencia', etiqueta: 'Asistencia', icono: 'asistencia' },
    { ruta: '/inactividad', etiqueta: 'Inactividad', icono: 'inactividad' },
    { ruta: '/usuarios', etiqueta: 'Usuarios', icono: 'usuarios' },
    { ruta: '/asignaciones', etiqueta: 'Asignaciones', icono: 'asignaciones' },
    { ruta: '/membresias', etiqueta: 'Membresías', icono: 'membresias' },
    { ruta: '/ejercicios', etiqueta: 'Ejercicios', icono: 'ejercicios' },
  ],
  entrenador: [
    { ruta: '/clientes', etiqueta: 'Mis clientes', icono: 'clientes' },
    { ruta: '/rutinas', etiqueta: 'Nueva rutina', icono: 'rutinas' },
    { ruta: '/mis-rutinas', etiqueta: 'Mis rutinas', icono: 'lista' },
    { ruta: '/ejercicios', etiqueta: 'Ejercicios', icono: 'ejercicios' },
  ],
};

export function esRolDelPanel(rol: Rol | null | undefined): rol is RolDelPanel {
  return rol === 'administrador' || rol === 'entrenador';
}

/** Las opciones del menú de un rol (vacío para el cliente o sin sesión). */
export function menuDe(rol: Rol | null | undefined): readonly ItemMenu[] {
  return esRolDelPanel(rol) ? MENU[rol] : [];
}

/**
 * Ruta de inicio de un rol: la primera opción de su menú. Para un rol que no es del panel devuelve
 * la del administrador: accessGuard ya lo mandó al login antes de que esta ruta se use.
 */
export function inicioDe(rol: Rol | null | undefined): string {
  return menuDe(rol)[0]?.ruta ?? MENU.administrador[0].ruta;
}
