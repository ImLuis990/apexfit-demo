import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService, Campana } from 'shared';
import { esRolDelPanel, ItemMenu, menuDe } from '../menu';

const ETIQUETA_ROL = { administrador: 'Administrador', entrenador: 'Entrenador' } as const;

/** Marco del panel: menú lateral en pantallas anchas y menú desplegable en celulares. */
@Component({
  selector: 'app-panel-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Campana],
  templateUrl: './panel-shell.html',
  styleUrl: './panel-shell.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PanelShell {
  protected readonly auth = inject(AuthService);
  protected readonly menuAbierto = signal(false);

  private readonly rol = computed(() => this.auth.session()?.rol ?? null);

  protected readonly items = computed<readonly ItemMenu[]>(() => menuDe(this.rol()));

  protected readonly rolEtiqueta = computed(() => {
    const rol = this.rol();
    return esRolDelPanel(rol) ? ETIQUETA_ROL[rol] : '';
  });

  protected readonly correo = computed(() => this.auth.session()?.correo ?? '');
  protected readonly iniciales = computed(() => this.correo().slice(0, 2).toUpperCase());

  protected alternarMenu(): void {
    this.menuAbierto.update((abierto) => !abierto);
  }

  protected cerrarMenu(): void {
    this.menuAbierto.set(false);
  }
}
