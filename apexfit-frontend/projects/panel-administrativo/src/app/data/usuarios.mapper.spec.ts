import { UsuarioDto } from './dtos';
import { aDtoEdicion, aDtoEstado, aDtoNuevo, aUsuario, filtrar, ordenar } from './usuarios.mapper';

const dto = (over: Partial<UsuarioDto> = {}): UsuarioDto => ({
  idUsuario: 1, nombre: 'Carlos', apellido: 'Pérez', correo: 'carlos@apexfit.test', idRol: 1,
  telefono: '3001234567', fechaNacimiento: '1995-05-20', estado: 'activo', ...over,
});

describe('aUsuario', () => {
  it('traduce el id del rol a su nombre y arma el nombre completo', () => {
    const u = aUsuario(dto({ idRol: 2 }));
    expect(u).toMatchObject({ id: 1, nombreCompleto: 'Carlos Pérez', rol: 'entrenador', rolEtiqueta: 'Entrenador', activo: true });
    expect(aUsuario(dto({ idRol: 3 })).rol).toBe('administrador');
    expect(aUsuario(dto({ idRol: 1 })).rolEtiqueta).toBe('Cliente');
  });

  it('un id de rol desconocido no rompe: rol null y etiqueta con raya', () => {
    const u = aUsuario(dto({ idRol: 99 }));
    expect(u.rol).toBeNull();
    expect(u.rolEtiqueta).toBe('—');
  });

  it('estado inactivo, sin estado (se asume activo) y teléfono vacío', () => {
    expect(aUsuario(dto({ estado: 'inactivo' })).activo).toBe(false);
    expect(aUsuario(dto({ estado: null })).activo).toBe(true);
    expect(aUsuario(dto({ telefono: null })).telefono).toBeNull();
  });
});

describe('cuerpos de las peticiones', () => {
  const datos = { nombre: '  Ana ', apellido: ' Ruiz', correo: ' ana@apexfit.test ', telefono: '  ', rol: 'entrenador' as const };

  it('aDtoNuevo limpia espacios, manda el id del rol y crea activo', () => {
    expect(aDtoNuevo(datos)).toEqual({
      nombre: 'Ana', apellido: 'Ruiz', correo: 'ana@apexfit.test', telefono: null,
      idRol: 2, fechaNacimiento: null, estado: 'activo',
    });
  });

  it('aDtoEdicion conserva lo que el formulario no muestra (fecha de nacimiento y estado)', () => {
    const original = aUsuario(dto({ idUsuario: 7, estado: 'inactivo' }));
    const body = aDtoEdicion(original, { ...datos, telefono: '3109998888' });
    expect(body).toMatchObject({ idUsuario: 7, fechaNacimiento: '1995-05-20', estado: 'inactivo', telefono: '3109998888', idRol: 2 });
  });

  it('aDtoEstado solo cambia el estado', () => {
    const original = aUsuario(dto({ estado: 'inactivo' }));
    expect(aDtoEstado(original, 'activo')).toEqual({
      idUsuario: 1, nombre: 'Carlos', apellido: 'Pérez', correo: 'carlos@apexfit.test',
      telefono: '3001234567', idRol: 1, fechaNacimiento: '1995-05-20', estado: 'activo',
    });
  });
});

describe('ordenar y filtrar', () => {
  const lista = [
    aUsuario(dto({ idUsuario: 1, nombre: 'Carlos', apellido: 'Zapata', idRol: 1 })),
    aUsuario(dto({ idUsuario: 2, nombre: 'María', apellido: 'Álvarez', correo: 'maria@x.co', idRol: 2 })),
    aUsuario(dto({ idUsuario: 3, nombre: 'Pedro', apellido: 'Salgado', correo: 'pedro@x.co', idRol: 1, estado: 'inactivo' })),
  ];

  it('ordena por apellido en orden alfabético del español (Á antes que S)', () => {
    expect(ordenar(lista).map((u) => u.apellido)).toEqual(['Álvarez', 'Salgado', 'Zapata']);
  });

  it('busca por nombre o correo sin importar tildes ni mayúsculas', () => {
    const f = (texto: string) => filtrar(lista, { texto, rol: 'todos', estado: 'todos' }).map((u) => u.id);
    expect(f('maria')).toEqual([2]);
    expect(f('ÁLVAREZ')).toEqual([2]);
    expect(f('pedro@x')).toEqual([3]);
    expect(f('')).toEqual([1, 2, 3]);
    expect(f('nadie')).toEqual([]);
  });

  it('filtra por rol y por estado, y combina los filtros', () => {
    expect(filtrar(lista, { texto: '', rol: 'entrenador', estado: 'todos' }).map((u) => u.id)).toEqual([2]);
    expect(filtrar(lista, { texto: '', rol: 'todos', estado: 'inactivo' }).map((u) => u.id)).toEqual([3]);
    expect(filtrar(lista, { texto: '', rol: 'cliente', estado: 'activo' }).map((u) => u.id)).toEqual([1]);
  });
});
