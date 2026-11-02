/** Fecha de hoy como 'yyyy-MM-dd' en hora LOCAL (toISOString usaría UTC). */
export function hoyIso(fecha: Date = new Date()): string {
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

/** Suma (o resta) días a una fecha 'yyyy-MM-dd'. Usa UTC para que el cambio de hora no la mueva. */
export function sumarDias(iso: string, dias: number): string {
  const [a, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, d + dias)).toISOString().slice(0, 10);
}

/** Días de calendario entre dos fechas 'yyyy-MM-dd' (negativo si `hasta` es anterior). */
export function diasEntre(desde: string, hasta: string): number {
  const [a1, m1, d1] = desde.split('-').map(Number);
  const [a2, m2, d2] = hasta.split('-').map(Number);
  return Math.round((Date.UTC(a2, m2 - 1, d2) - Date.UTC(a1, m1 - 1, d1)) / 86_400_000);
}

/** '2026-10-12' → '12/10/2026' */
export function fechaCompleta(iso: string): string {
  const [anio, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${anio}`;
}

const pesos = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

/** 90000 → '$ 90.000' */
export function dinero(valor: number): string {
  return pesos.format(valor);
}

const formatos = new Map<number, Intl.NumberFormat>();

/** 74.6 → "74,6"; 75 → "75" (coma decimal, sin ceros sobrantes). */
export function numero(valor: number, maxDecimales: number): string {
  let formato = formatos.get(maxDecimales);
  if (!formato) {
    formato = new Intl.NumberFormat('es', { maximumFractionDigits: maxDecimales });
    formatos.set(maxDecimales, formato);
  }
  return formato.format(valor);
}

/** '2026-10-12' → '12/10' */
export function fechaCorta(iso: string): string {
  const [, mes, dia] = iso.split('-');
  return `${dia}/${mes}`;
}

/** Hora actual como 'HH:mm:ss' (hora local), el formato que espera el backend. */
export function horaActual(fecha: Date = new Date()): string {
  const dos = (n: number) => String(n).padStart(2, '0');
  return `${dos(fecha.getHours())}:${dos(fecha.getMinutes())}:${dos(fecha.getSeconds())}`;
}

/** '07:42:10' → '07:42' */
export function horaCorta(hora: string): string {
  return hora.slice(0, 5);
}
