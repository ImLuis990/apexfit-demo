import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { proveedoresPanel } from '../testing';
import { UsuarioDto } from './dtos';
import { aUsuario } from './usuarios.mapper';
import { UsuariosService } from './usuarios.service';

const dto = (id: number, apellido: string, over: Partial<UsuarioDto> = {}): UsuarioDto => ({
  idUsuario: id, nombre: 'Nombre', apellido, correo: `u${id}@apexfit.test`, idRol: 1,
  telefono: null, fechaNacimiento: null, estado: 'activo', ...over,
});

function preparar() {
  TestBed.configureTestingModule({ providers: [provideRouter([]), ...proveedoresPanel()] });
  return { servicio: TestBed.inject(UsuariosService), http: TestBed.inject(HttpTestingController) };
}

describe('UsuariosService', () => {
  it('listar: pide hasta 200, ordena por apellido y devuelve el total', () => {
    const { servicio, http } = preparar();
    let resultado: { usuarios: { apellido: string }[]; total: number } | undefined;
    servicio.listar().subscribe((r) => (resultado = r));

    const req = http.expectOne((r) => r.url === '/api/v1/usuarios');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('size')).toBe('200');
    req.flush({ content: [dto(1, 'Zapata'), dto(2, 'Álvarez')], totalElements: 350 });

    expect(resultado?.usuarios.map((u) => u.apellido)).toEqual(['Álvarez', 'Zapata']);
    expect(resultado?.total).toBe(350);
  });

  it('crear: POST con el cuerpo esperado', () => {
    const { servicio, http } = preparar();
    let creado: { id: number } | undefined;
    servicio.crear({ nombre: 'Ana', apellido: 'Ruiz', correo: 'ana@apexfit.test', telefono: null, rol: 'entrenador' }).subscribe((u) => (creado = u));

    const req = http.expectOne('/api/v1/usuarios');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      nombre: 'Ana', apellido: 'Ruiz', correo: 'ana@apexfit.test', telefono: null,
      idRol: 2, fechaNacimiento: null, estado: 'activo',
    });
    req.flush(dto(9, 'Ruiz', { nombre: 'Ana', idRol: 2 }));
    expect(creado?.id).toBe(9);
  });

  it('actualizar: PUT a /usuarios/{id} conservando fecha de nacimiento y estado', () => {
    const { servicio, http } = preparar();
    const original = aUsuario(dto(4, 'Pérez', { fechaNacimiento: '1990-01-01', estado: 'inactivo' }));
    servicio.actualizar(original, { nombre: 'Nuevo', apellido: 'Pérez', correo: 'u4@apexfit.test', telefono: '3001112222', rol: 'cliente' }).subscribe();

    const req = http.expectOne('/api/v1/usuarios/4');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toMatchObject({ idUsuario: 4, nombre: 'Nuevo', fechaNacimiento: '1990-01-01', estado: 'inactivo', telefono: '3001112222' });
    req.flush(dto(4, 'Pérez'));
  });

  it('desactivar: DELETE a /usuarios/{id}', () => {
    const { servicio, http } = preparar();
    let listo = false;
    servicio.desactivar(5).subscribe(() => (listo = true));

    const req = http.expectOne('/api/v1/usuarios/5');
    expect(req.request.method).toBe('DELETE');
    req.flush(null, { status: 204, statusText: 'No Content' });
    expect(listo).toBe(true);
  });

  it('activar: PUT con estado activo y el resto igual', () => {
    const { servicio, http } = preparar();
    servicio.activar(aUsuario(dto(6, 'Gómez', { estado: 'inactivo' }))).subscribe();

    const req = http.expectOne('/api/v1/usuarios/6');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toMatchObject({ idUsuario: 6, estado: 'activo', apellido: 'Gómez' });
    req.flush(dto(6, 'Gómez'));
  });
});
