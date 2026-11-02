import { dibujarQr, modulosQr, textoQr } from './qr';

describe('qr', () => {
  it('textoQr usa el formato que entiende el backend', () => {
    expect(textoQr(5, 'carlos@apexfit.com')).toBe('APEXFIT-USER-5-carlos@apexfit.com');
  });

  it('la matriz es cuadrada y su tamaño cumple 17 + 4 × versión', () => {
    const m = modulosQr(textoQr(5, 'carlos@apexfit.com'));
    expect(m.length).toBeGreaterThanOrEqual(21);
    expect((m.length - 17) % 4).toBe(0);
    expect(m.every((fila) => fila.length === m.length)).toBe(true);
  });

  it('tiene los 3 cuadros de posición en las esquinas (los que usan los lectores)', () => {
    const m = modulosQr(textoQr(5, 'carlos@apexfit.com'));
    const n = m.length;
    const cuadro = (fila: number, col: number) => {
      // borde oscuro de 7×7, aro claro y centro oscuro de 3×3
      for (let i = 0; i < 7; i++) {
        expect(m[fila][col + i]).toBe(true);
        expect(m[fila + 6][col + i]).toBe(true);
        expect(m[fila + i][col]).toBe(true);
        expect(m[fila + i][col + 6]).toBe(true);
      }
      expect(m[fila + 1][col + 1]).toBe(false);
      expect(m[fila + 3][col + 3]).toBe(true);
    };
    cuadro(0, 0);
    cuadro(0, n - 7);
    cuadro(n - 7, 0);
  });

  it('es determinista y distinto para textos distintos', () => {
    const a = modulosQr('APEXFIT-USER-1-a@b.c');
    expect(modulosQr('APEXFIT-USER-1-a@b.c')).toEqual(a);
    expect(modulosQr('APEXFIT-USER-2-a@b.c')).not.toEqual(a);
  });

  it('el dibujo SVG reconstruye exactamente la matriz (no se pierde ningún módulo)', () => {
    const texto = textoQr(12, 'maria.rojas@apexfit.com');
    const { lado, ruta } = dibujarQr(texto);
    const esperado = modulosQr(texto);
    expect(lado).toBe(esperado.length);

    const rebuilt = Array.from({ length: lado }, () => Array<boolean>(lado).fill(false));
    for (const [, x, y, largo] of ruta.matchAll(/M(\d+) (\d+)h(\d+)v1h-\3z/g)) {
      for (let i = 0; i < Number(largo); i++) rebuilt[Number(y)][Number(x) + i] = true;
    }
    expect(rebuilt).toEqual(esperado);
    expect(ruta.replace(/M\d+ \d+h\d+v1h-\d+z/g, '')).toBe(''); // no sobra nada raro
  });
});
