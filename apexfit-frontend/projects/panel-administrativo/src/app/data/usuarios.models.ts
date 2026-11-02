import { Rol } from 'shared';

/**
 * El backend no expone un endpoint de roles ni el nombre del rol en el usuario: solo el id.
 * Estos ids salen del script de la base (V1: cliente, entrenador, administrador).
 * Si algún día cambian, se ajusta aquí.
 */
export const ID_ROL: Record<Rol, number> = { cliente: 1, entrenador: 2, administrador: 3 };

export const ETIQUETA_ROL: Record<Rol, string> = {
  cliente: 'Cliente',
  entrenador: 'Entrenador',
  administrador: 'Administrador',
};

/**
 * Contraseña con la que el backend crea a TODOS los usuarios que registra un administrador
 * (UsuarioService.createUsuario). Se muestra al crear para que el administrador pueda
 * entregarla. Cuando el backend genere una temporal o reciba la contraseña, se quita.
 */
export const CONTRASENA_INICIAL = '123456';

export interface Usuario {
  id: number;
  nombre: string;
  apellido: string;
  nombreCompleto: string;
  correo: string;
  telefono: string | null;
  fechaNacimiento: string | null;
  idRol: number;
  /** null si el backend envía un id de rol que no conocemos. */
  rol: Rol | null;
  rolEtiqueta: string;
  estado: string;
  activo: boolean;
}

/** Lo que el administrador escribe en el formulario. */
export interface DatosUsuario {
  nombre: string;
  apellido: string;
  correo: string;
  telefono: string | null;
  rol: Rol;
}

export interface Filtros {
  texto: string;
  rol: string; // 'todos' | Rol
  estado: string; // 'todos' | 'activo' | 'inactivo'
}
