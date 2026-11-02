import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { authInterceptor } from './auth.interceptor';
import { ALLOWED_ROLES, API_URL } from './auth.tokens';
import { fakeJwt } from './test-utils';

describe('authInterceptor', () => {
  let http: HttpClient;
  let controller: HttpTestingController;
  const token = fakeJwt(3600);

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(
      'apexfit.session',
      JSON.stringify({ token, id: 1, correo: 'a@apexfit.test', rol: 'cliente' }),
    );
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: '/api/v1' },
        { provide: ALLOWED_ROLES, useValue: ['cliente'] },
      ],
    });
    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
  });

  it('agrega el token a las llamadas a la API', () => {
    http.get('/api/v1/rutinas').subscribe();
    const req = controller.expectOne('/api/v1/rutinas');
    expect(req.request.headers.get('Authorization')).toBe(`Bearer ${token}`);
    req.flush([]);
  });

  it('no agrega el token a /auth/* ni a otras URLs', () => {
    http.post('/api/v1/auth/login', {}).subscribe();
    http.get('https://otro-sitio.com/datos').subscribe();
    const login = controller.expectOne('/api/v1/auth/login');
    const otro = controller.expectOne('https://otro-sitio.com/datos');
    expect(login.request.headers.has('Authorization')).toBe(false);
    expect(otro.request.headers.has('Authorization')).toBe(false);
    login.flush({});
    otro.flush({});
  });

  it('cierra la sesión si la API responde 401', () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    http.get('/api/v1/rutinas').subscribe({ error: () => undefined });
    controller
      .expectOne('/api/v1/rutinas')
      .flush({ message: 'No autorizado' }, { status: 401, statusText: 'Unauthorized' });

    expect(localStorage.getItem('apexfit.session')).toBeNull();
    expect(navigate).toHaveBeenCalledWith(['/login']);
  });
});
