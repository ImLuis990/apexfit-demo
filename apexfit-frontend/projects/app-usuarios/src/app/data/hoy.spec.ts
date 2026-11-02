import { planDeHoy } from './hoy';
import { DiaRutina, DiaSemana, RutinaActiva } from './rutinas.models';

const dia = (d: DiaSemana | null): DiaRutina => ({
  dia: d, etiqueta: d ?? 'Sin día asignado', abreviatura: 'X', grupos: ['Piernas'],
  ejercicios: [{ id: 1, idEjercicio: 1, nombre: 'Sentadilla', grupoMuscular: 'piernas', series: 4, repeticiones: 10, descansoSeg: 60 }],
});

const rutina = (...dias: (DiaSemana | null)[]): RutinaActiva => ({
  id: 1, nombre: 'Fuerza semana 1', descripcion: null, dias: dias.map(dia),
});

describe('planDeHoy', () => {
  it('sin rutina', () => {
    expect(planDeHoy(null, 'lunes')).toEqual({ tipo: 'sin-rutina' });
  });

  it('si hoy tiene ejercicios, entrena', () => {
    const p = planDeHoy(rutina('lunes', 'miercoles'), 'lunes');
    expect(p.tipo).toBe('entrena');
    if (p.tipo === 'entrena') {
      expect(p.dia.dia).toBe('lunes');
      expect(p.rutina).toBe('Fuerza semana 1');
    }
  });

  it('si hoy no hay ejercicios, descansa y avisa el próximo día', () => {
    const p = planDeHoy(rutina('lunes', 'miercoles', 'viernes'), 'martes');
    expect(p.tipo).toBe('descanso');
    if (p.tipo === 'descanso') expect(p.proximo?.dia).toBe('miercoles');
  });

  it('el próximo día da la vuelta a la semana', () => {
    const p = planDeHoy(rutina('lunes', 'miercoles'), 'sabado');
    expect(p.tipo === 'descanso' && p.proximo?.dia).toBe('lunes');
  });

  it('si solo hay un día y es hoy, entrena; si fue ayer, el próximo es en 6 días (el mismo día)', () => {
    const p = planDeHoy(rutina('martes'), 'miercoles');
    expect(p.tipo === 'descanso' && p.proximo?.dia).toBe('martes');
  });

  it('si el entrenador no asignó días, ofrece el bloque tal cual en vez de "descanso"', () => {
    const p = planDeHoy(rutina(null), 'jueves');
    expect(p.tipo).toBe('entrena');
  });

  it('una rutina sin ningún ejercicio descansa sin próximo día', () => {
    const p = planDeHoy({ id: 1, nombre: 'Vacía', descripcion: null, dias: [] }, 'lunes');
    expect(p).toEqual({ tipo: 'descanso', rutina: 'Vacía', proximo: null });
  });
});
