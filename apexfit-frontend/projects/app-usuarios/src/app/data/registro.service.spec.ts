import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { proveedoresBase } from '../testing';
import { RegistroService } from './registro.service';

describe('RegistroService', () => {
  it('envía los datos a /auth/register y NUNCA el campo "rol"', () => {
    TestBed.configureTestingModule({ providers: [provideRouter([]), ...proveedoresBase] });
    const http = TestBed.inject(HttpTestingController);
    let terminado = false;
    TestBed.inject(RegistroService)
      .registrar({ nombre: 'Laura', apellido: 'Gómez', correo: 'laura@apexfit.test', telefono: null, contrasena: 'secreta1' })
      .subscribe(() => (terminado = true));

    const req = http.expectOne('/api/v1/auth/register');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      nombre: 'Laura', apellido: 'Gómez', correo: 'laura@apexfit.test', telefono: null, contrasena: 'secreta1',
    });
    expect('rol' in req.request.body).toBe(false);
    req.flush({ mensaje: 'Usuario registrado exitosamente.' });

    expect(terminado).toBe(true);
  });
});
