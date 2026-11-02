import qrcode from 'qrcode-generator';

export interface QrDibujo {
  /** Cantidad de módulos por lado. */
  lado: number;
  /** Camino SVG con todos los módulos oscuros (cada módulo mide 1 × 1). */
  ruta: string;
}

/**
 * Formato que entiende el backend (POST /asistencias/escanear-qr).
 * OJO: no está firmado ni caduca, así que cualquiera que sepa el id de otra persona puede armarlo.
 */
export function textoQr(idUsuario: number, correo: string): string {
  return `APEXFIT-USER-${idUsuario}-${correo}`;
}

/** Matriz del QR: true = módulo oscuro. Corrección de errores "M" (≈15 %). */
export function modulosQr(texto: string): boolean[][] {
  const qr = qrcode(0, 'M');
  qr.addData(texto);
  qr.make();
  const n = qr.getModuleCount();
  return Array.from({ length: n }, (_, fila) => Array.from({ length: n }, (_, col) => qr.isDark(fila, col)));
}

/** Convierte el QR en un camino SVG (se dibuja sin HTML, para no saltarse el sanitizador de Angular). */
export function dibujarQr(texto: string): QrDibujo {
  const modulos = modulosQr(texto);
  const partes: string[] = [];
  modulos.forEach((fila, y) => {
    let x = 0;
    while (x < fila.length) {
      if (!fila[x]) {
        x++;
        continue;
      }
      let largo = 0;
      while (x + largo < fila.length && fila[x + largo]) largo++;
      partes.push(`M${x} ${y}h${largo}v1h-${largo}z`);
      x += largo;
    }
  });
  return { lado: modulos.length, ruta: partes.join('') };
}
