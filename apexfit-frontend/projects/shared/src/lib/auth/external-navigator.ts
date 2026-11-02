import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';

/** Cambia de página completa (otra app). Existe como servicio para poder simularlo en pruebas. */
@Injectable({ providedIn: 'root' })
export class ExternalNavigator {
  private readonly document = inject(DOCUMENT);

  go(url: string): void {
    this.document.location.assign(url);
  }
}
