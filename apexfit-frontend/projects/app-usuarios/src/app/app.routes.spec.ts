import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from './app.routes';
import { guardarSesion, proveedoresBase } from './testing';

async function iniciar() {
  TestBed.configureTestingModule({ providers: [provideRouter(routes), ...proveedoresBase] });
  const harness = await RouterTestingHarness.create();
  return { harness, router: TestBed.inject(Router) };
}

describe('rutas de app-usuarios', () => {
  beforeEach(() => localStorage.clear());

  it('sin sesión, una ruta privada manda al login recordando el destino', async () => {
    const { harness, router } = await iniciar();
    await harness.navigateByUrl('/rutina');
    expect(router.url).toBe('/login?returnUrl=%2Frutina');
  });

  it('con sesión de cliente, la raíz entra a Hoy dentro del shell con la barra', async () => {
    guardarSesion('cliente');
    const { harness, router } = await iniciar();
    await harness.navigateByUrl('/');
    expect(router.url).toBe('/hoy');
    const texto = harness.routeNativeElement?.textContent ?? '';
    expect(texto).toContain('Hola');
    expect(texto).toContain('Progreso'); // barra inferior
  });

  it('navega entre las secciones del cliente', async () => {
    guardarSesion('cliente');
    const { harness, router } = await iniciar();
    for (const [ruta, titulo] of [
      ['/rutina', 'Mi rutina'],
      ['/mi-qr', 'pase de entrada'],
      ['/progreso', 'Tu progreso'],
    ]) {
      await harness.navigateByUrl(ruta);
      expect(router.url).toBe(ruta);
      expect(harness.routeNativeElement?.textContent).toContain(titulo);
    }
  });

  it('una sesión de entrenador no entra a la app de usuarios', async () => {
    guardarSesion('entrenador');
    const { harness, router } = await iniciar();
    await harness.navigateByUrl('/hoy');
    expect(router.url).toBe('/login?motivo=sin-acceso');
    expect(localStorage.getItem('apexfit.session')).toBeNull();
  });

  it('con sesión, /login redirige al inicio del cliente', async () => {
    guardarSesion('cliente');
    const { harness, router } = await iniciar();
    await harness.navigateByUrl('/login');
    expect(router.url).toBe('/hoy');
  });

  it('una ruta inexistente vuelve a la raíz', async () => {
    guardarSesion('cliente');
    const { harness, router } = await iniciar();
    await harness.navigateByUrl('/no-existe');
    expect(router.url).toBe('/hoy');
  });

  it('/registro se puede abrir sin sesión y muestra el formulario de cuenta nueva', async () => {
    const { harness, router } = await iniciar();
    await harness.navigateByUrl('/registro');
    expect(router.url).toBe('/registro');
    expect(harness.routeNativeElement?.textContent).toContain('Crea tu cuenta');
  });

  it('con sesión, /registro lleva al inicio del cliente', async () => {
    guardarSesion('cliente');
    const { harness, router } = await iniciar();
    await harness.navigateByUrl('/registro');
    expect(router.url).toBe('/hoy');
  });

  it('/cuenta muestra Mi cuenta dentro del shell (con la barra inferior)', async () => {
    guardarSesion('cliente');
    const { harness, router } = await iniciar();
    await harness.navigateByUrl('/cuenta');
    expect(router.url).toBe('/cuenta');
    const texto = harness.routeNativeElement?.textContent ?? '';
    expect(texto).toContain('Mi cuenta');
    expect(texto).toContain('Progreso'); // barra inferior
  });

  it('/cuenta sin sesión manda al login', async () => {
    const { harness, router } = await iniciar();
    await harness.navigateByUrl('/cuenta');
    expect(router.url).toBe('/login?returnUrl=%2Fcuenta');
  });
});
