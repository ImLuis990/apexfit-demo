import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { map, Observable, tap } from 'rxjs';
import { LoginResponse, ROLES, Session, rolFromAuthorities } from './auth.models';
import { ExternalNavigator } from './external-navigator';
import { ALLOWED_ROLES, API_URL, LOGIN_URL } from './auth.tokens';

const STORAGE_KEY = 'apexfit.session';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly external = inject(ExternalNavigator);
  private readonly apiUrl = inject(API_URL);
  private readonly allowedRoles = inject(ALLOWED_ROLES);
  private readonly loginUrl = inject(LOGIN_URL);

  private readonly _session = signal<Session | null>(this.restore());

  readonly session = this._session.asReadonly();
  readonly isLoggedIn = computed(() => this._session() !== null);
  readonly token = computed(() => this._session()?.token ?? null);
  /** true si hay sesión Y el rol puede entrar a esta app. */
  readonly hasAccess = computed(() => {
    const session = this._session();
    return session !== null && this.allowedRoles.includes(session.rol);
  });

  /** true en apps que no tienen login propio (el panel): el login vive en otra app. */
  get usesExternalLogin(): boolean {
    return !!this.loginUrl;
  }

  /**
   * Inicia sesión contra el backend. Devuelve la sesión SIEMPRE, pero solo la guarda en
   * esta app si el rol puede entrar aquí; si no, quien llama decide (p. ej. traspasarla al panel).
   */
  login(correo: string, contrasena: string): Observable<Session> {
    return this.http
      .post<LoginResponse>(`${this.apiUrl}/auth/login`, { correo, contrasena })
      .pipe(
        map((res): Session => {
          const rol = rolFromAuthorities(res.roles);
          if (!rol) throw new Error('SIN_ROL');
          return { token: res.token, id: res.id, correo: res.correo, rol };
        }),
        tap((session) => {
          if (this.allowedRoles.includes(session.rol)) this.save(session);
        }),
      );
  }

  /** Recibe una sesión creada en otra app. Devuelve false si no sirve para ESTA app. */
  acceptSession(session: Session): boolean {
    const valid =
      ROLES.includes(session.rol) &&
      this.allowedRoles.includes(session.rol) &&
      !isExpired(session.token);
    if (valid) this.save(session);
    return valid;
  }

  /** Cierra la sesión y lleva al login. */
  logout(): void {
    this.clear();
    this.goToLogin();
  }

  /** Lleva al login: a la ruta interna '/login' o, si el login vive en otra app, a esa app. */
  goToLogin(motivo?: 'sin-acceso'): void {
    if (this.loginUrl) {
      this.external.go(motivo ? `${this.loginUrl}?motivo=${motivo}` : this.loginUrl);
      return;
    }
    if (motivo) {
      void this.router.navigate(['/login'], { queryParams: { motivo } });
    } else {
      void this.router.navigate(['/login']);
    }
  }

  /** Borra la sesión sin navegar. */
  clear(): void {
    this._session.set(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // almacenamiento no disponible: se ignora
    }
  }

  private save(session: Session): void {
    this._session.set(session);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } catch {
      // almacenamiento no disponible: la sesión vive solo en memoria
    }
  }

  private restore(): Session | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const session = JSON.parse(raw) as Session;
      if (!session?.token || !ROLES.includes(session.rol) || isExpired(session.token)) {
        localStorage.removeItem(STORAGE_KEY);
        return null;
      }
      return session;
    } catch {
      return null;
    }
  }
}

/** Lee el campo `exp` del JWT (sin verificar la firma; eso lo hace el backend). */
function isExpired(token: string): boolean {
  try {
    const payload = token.split('.')[1];
    const json = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    return typeof json.exp === 'number' && json.exp * 1000 <= Date.now();
  } catch {
    return true;
  }
}
