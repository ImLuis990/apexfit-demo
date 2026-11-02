import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { AuthService } from '../auth/auth.service';
import { API_URL } from '../auth/auth.tokens';
import { Session } from '../auth/auth.models';
import { NotificacionDto } from './notificacion.models';
import { NotificacionesService } from './notificaciones.service';

const BASE = '/api/v1/notificaciones';
const CONTADOR = `${BASE}/no-leidas/contador`;

const dto = (id: number, leida = false): NotificacionDto => ({
  idNotificacion: id, tipo: 'RUTINA_ASIGNADA', titulo: `Aviso ${id}`, mensaje: 'm', referenciaId: id, creadaEn: '2026-10-31T10:00:00', leida,
});

describe('NotificacionesService', () => {
  const sesion = signal<Session | null>({ token: 't', id: 1, correo: 'a@apexfit.test', rol: 'cliente' });
  let http: HttpTestingController;

  function crear() {
    sesion.set({ token: 't', id: 1, correo: 'a@apexfit.test', rol: 'cliente' });
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(), provideHttpClientTesting(),
        { provide: API_URL, useValue: '/api/v1' },
        { provide: AuthService, useValue: { session: sesion.asReadonly() } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    const servicio = TestBed.inject(NotificacionesService);
    TestBed.tick(); // arranca el efecto que mira la sesión
    return servicio;
  }
  const visibilidad = (estado: 'visible' | 'hidden') => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => estado });
    document.dispatchEvent(new Event('visibilitychange'));
  };
  /** Carga la lista con las notificaciones dadas (la 1 sin leer y la 2 leída, salvo que se indique). */
  function conLista(servicio: NotificacionesService, lista = [dto(1), dto(2, true)], total = lista.length) {
    servicio.cargarPrimera();
    http.expectOne((r) => r.url === BASE).flush({ content: lista, totalElements: total });
    http.expectOne(CONTADOR).flush({ total: lista.filter((n) => !n.leida).length });
  }

  beforeEach(() => {
    vi.useFakeTimers();
    visibilidad('visible');
  });
  afterEach(() => {
    vi.useRealTimers();
    visibilidad('visible');
  });

  it('pide el contador al iniciar con sesión y lo refresca cada 60 s', () => {
    const servicio = crear();
    http.expectOne(CONTADOR).flush({ total: 3 });
    expect(servicio.contador()).toBe(3);
    vi.advanceTimersByTime(59_000);
    http.expectNone(CONTADOR);
    vi.advanceTimersByTime(1_000);
    http.expectOne(CONTADOR).flush({ total: 5 });
    expect(servicio.contador()).toBe(5);
  });

  it('marcar como leída baja el contador al instante y se revierte si el backend falla', () => {
    const servicio = crear();
    http.expectOne(CONTADOR).flush({ total: 1 });
    conLista(servicio);

    servicio.marcarLeida(1);
    expect(servicio.items()[0].leida).toBe(true);
    expect(servicio.contador()).toBe(0);
    http.expectOne(`${BASE}/1/leida`).flush(null, { status: 500, statusText: 'Error' });
    expect(servicio.items()[0].leida).toBe(false);
    expect(servicio.contador()).toBe(1);
    expect(servicio.errorAccion()).toContain('No se pudo marcar');
  });

  it('marcar como leída con éxito se queda así; borrar y marcar todas también se revierten', () => {
    const servicio = crear();
    http.expectOne(CONTADOR).flush({ total: 1 });
    conLista(servicio);

    servicio.marcarLeida(1);
    http.expectOne(`${BASE}/1/leida`).flush(null, { status: 204, statusText: 'No Content' });
    expect(servicio.items()[0].leida).toBe(true);

    servicio.borrar(2);
    expect(servicio.items().map((n) => n.id)).toEqual([1]);
    http.expectOne(`${BASE}/2`).flush(null, { status: 500, statusText: 'Error' });
    expect(servicio.items().map((n) => n.id)).toEqual([1, 2]); // vuelve a su lugar
  });

  it('marcar todas deja el contador en 0 y lo restaura si falla', () => {
    const servicio = crear();
    http.expectOne(CONTADOR).flush({ total: 2 });
    conLista(servicio, [dto(1), dto(2)]);
    servicio.marcarTodas();
    expect(servicio.contador()).toBe(0);
    http.expectOne(`${BASE}/leidas`).flush(null, { status: 500, statusText: 'Error' });
    expect(servicio.contador()).toBe(2);
    expect(servicio.items().every((n) => !n.leida)).toBe(true);
  });

  it('«cargar más» pide la página siguiente y se agota cuando ya no hay más', () => {
    const servicio = crear();
    http.expectOne(CONTADOR).flush({ total: 0 });
    servicio.cargarPrimera();
    http.expectOne((r) => r.url === BASE).flush({ content: Array.from({ length: 20 }, (_, i) => dto(i + 1, true)), totalElements: 25 });
    http.expectOne(CONTADOR).flush({ total: 0 });
    expect(servicio.hayMas()).toBe(true);
    servicio.cargarMas();
    const req = http.expectOne((r) => r.url === BASE);
    expect(req.request.params.get('page')).toBe('1');
    req.flush({ content: Array.from({ length: 5 }, (_, i) => dto(21 + i, true)), totalElements: 25 });
    expect(servicio.items().length).toBe(25);
    expect(servicio.hayMas()).toBe(false);
  });

  it('pausa el refresco con la pestaña oculta, lo retoma al volver y se detiene al cerrar sesión', () => {
    const servicio = crear();
    http.expectOne(CONTADOR).flush({ total: 1 });

    visibilidad('hidden');
    vi.advanceTimersByTime(180_000);
    http.expectNone(CONTADOR); // oculta: no pide nada

    visibilidad('visible');
    http.expectOne(CONTADOR).flush({ total: 2 }); // al volver, pide de inmediato
    expect(servicio.contador()).toBe(2);

    sesion.set(null);
    TestBed.tick();
    expect(servicio.contador()).toBe(0); // se borra lo que había
    vi.advanceTimersByTime(180_000);
    http.expectNone(CONTADOR);
  });
});
