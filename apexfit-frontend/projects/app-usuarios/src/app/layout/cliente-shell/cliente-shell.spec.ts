import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { proveedoresBase } from '../../testing';
import { ClienteShell } from './cliente-shell';

describe('ClienteShell', () => {
  it('muestra la barra inferior con las 5 secciones del cliente', () => {
    TestBed.configureTestingModule({ imports: [ClienteShell], providers: [provideRouter([]), ...proveedoresBase] });
    const fixture = TestBed.createComponent(ClienteShell);
    fixture.detectChanges();

    const enlaces = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('nav a'),
    ) as HTMLAnchorElement[];

    expect(enlaces.map((a) => a.textContent?.trim())).toEqual(['Hoy', 'Rutina', 'Mi QR', 'Asistencia', 'Progreso']);
    expect(enlaces.map((a) => a.getAttribute('href'))).toEqual(['/hoy', '/rutina', '/mi-qr', '/historial', '/progreso']);
  });
});
