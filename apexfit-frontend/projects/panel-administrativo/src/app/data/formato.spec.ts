import { diasEntre, dinero, fechaCompleta, fechaCorta, horaActual, horaCorta, hoyIso, numero, sumarDias } from './formato';

describe('formato (panel)', () => {
  it('hoyIso usa la fecha local', () => {
    expect(hoyIso(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });

  it('sumarDias cruza meses y años y no se afecta por el cambio de hora', () => {
    expect(sumarDias('2026-10-13', 30)).toBe('2026-11-12');
    expect(sumarDias('2026-12-20', 30)).toBe('2027-01-19');
    expect(sumarDias('2026-03-07', 2)).toBe('2026-03-09');
    expect(sumarDias('2026-10-13', -13)).toBe('2026-09-30');
    expect(sumarDias('2024-02-28', 2)).toBe('2024-03-01'); // año bisiesto
  });

  it('diasEntre cuenta días de calendario', () => {
    expect(diasEntre('2026-10-13', '2026-10-20')).toBe(7);
    expect(diasEntre('2026-10-13', '2026-10-13')).toBe(0);
    expect(diasEntre('2026-10-13', '2026-10-10')).toBe(-3);
  });

  it('fechaCompleta', () => {
    expect(fechaCompleta('2026-10-12')).toBe('12/10/2026');
  });

  it('dinero da formato de pesos colombianos sin decimales', () => {
    const texto = dinero(90000).replace(/\s/g, ' ');
    expect(texto).toBe('$ 90.000');
    expect(dinero(1234567).replace(/\s/g, ' ')).toBe('$ 1.234.567');
  });

  it('numero usa coma decimal y no deja ceros sobrantes', () => {
    expect(numero(74.6, 2)).toBe('74,6');
    expect(numero(75, 2)).toBe('75');
    expect(numero(24.08, 1)).toBe('24,1');
  });

  it('fechaCorta', () => {
    expect(fechaCorta('2026-10-12')).toBe('12/10');
  });

  it('horaActual da HH:mm:ss con ceros a la izquierda', () => {
    expect(horaActual(new Date(2026, 9, 13, 7, 5, 9))).toBe('07:05:09');
    expect(horaActual(new Date(2026, 9, 13, 18, 30, 0))).toBe('18:30:00');
  });

  it('horaCorta quita los segundos', () => {
    expect(horaCorta('07:42:10')).toBe('07:42');
    expect(horaCorta('07:42')).toBe('07:42');
  });
});
