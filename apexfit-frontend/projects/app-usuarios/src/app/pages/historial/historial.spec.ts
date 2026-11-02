import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AsistenciaDto, aAsistencia, AsistenciasService, ordenarRecientes } from '../../data/asistencias.service';
import { guardarSesion, proveedoresBase } from '../../testing';
import { Historial } from './historial';

const dto = (id: number, fecha: string, entrada: string, salida: string | null, metodo = 'qr'): AsistenciaDto => ({
  idAsistencia: id,
  idUsuario: 5,
  fecha,
  horaEntrada: entrada,
  horaSalida: salida,
  metodoRegistro: metodo,
});

function crear(historial: () => unknown) {
  localStorage.clear();
  guardarSesion('cliente', 'carlos@apexfit.test', 5);
  TestBed.configureTestingModule({
    imports: [Historial],
    providers: [...proveedoresBase, { provide: AsistenciasService, useValue: { historial: vi.fn(historial) } }],
  });
  const fixture = TestBed.createComponent(Historial);
  fixture.detectChanges();
  return (fixture.nativeElement as HTMLElement).textContent?.replace(/\s+/g, ' ') ?? '';
}

describe('Historial de asistencia', () => {
  it('convierte y ordena: lo más reciente primero, horas HH:mm y método legible', () => {
    const lista = ordenarRecientes([
      aAsistencia(dto(1, '2026-10-10', '07:05:00', '08:10:00')),
      aAsistencia(dto(2, '2026-10-12', '18:30:00', null, 'manual')),
    ]);
    expect(lista.map((a) => a.id)).toEqual([2, 1]);
    expect(lista[0]).toMatchObject({ entrada: '18:30', salida: null, metodo: 'Manual' });
    expect(lista[1]).toMatchObject({ entrada: '07:05', salida: '08:10', metodo: 'QR' });
  });

  it('muestra las visitas con fecha, entrada y salida', () => {
    const t = crear(() => of(ordenarRecientes([aAsistencia(dto(1, '2026-10-12', '07:05:00', '08:10:00'))])));
    expect(t).toContain('1 visita registrada');
    expect(t).toContain('12/10/2026');
    expect(t).toContain('Entrada 07:05');
    expect(t).toContain('Salida 08:10');
  });

  it('sin asistencias avisa, y si falla el servidor muestra el error', () => {
    expect(crear(() => of([]))).toContain('Aún no tienes asistencias');
    TestBed.resetTestingModule();
    expect(crear(() => throwError(() => new HttpErrorResponse({ status: 0 })))).toContain('No se pudo conectar');
  });
});
