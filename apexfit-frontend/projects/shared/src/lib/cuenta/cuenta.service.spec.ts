import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_URL } from '../auth/auth.tokens';
import { CuentaService } from './cuenta.service';

function preparar() {
  TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting(), { provide: API_URL, useValue: '/api/v1' }],
  });
  return { servicio: TestBed.inject(CuentaService), http: TestBed.inject(HttpTestingController) };
}

describe('CuentaService', () => {
  it('perfil: pide /usuarios/perfil y devuelve solo lo que usa la pantalla', () => {
    const { servicio, http } = preparar();
    let perfil: unknown;
    servicio.perfil().subscribe((p) => (perfil = p));

    http.expectOne('/api/v1/usuarios/perfil').flush({
      idUsuario: 5, nombre: 'Carlos', apellido: 'Pérez', correo: 'c@apexfit.test', idRol: 1,
      telefono: '3001234567', fechaNacimiento: '1999-05-20', estado: 'activo',
    });

    expect(perfil).toEqual({
      id: 5, nombre: 'Carlos', apellido: 'Pérez', correo: 'c@apexfit.test',
      telefono: '3001234567', fechaNacimiento: '1999-05-20',
    });
  });

  it('perfil: teléfono y fecha ausentes quedan en null', () => {
    const { servicio, http } = preparar();
    let perfil: { telefono: unknown; fechaNacimiento: unknown } | undefined;
    servicio.perfil().subscribe((p) => (perfil = p));
    http.expectOne('/api/v1/usuarios/perfil').flush({ idUsuario: 1, nombre: 'A', apellido: 'B', correo: 'a@b.c' });
    expect(perfil).toMatchObject({ telefono: null, fechaNacimiento: null });
  });

  it('cambiarContrasena: hace PUT con los dos campos que espera el backend', () => {
    const { servicio, http } = preparar();
    let terminado = false;
    servicio.cambiarContrasena('vieja123', 'nueva456').subscribe(() => (terminado = true));

    const req = http.expectOne('/api/v1/usuarios/cambiar-password');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ contrasenaActual: 'vieja123', nuevaContrasena: 'nueva456' });
    req.flush({ mensaje: 'ok' });

    expect(terminado).toBe(true);
  });
});
