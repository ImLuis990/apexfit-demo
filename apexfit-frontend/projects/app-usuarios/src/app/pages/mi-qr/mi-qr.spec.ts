import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { EstadoMembresia } from '../../data/membresias.mapper';
import { MembresiasService } from '../../data/membresias.service';
import { dibujarQr, textoQr } from '../../data/qr';
import { guardarSesion, proveedoresBase } from '../../testing';
import { MiQr } from './mi-qr';

const activa: EstadoMembresia = { tipo: 'activa', plan: 'Mensual', vence: '2026-11-12', diasRestantes: 28, porVencer: false };

function crear(estado: () => unknown = () => of(activa), conSesion = true) {
  localStorage.clear();
  if (conSesion) guardarSesion('cliente', 'carlos@apexfit.test', 5);
  const servicio = { estado: vi.fn(estado) };
  TestBed.configureTestingModule({
    imports: [MiQr],
    providers: [provideRouter([]), ...proveedoresBase, { provide: MembresiasService, useValue: servicio }],
  });
  const fixture = TestBed.createComponent(MiQr);
  fixture.detectChanges();
  return { fixture, servicio };
}

type F = ComponentFixture<MiQr>;
const el = (f: F) => f.nativeElement as HTMLElement;
const texto = (f: F) => el(f).textContent?.replace(/\s+/g, ' ') ?? '';

describe('Mi QR (pantalla)', () => {
  it('dibuja el QR del usuario con sesión, con el formato que espera el backend', () => {
    const { fixture } = crear();
    const svg = el(fixture).querySelector('.qrbox svg[role="img"]') as SVGElement;
    expect(svg).not.toBeNull();

    const { lado, ruta } = dibujarQr(textoQr(5, 'carlos@apexfit.test'));
    expect(svg.getAttribute('viewBox')).toBe(`-4 -4 ${lado + 8} ${lado + 8}`);
    expect(svg.querySelector('path')?.getAttribute('d')).toBe(ruta);
    expect(texto(fixture)).toContain('APEXFIT-USER-5-carlos@apexfit.test');
  });

  it('el título y la ayuda para recepción', () => {
    const { fixture } = crear();
    expect(el(fixture).querySelector('h1')?.textContent).toContain('pase de entrada');
    expect(texto(fixture)).toContain('Muéstralo en recepción');
  });

  it('sin sesión no inventa un código: muestra un aviso', () => {
    const { fixture } = crear(() => of(activa), false);
    expect(el(fixture).querySelector('.qrbox svg')).toBeNull();
    expect(texto(fixture)).toContain('Inicia sesión para ver tu código');
    expect(el(fixture).querySelector('.qrbox [role="img"]')).not.toBeNull();
  });

  describe('membresía', () => {
    it('mientras carga lo indica', () => {
      expect(texto(crear(() => new Subject()).fixture)).toContain('Membresía: cargando');
    });

    it('activa: etiqueta y detalle', () => {
      const t = texto(crear().fixture);
      expect(t).toContain('Membresía: Activa');
      expect(t).toContain('Mensual · vence el 12/11/2026 (quedan 28 días)');
    });

    it('vencida: etiqueta roja', () => {
      const { fixture } = crear(() => of<EstadoMembresia>({ tipo: 'vencida', plan: 'Mensual', vencio: '2026-10-01' }));
      expect(texto(fixture)).toContain('Membresía: Vencida');
      expect(el(fixture).querySelector('.af-tag--danger')).not.toBeNull();
    });

    it('sin membresía: lo dice', () => {
      expect(texto(crear(() => of<EstadoMembresia>({ tipo: 'sin-membresia' })).fixture)).toContain('Membresía: Sin membresía');
    });

    it('si falla, muestra el error y "Reintentar" vuelve a pedirla sin tocar el QR', () => {
      let intento = 0;
      const { fixture, servicio } = crear(() => (++intento === 1 ? throwError(() => new HttpErrorResponse({ status: 500 })) : of(activa)));
      expect(texto(fixture)).toContain('No pudimos cargar tu membresía');
      expect(el(fixture).querySelector('.qrbox svg')).not.toBeNull(); // el QR no depende de la membresía

      (Array.from(el(fixture).querySelectorAll('button')).find((b) => b.textContent?.includes('Reintentar')) as HTMLButtonElement).click();
      fixture.detectChanges();

      expect(servicio.estado).toHaveBeenCalledTimes(2);
      expect(texto(fixture)).toContain('Membresía: Activa');
    });
  });
});
