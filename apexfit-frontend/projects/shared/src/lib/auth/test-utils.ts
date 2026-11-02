/** Crea un JWT falso (sin firma real) con la expiración indicada, solo para pruebas. */
export function fakeJwt(expiresInSeconds: number): string {
  const encode = (obj: object) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
  return `${encode({ alg: 'HS256' })}.${encode({ sub: 'x@apexfit.test', exp })}.firma`;
}
