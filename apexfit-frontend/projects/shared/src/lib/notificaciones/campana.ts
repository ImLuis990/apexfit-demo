import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, input, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { Notificacion } from './notificacion.models';
import { estiloDe, horaRelativa, iconoDe, rutaDeNotificacion } from './notificacion.utils';
import { NotificacionesService } from './notificaciones.service';

let siguiente = 0;

/** La campana de notificaciones: contador y lista desplegable. Se usa en el encabezado de las dos apps. */
@Component({
  selector: 'lib-campana',
  templateUrl: './campana.html',
  styleUrl: './campana.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    // No se llama «lateral» a propósito: el menú del panel ya usa esa clase y sus estilos se aplicaban a la campana.
    '[class.en-menu]': 'modo() === "lateral"',
    '(document:keydown.escape)': 'cerrar(true)',
    '(document:click)': 'alPulsarEnLaPagina($event)',
  },
})
export class Campana {
  /** «barra»: dentro de un encabezado (el panel ocupa su ancho). «lateral»: dentro del menú lateral del panel. */
  readonly modo = input<'barra' | 'lateral'>('barra');

  protected readonly servicio = inject(NotificacionesService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly anfitrion = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly boton = viewChild<ElementRef<HTMLButtonElement>>('boton');

  protected readonly idPanel = `panel-notificaciones-${++siguiente}`;
  protected readonly abierta = signal(false);
  /** Para la hora relativa: se fija al abrir. */
  protected readonly ahora = signal(Date.now());

  protected readonly textoContador = computed(() => (this.servicio.contador() > 9 ? '9+' : String(this.servicio.contador())));
  protected readonly etiqueta = computed(() => `Notificaciones, ${this.servicio.contador()} sin leer`);

  protected readonly estiloDe = estiloDe;
  protected readonly iconoDe = iconoDe;

  protected alternar(): void {
    if (this.abierta()) {
      this.cerrar(false);
      return;
    }
    this.ahora.set(Date.now());
    this.abierta.set(true);
    this.servicio.cargarPrimera();
  }

  protected cerrar(devolverFoco: boolean): void {
    if (!this.abierta()) return;
    this.abierta.set(false);
    this.servicio.limpiarError();
    if (devolverFoco) this.boton()?.nativeElement.focus();
  }

  /** Pulsar fuera de la campana la cierra. (composedPath: sigue valiendo si la fila pulsada ya se quitó del DOM.) */
  protected alPulsarEnLaPagina(evento: Event): void {
    if (this.abierta() && !evento.composedPath().includes(this.anfitrion.nativeElement)) this.cerrar(false);
  }

  protected hora(n: Notificacion): string {
    return horaRelativa(n.creadaEn, this.ahora());
  }

  /** La marca como leída y abre la pantalla que le corresponde (si el tipo tiene una). */
  protected abrirNotificacion(n: Notificacion): void {
    this.servicio.marcarLeida(n.id);
    const ruta = rutaDeNotificacion(n.tipo, this.auth.session()?.rol);
    this.cerrar(false);
    if (ruta) void this.router.navigateByUrl(ruta);
  }
}
