import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Rol } from 'shared';
import { guardarSesion, proveedoresPanel, URL_LOGIN } from '../../testing';
import { PanelShell } from './panel-shell';

function crear(rol: Rol, irA: (url: string) => void = () => undefined): ComponentFixture<PanelShell> {
  localStorage.clear();
  guardarSesion(rol, `${rol}@apexfit.test`);
  TestBed.configureTestingModule({ imports: [PanelShell], providers: [provideRouter([]), ...proveedoresPanel(irA)] });
  const fixture = TestBed.createComponent(PanelShell);
  fixture.detectChanges();
  return fixture;
}

const el = (f: ComponentFixture<PanelShell>) => f.nativeElement as HTMLElement;
const enlaces = (f: ComponentFixture<PanelShell>) =>
  Array.from(el(f).querySelectorAll('nav a')) as HTMLAnchorElement[];

describe('PanelShell', () => {
  it('el administrador ve Resumen, Asistencia, Inactividad, Usuarios, Asignaciones, Membresías y Ejercicios', () => {
    const f = crear('administrador');
    expect(enlaces(f).map((a) => a.textContent?.trim())).toEqual(['Resumen', 'Asistencia', 'Inactividad', 'Usuarios', 'Asignaciones', 'Membresías', 'Ejercicios']);
    expect(enlaces(f).map((a) => a.getAttribute('href'))).toEqual(['/resumen', '/asistencia', '/inactividad', '/usuarios', '/asignaciones', '/membresias', '/ejercicios']);
    expect(el(f).querySelector('.rol')?.textContent).toContain('Administrador');
  });

  it('el entrenador ve Mis clientes, Nueva rutina, Mis rutinas y Ejercicios', () => {
    const f = crear('entrenador');
    expect(enlaces(f).map((a) => a.textContent?.trim())).toEqual(['Mis clientes', 'Nueva rutina', 'Mis rutinas', 'Ejercicios']);
    expect(enlaces(f).map((a) => a.getAttribute('href'))).toEqual(['/clientes', '/rutinas', '/mis-rutinas', '/ejercicios']);
    expect(el(f).querySelector('.rol')?.textContent).toContain('Entrenador');
  });

  it('cada opción del menú dibuja su ícono', () => {
    for (const rol of ['administrador', 'entrenador'] as const) {
      TestBed.resetTestingModule();
      const f = crear(rol);
      const iconos = Array.from(el(f).querySelectorAll('nav a svg')) as SVGElement[];
      expect(iconos.length).toBe(enlaces(f).length);
      for (const icono of iconos) expect(icono.children.length, rol).toBeGreaterThan(0);
    }
  });

  it('muestra el correo de la sesión y las iniciales', () => {
    const f = crear('administrador');
    expect(el(f).querySelector('.correo')?.textContent).toContain('administrador@apexfit.test');
    expect(el(f).querySelector('.cuenta .av')?.textContent?.trim()).toBe('AD');
  });

  it('el botón de menú (celular) alterna aria-expanded y el panel lateral', () => {
    const f = crear('administrador');
    const boton = el(f).querySelector('.hamburguesa') as HTMLButtonElement;
    const lateral = el(f).querySelector('.lateral') as HTMLElement;

    expect(boton.getAttribute('aria-expanded')).toBe('false');
    expect(lateral.classList.contains('abierto')).toBe(false);

    boton.click();
    f.detectChanges();
    expect(boton.getAttribute('aria-expanded')).toBe('true');
    expect(lateral.classList.contains('abierto')).toBe(true);
    expect(boton.textContent).toContain('Cerrar menú');
  });

  it('al tocar una opción del menú, el menú se cierra', () => {
    const f = crear('administrador');
    // Sin rutas reales en esta prueba: se simula la navegación para no dejar un rechazo suelto.
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    (el(f).querySelector('.hamburguesa') as HTMLButtonElement).click();
    f.detectChanges();

    enlaces(f)[0].click();
    expect(navegar).toHaveBeenCalled();
    f.detectChanges();

    expect((el(f).querySelector('.lateral') as HTMLElement).classList.contains('abierto')).toBe(false);
  });

  it('"Cerrar sesión" borra la sesión y manda al login de la app de usuarios', () => {
    const irA = vi.fn();
    const f = crear('administrador', irA);
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    (el(f).querySelector('.salir') as HTMLButtonElement).click();

    expect(localStorage.getItem('apexfit.session')).toBeNull();
    expect(irA).toHaveBeenCalledWith(URL_LOGIN);
  });

  it('el avatar y el correo llevan a "Mi cuenta"', () => {
    const f = crear('administrador');
    const enlace = el(f).querySelector('a.mi-cuenta') as HTMLAnchorElement;
    expect(enlace.getAttribute('href')).toBe('/cuenta');
    expect(enlace.getAttribute('aria-label')).toBe('Mi cuenta');
    expect(enlace.textContent).toContain('@apexfit.test');
  });
});
