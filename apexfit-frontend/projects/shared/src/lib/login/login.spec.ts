import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { ExternalNavigator } from '../auth/external-navigator';
import { readHandoffSession } from '../auth/session-transfer';
import { ALLOWED_ROLES, API_URL, ROLE_HOME_URLS } from '../auth/auth.tokens';
import { fakeJwt } from '../auth/test-utils';
import { Login } from './login';

describe('Login', () => {
  let fixture: ComponentFixture<Login>;
  let http: HttpTestingController;
  let navigateByUrl: ReturnType<typeof vi.spyOn>;
  const go = vi.fn();

  const text = () => (fixture.nativeElement as HTMLElement).textContent ?? '';
  const fill = (correo: string, contrasena: string) =>
    fixture.componentInstance.form.setValue({ correo, contrasena });

  beforeEach(() => {
    go.mockClear();
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: '/api/v1' },
        { provide: ALLOWED_ROLES, useValue: ['cliente'] },
        // Solo el administrador tiene otra app asignada; el entrenador, en estas pruebas, no.
        { provide: ROLE_HOME_URLS, useValue: { administrador: 'http://panel.test' } },
        { provide: ExternalNavigator, useValue: { go } },
      ],
    });
    fixture = TestBed.createComponent(Login);
    http = TestBed.inject(HttpTestingController);
    navigateByUrl = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    fixture.detectChanges();
  });

  it('no envía nada si el formulario es inválido', () => {
    fill('no-es-correo', '');
    fixture.componentInstance.submit();
    fixture.detectChanges();

    http.expectNone('/api/v1/auth/login');
    expect(text()).toContain('Escribe un correo válido.');
    expect(text()).toContain('La contraseña es obligatoria.');
  });

  it('entra y navega a inicio cuando el rol corresponde a la app', () => {
    fill('cliente@apexfit.test', 'Prueba123');
    fixture.componentInstance.submit();
    http.expectOne('/api/v1/auth/login').flush({
      token: fakeJwt(3600), type: 'Bearer', id: 1, correo: 'cliente@apexfit.test', roles: ['ROLE_CLIENTE'],
    });

    expect(navigateByUrl).toHaveBeenCalledWith('/');
  });

  it('traspasa al panel a un rol que tiene otra app asignada (login único)', () => {
    fill('administrador@apexfit.test', 'Prueba123');
    fixture.componentInstance.submit();
    http.expectOne('/api/v1/auth/login').flush({
      token: fakeJwt(3600), type: 'Bearer', id: 3, correo: 'administrador@apexfit.test', roles: ['ROLE_ADMINISTRADOR'],
    });

    expect(go).toHaveBeenCalledTimes(1);
    const url: string = go.mock.calls[0][0];
    expect(url.startsWith('http://panel.test/sesion#s=')).toBe(true);
    expect(readHandoffSession(url.split('#')[1])?.rol).toBe('administrador');
    expect(navigateByUrl).not.toHaveBeenCalled();
    // el rol de personal nunca queda guardado en la app de usuarios
    expect(localStorage.getItem('apexfit.session')).toBeNull();
  });

  it('rechaza un rol que no entra aquí y no tiene otra app asignada', () => {
    fill('entrenador@apexfit.test', 'Prueba123');
    fixture.componentInstance.submit();
    http.expectOne('/api/v1/auth/login').flush({
      token: fakeJwt(3600), type: 'Bearer', id: 2, correo: 'entrenador@apexfit.test', roles: ['ROLE_ENTRENADOR'],
    });
    fixture.detectChanges();

    expect(go).not.toHaveBeenCalled();
    expect(navigateByUrl).not.toHaveBeenCalled();
    expect(text()).toContain('no puede entrar a esta aplicación');
    expect(localStorage.getItem('apexfit.session')).toBeNull();
  });

  it('muestra "credenciales incorrectas" cuando el backend responde 400', () => {
    fill('cliente@apexfit.test', 'mala-clave');
    fixture.componentInstance.submit();
    http
      .expectOne('/api/v1/auth/login')
      .flush({ status: 400, message: 'Bad credentials' }, { status: 400, statusText: 'Bad Request' });
    fixture.detectChanges();

    expect(text()).toContain('Correo o contraseña incorrectos.');
  });

  it('si la cuenta está desactivada (403), muestra el motivo que da el backend', () => {
    fill('cliente@apexfit.test', 'Prueba123');
    fixture.componentInstance.submit();
    http.expectOne('/api/v1/auth/login').flush(
      { status: 403, message: 'Cuenta inactiva: Su usuario ha sido desactivado.' },
      { status: 403, statusText: 'Forbidden' },
    );
    fixture.detectChanges();

    expect(text()).toContain('Cuenta inactiva');
    expect(text()).not.toContain('Correo o contraseña incorrectos');
  });

  it('credenciales incorrectas con 401 muestran el mensaje genérico', () => {
    fill('cliente@apexfit.test', 'mala');
    fixture.componentInstance.submit();
    http.expectOne('/api/v1/auth/login').flush({ status: 401, message: 'Credenciales inválidas' }, { status: 401, statusText: 'Unauthorized' });
    fixture.detectChanges();

    expect(text()).toContain('Correo o contraseña incorrectos.');
  });

  it('avisa si no hay conexión con el backend', () => {
    fill('cliente@apexfit.test', 'Prueba123');
    fixture.componentInstance.submit();
    http.expectOne('/api/v1/auth/login').error(new ProgressEvent('error'));
    fixture.detectChanges();

    expect(text()).toContain('No se pudo conectar con el servidor');
  });
});
