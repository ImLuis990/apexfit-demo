# ApexFit - Backend

Backend en Spring Boot para el sistema de gestión de gimnasios ApexFit.

## Requisitos
- Java 17
- MySQL Server (Local o AWS RDS)

## Configuración y Ejecución

El proyecto utiliza variables de entorno para conectarse a la base de datos.
Por defecto, usa el perfil `dev` (`application-dev.yml`) que apunta a localhost.

### 1. Base de datos local
Asegúrate de tener un servidor MySQL corriendo localmente.
Crea una base de datos vacía llamada `apexfit`. (Flyway se encargará de crear las tablas).

### 2. Variables de entorno (Opcional si usas root/root)
Si tu MySQL local tiene un usuario/contraseña distinto a root/root, configura estas variables antes de iniciar:
- `DB_USER`
- `DB_PASS`
- `DB_NAME` (por defecto `apexfit`)

### 3. Ejecutar el proyecto
No necesitas instalar Maven, el proyecto incluye el wrapper `mvnw`.
Ejecuta en la terminal (estando dentro de la carpeta `backend`):
```bash
./mvnw spring-boot:run
```

## Documentación de la API (Endpoints y Seguridad RBAC)
El proyecto cuenta con documentación detallada de todos los endpoints, esquemas de petición y respuestas:
- 📘 **Explicación Completa del Backend:** Ver [`DOCUMENTACION_BACKEND.md`](DOCUMENTACION_BACKEND.md) para el desglose detallado de arquitectura, servicios, lógica de negocio y base de datos.
- 📖 **Documentación de la API (Markdown):** Ver [`DOCUMENTACION_API.md`](DOCUMENTACION_API.md).

### Módulos y Controladores Disponibles (12 controladores):
- `POST /api/v1/auth/login`, `POST /api/v1/auth/register` (Autenticación JWT)
- `/api/v1/usuarios` (CRUD, búsqueda por correo, `/perfil`, `/cambiar-password`)
- `/api/v1/ejercicios` (CRUD, filtros por grupo muscular y dificultad)
- `/api/v1/rutinas` (CRUD, rutinas por cliente)
- `/api/v1/rutina-ejercicios` (Asociación series/repeticiones)
- `/api/v1/sesiones-entrenamiento` (Avance diario, upsert de hoy, historial por cliente)
- `/api/v1/progresos` (Métricas físicas, peso, altura, IMC)
- `/api/v1/progresos-medidas` (Medidas corporales individuales)
- `/api/v1/membresias` (CRUD y estado de suscripción)
- `/api/v1/asistencias` (Registro con QR y auditoría)
- `/api/v1/alertas` (Alertas preventivas y notificaciones)
- `/api/v1/entrenador-cliente` (Vinculación asesor-cliente)

## Despliegue con AWS RDS (Perfil Producción)
Para conectarte a la base de datos de AWS, debes iniciar la aplicación con el perfil `prod` y configurar las variables de entorno de AWS RDS.

Variables requeridas para producción:
- `APP_PROFILE=prod`
- `RDS_HOSTNAME`
- `RDS_PORT`
- `RDS_DB_NAME`
- `RDS_USERNAME`
- `RDS_PASSWORD`

Ejecución:
```bash
$env:APP_PROFILE="prod"
$env:RDS_HOSTNAME="tu-db.xxxx.us-east-1.rds.amazonaws.com"
$env:RDS_USERNAME="admin"
$env:RDS_PASSWORD="password"
./mvnw spring-boot:run
```
