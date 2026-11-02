import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from './app.routes';
import { inicioDe, menuDe } from './layout/menu';
import { URL_LOGIN, guardarSesion, proveedoresPanel } from './testing';

async function iniciar() {
  const irA = vi.fn();
  TestBed.configureTestingModule({ providers: [provideRouter(routes), ...proveedoresPanel(irA)] });
  const harness = await RouterTestingHarness.create();
  return { harness, router: TestBed.inject(Router), irA };
}

const texto = (h: RouterTestingHarness) => h.routeNativeElement?.textContent?.replace(/\s+/g, ' ') ?? '';

describe('rutas del panel', () => {
  beforeEach(() => localStorage.clear());

  it('sin sesión, sale hacia el login único de la app de usuarios', async () => {
    const { harness, irA } = await iniciar();
    await harness.navigateByUrl('/usuarios');
    expect(irA).toHaveBeenCalledWith(URL_LOGIN);
  });

  it('una sesión de cliente no entra al panel: se borra y se avisa en el login', async () => {
    guardarSesion('cliente');
    const { harness, irA } = await iniciar();
    await harness.navigateByUrl('/usuarios');
    expect(irA).toHaveBeenCalledWith(`${URL_LOGIN}?motivo=sin-acceso`);
    expect(localStorage.getItem('apexfit.session')).toBeNull();
  });

  it('el administrador entra a Resumen y ve el menú de administrador', async () => {
    guardarSesion('administrador');
    const { harness, router } = await iniciar();
    await harness.navigateByUrl('/');
    expect(router.url).toBe('/resumen');
    expect(texto(harness)).toContain('Resumen');
    for (const opcion of ['Resumen', 'Asistencia', 'Usuarios', 'Asignaciones', 'Membresías', 'Ejercicios']) expect(texto(harness)).toContain(opcion);
    expect(texto(harness)).not.toContain('Mis clientes');
  });

  it('el entrenador entra a Mis clientes y ve el menú de entrenador', async () => {
    guardarSesion('entrenador');
    const { harness, router } = await iniciar();
    await harness.navigateByUrl('/');
    expect(router.url).toBe('/clientes');
    expect(texto(harness)).toContain('Mis clientes');
    expect(texto(harness)).toContain('Nueva rutina');
    expect(texto(harness)).not.toContain('Membresías');
  });

  it('el entrenador no puede abrir Usuarios: vuelve a su inicio', async () => {
    guardarSesion('entrenador');
    const { harness, router } = await iniciar();
    await harness.navigateByUrl('/usuarios');
    expect(router.url).toBe('/clientes');
  });

  it('el administrador no puede abrir las pantallas del entrenador', async () => {
    guardarSesion('administrador');
    const { harness, router } = await iniciar();
    await harness.navigateByUrl('/rutinas');
    expect(router.url).toBe('/resumen');
  });

  it('una ruta inexistente vuelve al inicio del rol', async () => {
    guardarSesion('administrador');
    const { harness, router } = await iniciar();
    await harness.navigateByUrl('/no-existe');
    expect(router.url).toBe('/resumen');
  });

  it('Mi cuenta está disponible para el administrador y para el entrenador', async () => {
    for (const rol of ['administrador', 'entrenador'] as const) {
      TestBed.resetTestingModule();
      localStorage.clear();
      guardarSesion(rol);
      const { harness, router } = await iniciar();
      await harness.navigateByUrl('/cuenta');
      expect(router.url).toBe('/cuenta');
      expect(texto(harness)).toContain('Mi cuenta');
    }
  });

  it('Membresías es una pantalla real del administrador, y el entrenador no entra', async () => {
    guardarSesion('administrador');
    const a = await iniciar();
    await a.harness.navigateByUrl('/membresias');
    expect(a.router.url).toBe('/membresias');
    expect(texto(a.harness)).toContain('+ Nueva membresía');

    TestBed.resetTestingModule();
    localStorage.clear();
    guardarSesion('entrenador');
    const b = await iniciar();
    await b.harness.navigateByUrl('/membresias');
    expect(b.router.url).toBe('/clientes');
  });

  it('Asignaciones es una pantalla real del administrador, y el entrenador no entra', async () => {
    guardarSesion('administrador');
    const a = await iniciar();
    await a.harness.navigateByUrl('/asignaciones');
    expect(a.router.url).toBe('/asignaciones');
    expect(texto(a.harness)).toContain('Qué entrenador atiende a cada cliente');

    TestBed.resetTestingModule();
    localStorage.clear();
    guardarSesion('entrenador');
    const b = await iniciar();
    await b.harness.navigateByUrl('/asignaciones');
    expect(b.router.url).toBe('/clientes');
  });

  it('Mis clientes y Nueva rutina son pantallas reales del entrenador, y el administrador no entra', async () => {
    guardarSesion('entrenador');
    const a = await iniciar();
    await a.harness.navigateByUrl('/clientes');
    expect(a.router.url).toBe('/clientes');
    expect(texto(a.harness)).toContain('Mis clientes');
    await a.harness.navigateByUrl('/rutinas');
    expect(a.router.url).toBe('/rutinas');
    expect(texto(a.harness)).toContain('Nueva rutina');

    TestBed.resetTestingModule();
    localStorage.clear();
    guardarSesion('administrador');
    const b = await iniciar();
    await b.harness.navigateByUrl('/rutinas');
    expect(b.router.url).toBe('/resumen');
  });

  it('Resumen y Asistencia son pantallas reales del administrador', async () => {
    guardarSesion('administrador');
    const { harness, router } = await iniciar();
    await harness.navigateByUrl('/resumen');
    expect(router.url).toBe('/resumen');
    expect(texto(harness)).toContain('Resumen');
    await harness.navigateByUrl('/asistencia');
    expect(router.url).toBe('/asistencia');
    expect(texto(harness)).toContain('Asistencia');
  });

  // Si el menú apunta a una ruta que no existe (o se le da a otro rol), estas pruebas lo detectan.
  describe('el menú y las rutas coinciden', () => {
    for (const rol of ['administrador', 'entrenador'] as const) {
      const otro = rol === 'administrador' ? 'entrenador' : 'administrador';

      it(`cada opción del menú de ${rol} abre su propia pantalla`, async () => {
        guardarSesion(rol);
        const { harness, router } = await iniciar();
        for (const item of menuDe(rol)) {
          await harness.navigateByUrl(item.ruta);
          expect(router.url, item.etiqueta).toBe(item.ruta);
        }
      });

      it(`la raíz lleva a ${rol} a la primera opción de su menú`, async () => {
        guardarSesion(rol);
        const { harness, router } = await iniciar();
        await harness.navigateByUrl('/');
        expect(router.url).toBe(menuDe(rol)[0].ruta);
      });

      it(`${rol} no puede abrir ninguna opción del menú de ${otro}`, async () => {
        guardarSesion(rol);
        const { harness, router } = await iniciar();
        for (const item of menuDe(otro).filter((i) => !menuDe(rol).some((m) => m.ruta === i.ruta))) {
          await harness.navigateByUrl(item.ruta);
          expect(router.url, item.etiqueta).toBe(inicioDe(rol));
        }
      });
    }
  });
});
