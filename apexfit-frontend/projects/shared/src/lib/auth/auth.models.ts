export type Rol = 'cliente' | 'entrenador' | 'administrador';

export const ROLES: readonly Rol[] = ['cliente', 'entrenador', 'administrador'];

/** Respuesta de POST /api/v1/auth/login */
export interface LoginResponse {
  token: string;
  type: string;
  id: number;
  correo: string;
  roles: string[]; // p. ej. ["ROLE_CLIENTE"]
}

/** Lo que guardamos en el navegador tras iniciar sesión. */
export interface Session {
  token: string;
  id: number;
  correo: string;
  rol: Rol;
}

/** Convierte ["ROLE_CLIENTE"] en 'cliente'. Devuelve null si no reconoce ninguno. */
export function rolFromAuthorities(authorities: readonly string[]): Rol | null {
  for (const authority of authorities) {
    const nombre = authority.replace(/^ROLE_/i, '').toLowerCase();
    const rol = ROLES.find((r) => r === nombre);
    if (rol) return rol;
  }
  return null;
}
