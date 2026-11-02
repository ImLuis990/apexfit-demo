import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { ClienteAsignado } from './clientes.models';
import { ClientesService } from './clientes.service';
import { aUsuario } from './usuarios.mapper';
import { UsuariosService } from './usuarios.service';
import { guardarSesion, proveedoresPanel } from '../testing';

const user = (id: number, nombre: string, apellido: string) =>
  aUsuario({ idUsuario: id, nombre, apellido, correo: `${nombre.toLowerCase()}@apexfit.test`, idRol: 1, telefono: null, fechaNacimiento: null, estado: 'activo' });

function preparar(conSesion = true) {
  localStorage.clear();
  if (conSesion) guardarSesion('entrenador', 'mario@apexfit.test', 2);
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]), ...proveedoresPanel(),
      { provide: UsuariosService, useValue: { listar: () => of({ usuarios: [user(5, 'Carlos', 'Pérez'), user(6, 'Andrea', 'Mejía'), user(7, 'Pedro', 'Salgado')], total: 3 }) } },
    ],
  });
  return { servicio: TestBed.inject(ClientesService), http: TestBed.inject(HttpTestingController) };
}

const asignaciones = [
  { idAsignacion: 1, idEntrenador: 2, idCliente: 5, estado: 'activa' },
  { idAsignacion: 2, idEntrenador: 2, idCliente: 6, estado: 'activa' },
  { idAsignacion: 3, idEntrenador: 2, idCliente: 7, estado: 'inactiva' },
  { idAsignacion: 4, idEntrenador: 2, idCliente: 5, estado: 'activa' }, // repetida
];

describe('ClientesService', () => {
  it('misClientes: junta asignaciones, nombres, rutina activa y progreso (sin repetidos ni inactivos), ordenados por nombre', () => {
    const { servicio, http } = preparar();
    let lista: ClienteAsignado[] = [];
    servicio.misClientes().subscribe((l) => (lista = l));

    http.expectOne('/api/v1/entrenador-cliente/entrenador/2').flush(asignaciones);

    for (const id of [5, 6]) {
      http.expectOne((r) => r.url === `/api/v1/rutinas/cliente/${id}` && r.params.get('size') === '50').flush({
        content: id === 5 ? [{ idRutina: 1, nombre: 'Fuerza semana 1', descripcion: null, idEntrenador: 2, idCliente: 5, estado: 'activa', fechaCreacion: '2026-10-01T00:00:00' }] : [],
        totalElements: 1,
      });
      http.expectOne(`/api/v1/progresos/usuario/${id}`).flush(id === 5 ? [{ idProgreso: 1, fecha: '2026-10-12', peso: 74.6, imc: 24.08 }] : []);
    }
    http.verify();

    expect(lista.map((c) => c.nombre)).toEqual(['Andrea Mejía', 'Carlos Pérez']);
    expect(lista[1]).toMatchObject({ rutinaActiva: 'Fuerza semana 1' });
    expect(lista[1].registros).toHaveLength(1);
    expect(lista[0]).toMatchObject({ rutinaActiva: null, registros: [] });
  });

  it('si falla la rutina o el progreso de un cliente, ese cliente igual aparece', () => {
    const { servicio, http } = preparar();
    let lista: ClienteAsignado[] = [];
    servicio.misClientes().subscribe((l) => (lista = l));

    http.expectOne('/api/v1/entrenador-cliente/entrenador/2').flush([asignaciones[0]]);
    http.expectOne((r) => r.url === '/api/v1/rutinas/cliente/5').flush('x', { status: 500, statusText: 'Error' });
    http.expectOne('/api/v1/progresos/usuario/5').flush('x', { status: 500, statusText: 'Error' });

    expect(lista).toHaveLength(1);
    expect(lista[0]).toMatchObject({ nombre: 'Carlos Pérez', rutinaActiva: null, registros: [] });
  });

  it('sin clientes asignados devuelve una lista vacía y no pide más', () => {
    const { servicio, http } = preparar();
    let lista: ClienteAsignado[] | undefined;
    servicio.misClientes().subscribe((l) => (lista = l));
    http.expectOne('/api/v1/entrenador-cliente/entrenador/2').flush([]);
    http.verify();
    expect(lista).toEqual([]);
  });

  it('si falla la lista de asignaciones, el error llega a la pantalla', () => {
    const { servicio, http } = preparar();
    let fallo = false;
    servicio.misClientes().subscribe({ error: () => (fallo = true) });
    http.expectOne('/api/v1/entrenador-cliente/entrenador/2').flush('x', { status: 500, statusText: 'Error' });
    expect(fallo).toBe(true);
  });

  it('sin sesión devuelve una lista vacía sin llamar al backend', () => {
    const { servicio, http } = preparar(false);
    let lista: unknown;
    servicio.misClientes().subscribe((l) => (lista = l));
    http.verify();
    expect(lista).toEqual([]);
  });

  it('asignados: solo nombres, sin pedir rutinas ni progreso', () => {
    const { servicio, http } = preparar();
    let lista: unknown;
    servicio.asignados().subscribe((l) => (lista = l));
    http.expectOne('/api/v1/entrenador-cliente/entrenador/2').flush(asignaciones);
    http.verify();
    expect(lista).toEqual([
      { idCliente: 6, nombre: 'Andrea Mejía', correo: 'andrea@apexfit.test' },
      { idCliente: 5, nombre: 'Carlos Pérez', correo: 'carlos@apexfit.test' },
    ]);
  });
});
