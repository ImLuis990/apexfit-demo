import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { proveedoresPanel } from '../testing';
import { AsistenciasService } from './asistencias.service';
import { DashboardService } from './dashboard.service';
import { hoyIso } from './formato';

function preparar() {
  TestBed.configureTestingModule({ providers: [provideRouter([]), ...proveedoresPanel()] });
  return { http: TestBed.inject(HttpTestingController), asistencias: TestBed.inject(AsistenciasService), dashboard: TestBed.inject(DashboardService) };
}

const dto = { idAsistencia: 9, idUsuario: 7, fecha: '2026-10-13', horaEntrada: '07:42:10', horaSalida: null, metodoRegistro: 'QR' };

describe('AsistenciasService (panel)', () => {
  it('listar: pide /asistencias y las convierte', () => {
    const { http, asistencias } = preparar();
    let metodos: string[] = [];
    asistencias.listar().subscribe((l) => (metodos = l.map((a) => a.metodo)));
    http.expectOne('/api/v1/asistencias').flush([dto]);
    expect(metodos).toEqual(['qr']);
  });

  it('registrarQr: POST a /asistencias/escanear-qr con { qrData }', () => {
    const { http, asistencias } = preparar();
    let id = 0;
    asistencias.registrarQr('APEXFIT-USER-7-x@y.z').subscribe((a) => (id = a.id));
    const req = http.expectOne('/api/v1/asistencias/escanear-qr');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ qrData: 'APEXFIT-USER-7-x@y.z' });
    req.flush(dto);
    expect(id).toBe(9);
  });

  it('registrarManual: POST con la fecha de hoy, la hora actual y método "manual"', () => {
    const { http, asistencias } = preparar();
    asistencias.registrarManual(7).subscribe();
    const req = http.expectOne('/api/v1/asistencias');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toMatchObject({ idUsuario: 7, fecha: hoyIso(), metodoRegistro: 'manual' });
    expect(req.request.body.horaEntrada).toMatch(/^\d{2}:\d{2}:\d{2}$/);
    req.flush({ ...dto, metodoRegistro: 'manual' });
  });

  it('registrarSalida: PUT a /asistencias/{id} con todos los campos y la hora de salida', () => {
    const { http, asistencias } = preparar();
    asistencias.registrarSalida({ id: 9, idUsuario: 7, fecha: '2026-10-13', horaEntrada: '07:42:10', horaSalida: null, metodo: 'qr' }).subscribe();
    const req = http.expectOne('/api/v1/asistencias/9');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toMatchObject({ idAsistencia: 9, idUsuario: 7, fecha: '2026-10-13', horaEntrada: '07:42:10', metodoRegistro: 'qr' });
    expect(req.request.body.horaSalida).toMatch(/^\d{2}:\d{2}:\d{2}$/);
    req.flush({ ...dto, horaSalida: '09:00:00' });
  });

  it('DashboardService: pide /dashboard/resumen', () => {
    const { http, dashboard } = preparar();
    let total = 0;
    dashboard.resumen().subscribe((r) => (total = r.totalRutinas));
    http.expectOne('/api/v1/dashboard/resumen').flush({ totalRutinas: 4 });
    expect(total).toBe(4);
  });
});
