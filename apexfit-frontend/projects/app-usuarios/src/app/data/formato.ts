const formatos = new Map<number, Intl.NumberFormat>();

/** 74.6 → "74,6"; 1.76 → "1,76"; 75 → "75" (sin ceros sobrantes). */
export function numero(valor: number, maxDecimales: number): string {
  let formato = formatos.get(maxDecimales);
  if (!formato) {
    formato = new Intl.NumberFormat('es', { maximumFractionDigits: maxDecimales });
    formatos.set(maxDecimales, formato);
  }
  return formato.format(valor);
}

/** Fecha de hoy como 'yyyy-MM-dd' en hora LOCAL (toISOString usaría UTC y puede dar el día siguiente). */
export function hoyIso(fecha: Date = new Date()): string {
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

/** '2026-10-12' → '12/10' */
export function fechaCorta(iso: string): string {
  const [, mes, dia] = iso.split('-');
  return `${dia}/${mes}`;
}

/** '2026-10-12' → '12/10/2026' */
export function fechaCompleta(iso: string): string {
  const [anio, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${anio}`;
}

/** Días de calendario entre dos fechas 'yyyy-MM-dd' (negativo si `hasta` es anterior). */
export function diasEntre(desde: string, hasta: string): number {
  const [a1, m1, d1] = desde.split('-').map(Number);
  const [a2, m2, d2] = hasta.split('-').map(Number);
  // Date.UTC evita errores por cambio de hora (DST).
  return Math.round((Date.UTC(a2, m2 - 1, d2) - Date.UTC(a1, m1 - 1, d1)) / 86_400_000);
}
