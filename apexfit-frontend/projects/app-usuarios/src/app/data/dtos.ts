/*
 * Formas EXACTAS que envía el backend hoy. Solo las usan los servicios de esta carpeta:
 * las pantallas trabajan con los modelos propios (rutinas.models.ts), así que si el
 * backend cambia, se ajusta aquí y en el mapper, y las pantallas no se enteran.
 */

export interface Page<T> {
  content: T[];
  totalElements: number;
}

export interface RutinaDto {
  idRutina: number;
  nombre: string;
  descripcion: string | null;
  idEntrenador: number;
  idCliente: number;
  fechaCreacion: string | null;
  estado: string; // 'activa' | 'inactiva'
}

export interface RutinaEjercicioDto {
  idRutinaEjercicio: number;
  idRutina: number;
  idEjercicio: number;
  diaSemana: string | null; // 'lunes' … 'domingo' (sin tildes)
  series: number;
  repeticiones: number;
  descansoSeg: number | null;
}

export interface EjercicioDto {
  idEjercicio: number;
  nombre: string;
  grupoMuscular: string | null;
  videoUrl: string | null;
  nivelDificultad: string | null;
}

export interface ProgresoMedidaDto {
  idMedida?: number;
  idProgreso?: number;
  tipoMedida: string; // 'cintura', 'biceps', 'pecho'…
  valorCm: number;
}

export interface ProgresoDto {
  idProgreso?: number;
  idUsuario: number;
  fecha: string; // 'yyyy-MM-dd'
  peso: number; // kg
  altura: number | null; // metros
  imc: number | null;
  observaciones: string | null;
  medidas: ProgresoMedidaDto[] | null;
}

export interface UsuarioDto {
  idUsuario: number;
  nombre: string;
  apellido: string;
  correo: string;
  idRol: number;
  telefono: string | null;
  fechaNacimiento: string | null;
  estado: string;
}

export interface MembresiaDto {
  idMembresia: number;
  idUsuario: number;
  tipo: string; // texto libre: 'Mensual', 'Trimestral'…
  fechaInicio: string; // 'yyyy-MM-dd'
  fechaFin: string; // 'yyyy-MM-dd'
  precio: number;
  estado: string; // 'activa' | 'vencida' | 'cancelada'
}
