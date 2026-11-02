import { Routes } from '@angular/router';
import { Login, MiCuenta, accessGuard, guestGuard } from 'shared';

export const routes: Routes = [
  {
    path: 'login',
    component: Login,
    canActivate: [guestGuard],
    title: 'Iniciar sesión · ApexFit',
  },
  {
    path: 'registro',
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/registro/registro').then((m) => m.Registro),
    title: 'Crear cuenta · ApexFit',
  },
  {
    path: 'recuperar',
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/recuperar/recuperar').then((m) => m.Recuperar),
    title: 'Recuperar contraseña · ApexFit',
  },
  {
    // Todo lo del cliente va dentro del "shell" (barra inferior) y exige sesión.
    path: '',
    canActivate: [accessGuard],
    canActivateChild: [accessGuard],
    loadComponent: () =>
      import('./layout/cliente-shell/cliente-shell').then((m) => m.ClienteShell),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'hoy' },
      {
        path: 'hoy',
        loadComponent: () => import('./pages/hoy/hoy').then((m) => m.Hoy),
        title: 'Hoy · ApexFit',
      },
      {
        path: 'entrenar',
        loadComponent: () => import('./pages/entrenar/entrenar').then((m) => m.Entrenar),
        title: 'Rutina de hoy · ApexFit',
      },
      {
        path: 'rutina',
        loadComponent: () => import('./pages/rutina/rutina').then((m) => m.Rutina),
        title: 'Rutina · ApexFit',
      },
      {
        path: 'mi-qr',
        loadComponent: () => import('./pages/mi-qr/mi-qr').then((m) => m.MiQr),
        title: 'Mi QR · ApexFit',
      },
      {
        path: 'historial',
        loadComponent: () => import('./pages/historial/historial').then((m) => m.Historial),
        title: 'Asistencia · ApexFit',
      },
      { path: 'cuenta', component: MiCuenta, title: 'Mi cuenta · ApexFit' },
      {
        path: 'progreso',
        loadComponent: () => import('./pages/progreso/progreso').then((m) => m.Progreso),
        title: 'Progreso · ApexFit',
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
