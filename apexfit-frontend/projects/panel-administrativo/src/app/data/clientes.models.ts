export interface RegistroPeso {
  id: number;
  fecha: string; // 'yyyy-MM-dd'
  peso: number; // kg
  imc: number | null;
}

/** Un cliente asignado al entrenador, con lo que se muestra en "Mis clientes". */
export interface ClienteAsignado {
  idCliente: number;
  nombre: string;
  correo: string;
  iniciales: string;
  /** Nombre de su rutina activa; null si no tiene. */
  rutinaActiva: string | null;
  /** Del más reciente al más antiguo. */
  registros: RegistroPeso[];
}
