import { Rol } from 'shared';
import { UsuarioDto } from './dtos';
import { DatosUsuario, ETIQUETA_ROL, Filtros, ID_ROL, Usuario } from './usuarios.models';

const ROL_POR_ID = new Map<number, Rol>(
  (Object.entries(ID_ROL) as [Rol, number][]).map(([rol, id]) => [id, rol]),
);

const sinTildes = (t: string) => t.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();

export function aUsuario(dto: UsuarioDto): Usuario {
  const rol = ROL_POR_ID.get(dto.idRol) ?? null;
  const estado = dto.estado ?? 'activo';
  return {
    id: dto.idUsuario ?? 0,
    nombre: dto.nombre,
    apellido: dto.apellido,
    nombreCompleto: `${dto.nombre} ${dto.apellido}`.trim(),
    correo: dto.correo,
    telefono: dto.telefono ?? null,
    fechaNacimiento: dto.fechaNacimiento ?? null,
    idRol: dto.idRol,
    rol,
    rolEtiqueta: rol ? ETIQUETA_ROL[rol] : '—',
    estado,
    activo: estado.toLowerCase() === 'activo',
  };
}

/** Cuerpo del POST: un usuario nuevo (el backend lo crea activo). */
export function aDtoNuevo(d: DatosUsuario): UsuarioDto {
  return {
    nombre: d.nombre.trim(),
    apellido: d.apellido.trim(),
    correo: d.correo.trim(),
    telefono: d.telefono?.trim() ? d.telefono.trim() : null,
    idRol: ID_ROL[d.rol],
    fechaNacimiento: null,
    estado: 'activo',
  };
}

/**
 * Cuerpo del PUT al editar. El PUT reemplaza todos los campos, así que se conservan los que
 * el formulario no muestra (fecha de nacimiento y estado) para no borrarlos.
 */
export function aDtoEdicion(original: Usuario, d: DatosUsuario): UsuarioDto {
  return {
    ...aDtoNuevo(d),
    idUsuario: original.id,
    fechaNacimiento: original.fechaNacimiento,
    estado: original.estado,
  };
}

/** Cuerpo del PUT para reactivar (o cambiar el estado) sin tocar nada más. */
export function aDtoEstado(original: Usuario, estado: 'activo' | 'inactivo'): UsuarioDto {
  return {
    idUsuario: original.id,
    nombre: original.nombre,
    apellido: original.apellido,
    correo: original.correo,
    telefono: original.telefono,
    idRol: original.idRol,
    fechaNacimiento: original.fechaNacimiento,
    estado,
  };
}

/** Por apellido y luego nombre, en orden alfabético del español. */
export function ordenar(usuarios: Usuario[]): Usuario[] {
  return [...usuarios].sort(
    (a, b) => a.apellido.localeCompare(b.apellido, 'es') || a.nombre.localeCompare(b.nombre, 'es'),
  );
}

export function filtrar(usuarios: Usuario[], f: Filtros): Usuario[] {
  const texto = sinTildes(f.texto);
  return usuarios.filter((u) => {
    if (f.rol !== 'todos' && u.rol !== f.rol) return false;
    if (f.estado !== 'todos' && u.estado.toLowerCase() !== f.estado) return false;
    if (!texto) return true;
    return sinTildes(`${u.nombre} ${u.apellido} ${u.correo}`).includes(texto);
  });
}
