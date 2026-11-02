import { ROLES, Session } from './auth.models';

/*
 * Traspaso de sesión entre apps. Cada app vive en otro "origen" (puerto o dominio) y el
 * navegador no comparte el almacenamiento entre orígenes, así que el login entrega la sesión
 * al panel dentro de la URL, en el fragmento (#): esa parte NUNCA se envía al servidor.
 *   http://localhost:4201/sesion#s=<sesión en base64url>
 */

const PARAM = 's';

export function buildHandoffUrl(appUrl: string, session: Session): string {
  const base = appUrl.replace(/\/+$/, '');
  return `${base}/sesion#${PARAM}=${encodeSession(session)}`;
}

/** Lee la sesión desde el fragmento de la URL (sin el '#'). Devuelve null si falta o es inválida. */
export function readHandoffSession(fragment: string | null): Session | null {
  const encoded = new URLSearchParams(fragment ?? '').get(PARAM);
  return encoded ? decodeSession(encoded) : null;
}

export function encodeSession(session: Session): string {
  const bytes = new TextEncoder().encode(JSON.stringify(session));
  let binary = '';
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeSession(encoded: string): Session | null {
  try {
    const binary = atob(encoded.replace(/-/g, '+').replace(/_/g, '/'));
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    const data = JSON.parse(new TextDecoder().decode(bytes));
    if (
      typeof data?.token === 'string' &&
      typeof data.id === 'number' &&
      typeof data.correo === 'string' &&
      ROLES.includes(data.rol)
    ) {
      return { token: data.token, id: data.id, correo: data.correo, rol: data.rol };
    }
    return null;
  } catch {
    return null;
  }
}
