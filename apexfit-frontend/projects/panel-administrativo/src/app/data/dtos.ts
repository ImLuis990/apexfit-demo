/** Formas EXACTAS que envía el backend. Solo las usan los servicios de esta carpeta. */

export interface Page<T> {
  content: T[];
  totalElements: number;
}

export interface UsuarioDto {
  idUsuario?: number; // no se envía al crear
  nombre: string;
  apellido: string;
  correo: string;
  idRol: number;
  telefono: string | null;
  fechaNacimiento: string | null;
  estado: string | null; // 'activo' | 'inactivo'
}

export interface MembresiaDto {
  idMembresia?: number;
  idUsuario: number;
  tipo: string;
  fechaInicio: string; // 'yyyy-MM-dd'
  fechaFin: string; // 'yyyy-MM-dd'
  precio: number;
  estado?: string; // 'activa' | 'vencida' | 'cancelada'
}

export interface EntrenadorClienteDto {
  idAsignacion?: number;
  idEntrenador: number;
  idCliente: number;
  fechaAsignacion?: string;
  estado?: string;
}

export interface RutinaDto {
  idRutina?: number;
  nombre: string;
  descripcion: string | null;
  idEntrenador: number;
  idCliente: number;
  fechaCreacion?: string | null;
  estado?: string; // 'activa' | 'inactiva'
}

export interface RutinaEjercicioDto {
  idRutinaEjercicio?: number;
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
}

export interface ProgresoDto {
  idProgreso?: number;
  fecha: string;
  peso: number;
  imc: number | null;
}

export interface AsistenciaDto {
  idAsistencia?: number;
  idUsuario: number;
  fecha: string; // 'yyyy-MM-dd'
  horaEntrada: string; // 'HH:mm:ss'
  horaSalida?: string | null;
  metodoRegistro: string; // 'qr' | 'manual'
}

export interface DashboardResumenDto {
  totalUsuarios: number;
  totalClientesActivos: number; // OJO: el backend cuenta TODOS los usuarios activos, no solo clientes
  totalEntrenadores: number;
  totalAsistenciasHoy: number;
  totalMembresiasActivas: number; // OJO: cuenta estado = 'activa' sin mirar la fecha de fin
  totalEjercicios: number;
  totalRutinas: number;
  asistenciasPorMetodo: Record<string, number>;
}
