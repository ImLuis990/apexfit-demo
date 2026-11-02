import { EjercicioDto, RutinaDto, RutinaEjercicioDto } from './dtos';
import { armarRutina, elegirActiva } from './rutinas.mapper';
import { diaDeHoy } from './rutinas.models';

const rutina = (id: number, estado: string, fechaCreacion: string | null): RutinaDto => ({
  idRutina: id, nombre: `Rutina ${id}`, descripcion: null,
  idEntrenador: 2, idCliente: 1, fechaCreacion, estado,
});

const item = (
  id: number, idEjercicio: number, diaSemana: string | null, series = 3, repeticiones = 10,
  descansoSeg: number | null = 60,
): RutinaEjercicioDto => ({
  idRutinaEjercicio: id, idRutina: 1, idEjercicio, diaSemana, series, repeticiones, descansoSeg,
});

const ejercicio = (id: number, nombre: string, grupoMuscular: string | null): EjercicioDto => ({
  idEjercicio: id, nombre, grupoMuscular, videoUrl: null, nivelDificultad: null,
});

describe('elegirActiva', () => {
  it('ignora las inactivas', () => {
    expect(elegirActiva([rutina(1, 'inactiva', '2026-01-01T00:00:00')])).toBeNull();
    expect(elegirActiva([])).toBeNull();
  });

  it('devuelve la activa', () => {
    const r = elegirActiva([rutina(1, 'inactiva', '2026-01-01T00:00:00'), rutina(2, 'activa', '2026-02-01T00:00:00')]);
    expect(r?.idRutina).toBe(2);
  });

  it('si hubiera varias activas, toma la más reciente', () => {
    const r = elegirActiva([rutina(1, 'activa', '2026-01-01T00:00:00'), rutina(2, 'ACTIVA', '2026-03-01T00:00:00')]);
    expect(r?.idRutina).toBe(2);
  });
});

describe('armarRutina', () => {
  const catalogo = new Map([
    [4, ejercicio(4, 'Sentadilla', 'piernas')],
    [5, ejercicio(5, 'Peso muerto', 'piernas')],
    [6, ejercicio(6, 'Press banca', 'pecho')],
  ]);

  it('agrupa por día y respeta el orden de la semana', () => {
    const r = armarRutina(rutina(1, 'activa', null), [
      item(3, 6, 'viernes'), item(1, 4, 'lunes'), item(2, 5, 'lunes'),
    ], catalogo);

    expect(r.dias.map((d) => d.etiqueta)).toEqual(['Lunes', 'Viernes']);
    expect(r.dias[0].ejercicios.map((e) => e.nombre)).toEqual(['Sentadilla', 'Peso muerto']);
    expect(r.dias[0].abreviatura).toBe('LUN');
  });

  it('entiende los días con o sin tildes y en cualquier mayúscula', () => {
    const r = armarRutina(rutina(1, 'activa', null), [
      item(1, 4, 'Miércoles'), item(2, 5, 'sabado'),
    ], catalogo);
    expect(r.dias.map((d) => d.dia)).toEqual(['miercoles', 'sabado']);
    expect(r.dias.map((d) => d.etiqueta)).toEqual(['Miércoles', 'Sábado']);
  });

  it('los ejercicios sin día quedan al final como "Sin día asignado"', () => {
    const r = armarRutina(rutina(1, 'activa', null), [item(1, 4, null), item(2, 5, 'martes')], catalogo);
    expect(r.dias.map((d) => d.etiqueta)).toEqual(['Martes', 'Sin día asignado']);
    expect(r.dias[1].dia).toBeNull();
  });

  it('calcula los grupos musculares distintos del día, con inicial mayúscula', () => {
    const r = armarRutina(rutina(1, 'activa', null), [
      item(1, 4, 'lunes'), item(2, 5, 'lunes'), item(3, 6, 'lunes'),
    ], catalogo);
    expect(r.dias[0].grupos).toEqual(['Piernas', 'Pecho']);
  });

  it('si falta un ejercicio en el catálogo, usa un nombre de respaldo', () => {
    const r = armarRutina(rutina(1, 'activa', null), [item(1, 99, 'lunes')], catalogo);
    expect(r.dias[0].ejercicios[0].nombre).toBe('Ejercicio #99');
    expect(r.dias[0].grupos).toEqual([]);
  });

  it('copia series, repeticiones y descanso; sin ejercicios no hay días', () => {
    const r = armarRutina(rutina(1, 'activa', null), [item(1, 4, 'lunes', 4, 12, null)], catalogo);
    expect(r.dias[0].ejercicios[0]).toMatchObject({ series: 4, repeticiones: 12, descansoSeg: null });
    expect(armarRutina(rutina(1, 'activa', null), [], catalogo).dias).toEqual([]);
  });
});

describe('diaDeHoy', () => {
  it('convierte la fecha al día de la semana', () => {
    expect(diaDeHoy(new Date(2026, 9, 12))).toBe('lunes'); // 12 oct 2026
    expect(diaDeHoy(new Date(2026, 9, 18))).toBe('domingo');
  });
});
