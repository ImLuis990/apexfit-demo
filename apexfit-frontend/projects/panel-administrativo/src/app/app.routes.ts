import { Routes } from '@angular/router';
import { MiCuenta, SessionCallback, accessGuard, rolGuard } from 'shared';
import { inicioGuard } from './inicio.guard';

export const routes: Routes = [
  // Aquí llega la sesión que entrega el login único (app de usuarios).
  { path: 'sesion', component: SessionCallback, title: 'Iniciando sesión · ApexFit Panel' },
  {
    // Todo el panel va dentro del "shell" (menú) y exige sesión de entrenador o administrador.
    path: '',
    canActivate: [accessGuard],
    canActivateChild: [accessGuard],
    loadComponent: () => import('./layout/panel-shell/panel-shell').then((m) => m.PanelShell),
    children: [
      { path: '', pathMatch: 'full', canActivate: [inicioGuard], children: [] },

      // ── Cualquier rol del panel ──
      { path: 'cuenta', component: MiCuenta, title: 'Mi cuenta · ApexFit Panel' },

      // ── Administrador ──
      {
        path: 'resumen',
        canActivate: [rolGuard('administrador')],
        loadComponent: () => import('./pages/resumen/resumen').then((m) => m.ResumenPagina),
        title: 'Resumen · ApexFit Panel',
      },
      {
        path: 'asistencia',
        canActivate: [rolGuard('administrador')],
        loadComponent: () => import('./pages/asistencia/asistencia').then((m) => m.AsistenciaPagina),
        title: 'Asistencia · ApexFit Panel',
      },
      {
        path: 'inactividad',
        canActivate: [rolGuard('administrador')],
        loadComponent: () => import('./pages/inactividad/inactividad').then((m) => m.InactividadPagina),
        title: 'Inactividad · ApexFit Panel',
      },
      {
        path: 'usuarios',
        canActivate: [rolGuard('administrador')],
        loadComponent: () => import('./pages/usuarios/usuarios').then((m) => m.Usuarios),
        title: 'Usuarios · ApexFit Panel',
      },
      {
        path: 'asignaciones',
        canActivate: [rolGuard('administrador')],
        loadComponent: () => import('./pages/asignaciones/asignaciones').then((m) => m.Asignaciones),
        title: 'Asignaciones · ApexFit Panel',
      },
      {
        path: 'membresias',
        canActivate: [rolGuard('administrador')],
        loadComponent: () => import('./pages/membresias/membresias').then((m) => m.Membresias),
        title: 'Membresías · ApexFit Panel',
      },

      // ── Administrador y entrenador ──
      {
        path: 'ejercicios',
        canActivate: [rolGuard('administrador', 'entrenador')],
        loadComponent: () => import('./pages/ejercicios/ejercicios').then((m) => m.Ejercicios),
        title: 'Ejercicios · ApexFit Panel',
      },

      // ── Entrenador ──
      {
        path: 'clientes',
        canActivate: [rolGuard('entrenador')],
        loadComponent: () => import('./pages/clientes/clientes').then((m) => m.Clientes),
        title: 'Mis clientes · ApexFit Panel',
      },
      {
        path: 'rutinas',
        canActivate: [rolGuard('entrenador')],
        loadComponent: () => import('./pages/nueva-rutina/nueva-rutina').then((m) => m.NuevaRutinaPagina),
        title: 'Nueva rutina · ApexFit Panel',
      },
      {
        path: 'mis-rutinas',
        canActivate: [rolGuard('entrenador')],
        loadComponent: () => import('./pages/mis-rutinas/mis-rutinas').then((m) => m.MisRutinas),
        title: 'Mis rutinas · ApexFit Panel',
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
