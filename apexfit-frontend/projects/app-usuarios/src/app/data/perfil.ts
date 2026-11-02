export interface Perfil {
  id: number;
  nombre: string;
  apellido: string;
  correo: string;
}

/** 'Carlos Pérez' → 'CP'. Si falta el apellido, las dos primeras letras del nombre. */
export function iniciales(nombre: string, apellido: string): string {
  const n = nombre.trim();
  const a = apellido.trim();
  if (n && a) return (n[0] + a[0]).toUpperCase();
  return (n || a).slice(0, 2).toUpperCase();
}

/** 'Carlos Andrés' → 'Carlos' */
export function primerNombre(nombre: string): string {
  return nombre.trim().split(/\s+/)[0] ?? '';
}
