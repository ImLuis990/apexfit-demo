import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { guardarSesion, proveedoresBase } from '../testing';
import { MembresiasService } from './membresias.service';
import { iniciales, primerNombre } from './perfil';
import { PerfilService } from './perfil.service';

describe('perfil', () => {
  it('iniciales', () => {
    expect(iniciales('Carlos', 'Pérez')).toBe('CP');
    expect(iniciales('carlos', '')).toBe('CA');
    expect(iniciales('', '')).toBe('');
  });

  it('primerNombre', () => {
    expect(primerNombre('Carlos Andrés')).toBe('Carlos');
    expect(primerNombre('  Ana ')).toBe('Ana');
    expect(primerNombre('')).toBe('');
  });
});

describe('PerfilService', () => {
  it('pide /usuarios/perfil y devuelve solo lo que usa la app', () => {
    TestBed.configureTestingModule({ providers: [provideRouter([]), ...proveedoresBase] });
    const http = TestBed.inject(HttpTestingController);
    let perfil: unknown;
    TestBed.inject(PerfilService).perfil().subscribe((p) => (perfil = p));

    http.expectOne('/api/v1/usuarios/perfil').flush({
      idUsuario: 5, nombre: 'Carlos', apellido: 'Pérez', correo: 'c@apexfit.test',
      idRol: 1, telefono: null, fechaNacimiento: null, estado: 'activo',
    });

    expect(perfil).toEqual({ id: 5, nombre: 'Carlos', apellido: 'Pérez', correo: 'c@apexfit.test' });
  });
});

describe('MembresiasService', () => {
  function preparar(conSesion: boolean) {
    localStorage.clear();
    if (conSesion) guardarSesion('cliente'); // id = 1
    TestBed.configureTestingModule({ providers: [provideRouter([]), ...proveedoresBase] });
    return { servicio: TestBed.inject(MembresiasService), http: TestBed.inject(HttpTestingController) };
  }

  it('pide las membresías del usuario y devuelve el estado calculado', () => {
    const { servicio, http } = preparar(true);
    let estado: unknown;
    servicio.estado().subscribe((e) => (estado = e));

    http.expectOne('/api/v1/membresias/usuario/1').flush([
      { idMembresia: 1, idUsuario: 1, tipo: 'anual', fechaInicio: '2026-01-01', fechaFin: '2999-12-31', precio: 800000, estado: 'activa' },
    ]);

    expect(estado).toMatchObject({ tipo: 'activa', plan: 'Anual', porVencer: false });
  });

  it('sin sesión no llama al backend', () => {
    const { servicio, http } = preparar(false);
    let estado: unknown;
    servicio.estado().subscribe((e) => (estado = e));
    http.verify();
    expect(estado).toEqual({ tipo: 'sin-membresia' });
  });
});
