import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { proveedoresPanel } from '../testing';
import { ConfiguracionService } from './configuracion.service';

const URL = '/api/v1/configuracion/inactividad';

function crear() {
  localStorage.clear();
  TestBed.configureTestingModule({ providers: [...proveedoresPanel()] });
  return { servicio: TestBed.inject(ConfiguracionService), http: TestBed.inject(HttpTestingController) };
}

describe('ConfiguracionService (días de inactividad)', () => {
  it('lee del servidor una sola vez aunque lo pidan varias pantallas', () => {
    const { servicio, http } = crear();
    const recibidos: number[] = [];
    servicio.obtenerDiasInactividad().subscribe((d) => recibidos.push(d));
    servicio.obtenerDiasInactividad().subscribe((d) => recibidos.push(d));
    http.expectOne(URL).flush({ dias: 7 });
    servicio.obtenerDiasInactividad().subscribe((d) => recibidos.push(d)); // ya en caché
    http.expectNone(URL);
    expect(recibidos).toEqual([7, 7, 7]);
    expect(servicio.dias()).toBe(7);
    expect(servicio.aviso()).toBeNull();
  });

  it('si el servidor falla usa 10 y avisa (ignora lo que haya en el navegador), y la próxima vez reintenta', () => {
    const { servicio, http } = crear();
    localStorage.setItem('apexfit.panel.dias-inactividad', '3'); // valor viejo: no se usa
    let dias = 0;
    servicio.obtenerDiasInactividad().subscribe((d) => (dias = d));
    http.expectOne(URL).flush(null, { status: 500, statusText: 'Error' });
    expect(dias).toBe(10);
    expect(servicio.aviso()).toContain('se usan 10');

    servicio.obtenerDiasInactividad().subscribe((d) => (dias = d));
    http.expectOne(URL).flush({ dias: 4 }); // se recuperó
    expect(dias).toBe(4);
    expect(servicio.aviso()).toBeNull();
  });

  it('guardar hace PUT con {dias}, actualiza la caché y, si falla, deja el valor anterior', () => {
    const { servicio, http } = crear();
    servicio.obtenerDiasInactividad().subscribe();
    http.expectOne(URL).flush({ dias: 10 });

    let guardado = 0;
    servicio.guardarDiasInactividad(5).subscribe((d) => (guardado = d));
    const put = http.expectOne(URL);
    expect([put.request.method, put.request.body]).toEqual(['PUT', { dias: 5 }]);
    put.flush({ dias: 5 });
    expect([guardado, servicio.dias()]).toEqual([5, 5]);
    servicio.obtenerDiasInactividad().subscribe((d) => (guardado = d)); // la caché ya trae el valor nuevo
    http.expectNone(URL);
    expect(guardado).toBe(5);

    let error: unknown;
    servicio.guardarDiasInactividad(9).subscribe({ error: (e) => (error = e) });
    http.expectOne(URL).flush(null, { status: 403, statusText: 'Forbidden' });
    expect(error).toBeTruthy();
    expect(servicio.dias()).toBe(5);
  });
});
