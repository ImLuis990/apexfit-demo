import { Ejercicio, EjercicioCompletoDto, FormEjercicio } from './ejercicios.models';

export const aEjercicio = (d: EjercicioCompletoDto): Ejercicio => ({
  id: d.idEjercicio ?? 0,
  nombre: d.nombre,
  grupoMuscular: d.grupoMuscular || null,
  videoUrl: d.videoUrl || null,
  nivel: d.nivelDificultad || null,
});

/** Texto vacío del formulario = sin dato (null) en el backend. */
export const aDto = (f: FormEjercicio): EjercicioCompletoDto => ({
  nombre: f.nombre.trim(),
  grupoMuscular: f.grupoMuscular.trim() || null,
  videoUrl: f.videoUrl.trim() || null,
  nivelDificultad: f.nivel || null,
});

export const porNombre = (a: Ejercicio, b: Ejercicio) => a.nombre.localeCompare(b.nombre, 'es');

export const gruposDe = (lista: Ejercicio[]): string[] =>
  [...new Set(lista.map((e) => e.grupoMuscular).filter((g): g is string => !!g))].sort((a, b) => a.localeCompare(b, 'es'));

export function filtrar(lista: Ejercicio[], texto: string, grupo: string, nivel: string): Ejercicio[] {
  const t = texto.trim().toLowerCase();
  return lista.filter(
    (e) => (!t || e.nombre.toLowerCase().includes(t)) && (!grupo || e.grupoMuscular === grupo) && (!nivel || e.nivel === nivel),
  );
}
