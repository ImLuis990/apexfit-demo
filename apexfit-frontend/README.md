# ApexFit — Frontend

ApexFit es un sistema web de gestión para gimnasios. Este repositorio es el **frontend** (Angular 22): un workspace con dos aplicaciones y una librería compartida.

| Proyecto | Para quién | Puerto |
|---|---|---|
| `app-usuarios` | Clientes: Hoy, Rutina, Mi QR, Progreso y Asistencia. Aquí vive el **login único** y el registro. | 4200 |
| `panel-administrativo` | Administrador y entrenador: Resumen, Asistencia, Inactividad, Usuarios, Membresías, Asignaciones, Ejercicios, Mis clientes y Nueva rutina. | 4201 |
| `shared` | Librería interna: sesión, guards, interceptor JWT y tema visual. | — |

Quien inicia sesión como cliente entra a `app-usuarios`; el entrenador y el administrador son enviados al panel con su sesión.

## Instalación

Requisitos: **Node.js 24.15+** (o 22.22.3+) y npm.

```bash
npm ci
```

## Cómo correr cada app

Con el backend encendido (ver más abajo), en dos terminales:

```bash
npm run start:usuarios   # http://localhost:4200
npm run start:panel      # http://localhost:4201
```

## Pruebas

Se usa Vitest (con jsdom), no hace falta navegador:

```bash
npx ng test app-usuarios --watch=false
npx ng test panel-administrativo --watch=false
npx ng test shared --watch=false
```

## Compilar para producción

```bash
npx ng build app-usuarios --configuration production
npx ng build panel-administrativo --configuration production
```

El resultado queda en `dist/<proyecto>/browser`.

## Backend

Las apps hablan con la API REST de [apexfit-backend](https://github.com/josedavidortegabarrios9-code/apexfit-backend.git) (Spring Boot + JWT, MySQL en AWS RDS). En desarrollo, `proxy.conf.json` redirige `/api` a `http://localhost:8080`, y las apps usan la ruta `/api/v1`. Para levantar el backend, sigue el README de ese repositorio.

## Usuarios de prueba

Cuentas para probar los tres roles. Son solo para desarrollo y pruebas.

**Cuentas de prueba (contraseña `Prueba123`)**

| Rol | Correo |
| --- | --- |
| Administrador | `administrador@apexfit.test` |
| Entrenador | `entrenador@apexfit.test` |
| Cliente | `cliente@apexfit.test` |

**Cuentas del backend**

| Rol | Correo | Contraseña |
| --- | --- | --- |
| Administrador | `admin@apexfit.com` | `admin123` |
| Entrenador | `pedro.entrenador@apexfit.com` | `entrenador123` |
| Cliente | `carlos@apexfit.com` | `12345` |

**Código QR de ejemplo** (para pegarlo en Asistencia como administrador):

```
APEXFIT-USER-9-cliente@apexfit.test
```

## Integración continua

El workflow `.github/workflows/frontend-ci-cd.yml` instala, corre las pruebas de los tres proyectos y compila las dos apps en cada push y pull request. El despliegue a AWS está preparado pero desactivado, a la espera de la infraestructura.

## Despliegue

- URL de la aplicación de usuarios: _pendiente_
- URL del panel administrativo: _pendiente_