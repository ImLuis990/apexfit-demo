import { diasEntre, fechaCompleta, fechaCorta, hoyIso, numero } from './formato';

describe('formato', () => {
  it('numero usa coma decimal y no deja ceros sobrantes', () => {
    expect(numero(74.6, 2)).toBe('74,6');
    expect(numero(75, 2)).toBe('75');
    expect(numero(24.08, 1)).toBe('24,1');
  });

  it('fechas cortas y completas', () => {
    expect(fechaCorta('2026-10-12')).toBe('12/10');
    expect(fechaCompleta('2026-10-12')).toBe('12/10/2026');
  });

  it('hoyIso usa la fecha local', () => {
    expect(hoyIso(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });

  it('diasEntre cuenta días de calendario, también entre meses y al revés', () => {
    expect(diasEntre('2026-10-13', '2026-10-20')).toBe(7);
    expect(diasEntre('2026-10-30', '2026-11-02')).toBe(3);
    expect(diasEntre('2026-10-13', '2026-10-13')).toBe(0);
    expect(diasEntre('2026-10-13', '2026-10-10')).toBe(-3);
  });

  it('diasEntre no se afecta por el cambio de hora (DST)', () => {
    expect(diasEntre('2026-03-07', '2026-03-09')).toBe(2);
    expect(diasEntre('2026-10-31', '2026-11-02')).toBe(2);
  });
});
