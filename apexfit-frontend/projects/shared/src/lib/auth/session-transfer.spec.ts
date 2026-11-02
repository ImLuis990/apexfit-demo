import { Session } from './auth.models';
import { buildHandoffUrl, decodeSession, encodeSession, readHandoffSession } from './session-transfer';

const sesion: Session = { token: 'aaa.bbb.ccc', id: 7, correo: 'entrenador@apexfit.test', rol: 'entrenador' };

describe('session-transfer', () => {
  it('codifica y decodifica una sesión sin perder datos (incluye tildes)', () => {
    const conTildes: Session = { ...sesion, correo: 'andrés.peña@apexfit.test' };
    expect(decodeSession(encodeSession(conTildes))).toEqual(conTildes);
  });

  it('el valor codificado es seguro para una URL', () => {
    expect(encodeSession(sesion)).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('buildHandoffUrl arma la dirección /sesion#s=… y ignora la barra final', () => {
    const url = buildHandoffUrl('http://localhost:4201/', sesion);
    expect(url.startsWith('http://localhost:4201/sesion#s=')).toBe(true);
    const fragment = url.split('#')[1];
    expect(readHandoffSession(fragment)).toEqual(sesion);
  });

  it('readHandoffSession devuelve null si falta o está dañado', () => {
    expect(readHandoffSession(null)).toBeNull();
    expect(readHandoffSession('')).toBeNull();
    expect(readHandoffSession('x=1')).toBeNull();
    expect(readHandoffSession('s=%%%no-es-base64')).toBeNull();
  });

  it('decodeSession rechaza datos incompletos o con un rol inválido', () => {
    const encode = (o: object) => encodeSession(o as Session);
    expect(decodeSession(encode({ token: 't', id: 1, correo: 'a@b.c' }))).toBeNull();
    expect(decodeSession(encode({ token: 't', id: 1, correo: 'a@b.c', rol: 'superadmin' }))).toBeNull();
  });
});
