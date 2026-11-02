export interface Asistencia {
  id: number;
  idUsuario: number;
  fecha: string; // 'yyyy-MM-dd'
  horaEntrada: string; // 'HH:mm:ss' (tal como lo guarda el backend)
  horaSalida: string | null;
  metodo: string; // 'qr' | 'manual'
}

/** Lo que se lee de un código escaneado o escrito. */
export type CodigoLeido = { tipo: 'id'; id: number } | { tipo: 'correo'; correo: string };
