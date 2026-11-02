import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { ClienteAsignado } from '../../data/clientes.models';
import { ClientesService } from '../../data/clientes.service';
import { Clientes } from './clientes';
import { configuracionFalsa } from '../../testing';

const lista = (): ClienteAsignado[] => [
  {
    idCliente: 5, nombre: 'Carlos Pérez', correo: 'carlos@apexfit.test', iniciales: 'CP', rutinaActiva: 'Fuerza semana 1',
    registros: [
      { id: 3, fecha: '2026-10-13', peso: 74.6, imc: 24.08 },
      { id: 2, fecha: '2026-10-06', peso: 76.4, imc: 24.7 },
    ],
  },
  { idCliente: 6, nombre: 'Pedro Salgado', correo: 'pedro@apexfit.test', iniciales: 'PS', rutinaActiva: null, registros: [] },
];

function crear(misClientes: () => unknown = () => of(lista())) {
  const servicio = { misClientes: vi.fn(misClientes) };
  TestBed.configureTestingModule({
    imports: [Clientes],
    providers: [provideRouter([]), { provide: ClientesService, useValue: servicio }, configuracionFalsa()],
  });
  const fixture = TestBed.createComponent(Clientes);
  fixture.detectChanges();
  return { fixture, servicio };
}

type F = ComponentFixture<Clientes>;
const el = (f: F) => f.nativeElement as HTMLElement;
const texto = (f: F) => el(f).textContent?.replace(/\s+/g, ' ') ?? '';
const boton = (f: F, etiqueta: string) => el(f).querySelector(`button[aria-label="${etiqueta}"]`) as HTMLButtonElement;

describe('Mis clientes (pantalla)', () => {
  it('mientras carga lo indica', () => {
    expect(texto(crear(() => new Subject()).fixture)).toContain('Cargando tus clientes');
  });

  it('si falla, muestra el error y "Reintentar" vuelve a cargar', () => {
    let intento = 0;
    const { fixture, servicio } = crear(() => (++intento === 1 ? throwError(() => new HttpErrorResponse({ status: 500 })) : of(lista())));
    expect(texto(fixture)).toContain('No pudimos cargar tus clientes');
    (Array.from(el(fixture).querySelectorAll('button')).find((b) => b.textContent?.includes('Reintentar')) as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(servicio.misClientes).toHaveBeenCalledTimes(2);
    expect(texto(fixture)).toContain('Carlos Pérez');
  });

  it('sin clientes asignados lo explica', () => {
    expect(texto(crear(() => of([])).fixture)).toContain('Todavía no tienes clientes asignados');
  });

  it('muestra cada cliente con su rutina, su último peso y cuánto cambió', () => {
    const t = texto(crear().fixture);
    expect(t).toContain('2 clientes');
    expect(t).toContain('Carlos Pérez');
    expect(t).toContain('carlos@apexfit.test');
    expect(t).toContain('Rutina: Fuerza semana 1');
    expect(t).toContain('74,6 kg');
    expect(t).toContain('13/10');
    expect(t).toContain('Bajó 1,8 kg');
    expect(t).toContain('Sin rutina activa');
    expect(t).toContain('Sin mediciones');
  });

  it('el botón de rutina cambia según si ya tiene una, y lleva al formulario con el cliente elegido', () => {
    const { fixture } = crear();
    const conRutina = el(fixture).querySelector('a[aria-label="Nueva rutina para Carlos Pérez"]') as HTMLAnchorElement;
    const sinRutina = el(fixture).querySelector('a[aria-label="Nueva rutina para Pedro Salgado"]') as HTMLAnchorElement;
    expect(conRutina.textContent?.trim()).toBe('Nueva rutina');
    expect(conRutina.getAttribute('href')).toBe('/rutinas?cliente=5');
    expect(sinRutina.textContent?.trim()).toBe('Asignar rutina');
  });

  it('"Ver progreso" despliega las mediciones y se vuelve a ocultar', () => {
    const { fixture } = crear();
    const ver = boton(fixture, 'Ver progreso de Carlos Pérez');
    expect(ver.getAttribute('aria-expanded')).toBe('false');
    expect(el(fixture).querySelector('table')).toBeNull();

    ver.click();
    fixture.detectChanges();

    expect(ver.getAttribute('aria-expanded')).toBe('true');
    const filas = Array.from(el(fixture).querySelectorAll('tbody tr')).map((f) =>
      Array.from(f.querySelectorAll('td')).map((c) => c.textContent?.trim()),
    );
    expect(filas).toEqual([
      ['13/10/2026', '74,6 kg', '24,1'],
      ['06/10/2026', '76,4 kg', '24,7'],
    ]);

    ver.click();
    fixture.detectChanges();
    expect(el(fixture).querySelector('table')).toBeNull();
  });

  it('un cliente sin mediciones lo dice al abrir su progreso', () => {
    const { fixture } = crear();
    boton(fixture, 'Ver progreso de Pedro Salgado').click();
    fixture.detectChanges();
    expect(texto(fixture)).toContain('todavía no ha registrado mediciones');
  });
});
