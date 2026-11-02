# 🏋️ ApexFit API — Documentación de la API REST

> **Entrega 3 (Semana 8) — Control de Acceso Basado en Roles (RBAC), Autenticación JWT y Tests Automatizados**  
> **Tecnologías:** Spring Boot · Spring Security · JWT (io.jsonwebtoken) · MySQL (AWS RDS / Local) · Postman / Newman

---

## 📌 1. Visión General de la API

La API REST de **ApexFit** proporciona servicios completos para la gestión de un centro de entrenamiento deportivo y acondicionamiento físico. Implementa seguridad basada en tokens **JWT (JSON Web Token)** de carácter **Stateless** (`SessionCreationPolicy.STATELESS`), junto con **RBAC (Role-Based Access Control)** aplicado en controladores mediante `@PreAuthorize`.

### URL Base del Servidor
- **Ambiente Local:** `http://localhost:8080/api/v1`
- **Ambiente AWS Cloud:** `http://<ec2-ip-o-dominio>:8080/api/v1`

---

## 🔐 2. Modelo de Seguridad y Roles (RBAC)

El sistema soporta 3 roles de usuario:
1. `ROLE_ADMINISTRADOR`: Control total de usuarios, membresías, auditoría de asistencias y asignaciones.
2. `ROLE_ENTRENADOR`: Gestión de ejercicios, creación de rutinas deportivas, emisión de alertas y seguimiento a clientes asignados.
3. `ROLE_CLIENTE`: Acceso a sus rutinas, registro de asistencia (código QR), registro de métricas de progreso físico y buzón de alertas.

### Autenticación Bearer Token
Todas las peticiones a endpoints protegidos deben incluir la cabecera:
```http
Authorization: Bearer <tu_token_jwt>
Content-Type: application/json
```

---

## 📚 3. Catálogo Completo de Endpoints

### 🔐 3.1. Autenticación (`/api/v1/auth`) — *Públicos*

| Método | Endpoint | Roles | Descripción | Request Body |
|---|---|---|---|---|
| `POST` | `/api/v1/auth/register` | Público | Registro de nuevos usuarios | `nombre, apellido, correo, contrasena, rol, telefono` |
| `POST` | `/api/v1/auth/login` | Público | Inicio de sesión y obtención de JWT | `correo, contrasena` |
| `POST` | `/api/v1/auth/solicitar-recuperacion` | Público | Solicitar token temporal de recuperación de contraseña (15 min) | `correo` |
| `POST` | `/api/v1/auth/resetear-password` | Público | Restablecer contraseña utilizando el token temporal | `token, nuevaContrasena` |

#### Ejemplo de Login:
```json
// POST /api/v1/auth/login
{
  "correo": "admin@apexfit.com",
  "contrasena": "admin123"
}
```
**Respuesta exitosa (`200 OK`):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiJ9...",
  "type": "Bearer",
  "idUsuario": 1,
  "correo": "admin@apexfit.com",
  "roles": ["ROLE_ADMINISTRADOR"]
}
```

---

### 👤 3.2. Gestión de Usuarios y Perfil (`/api/v1/usuarios`)

| Método | Endpoint | Roles Permitidos | Descripción |
|---|---|---|---|
| `GET` | `/api/v1/usuarios` | `ADMINISTRADOR`, `ENTRENADOR` | Listar usuarios con paginación (`?page=0&size=10`) |
| `GET` | `/api/v1/usuarios/{id}` | `ADMINISTRADOR`, `ENTRENADOR`, `CLIENTE` | Obtener detalle de usuario por ID |
| `GET` | `/api/v1/usuarios/buscar` | `ADMINISTRADOR`, `ENTRENADOR` | Buscar usuario por correo (`?correo=...`) |
| `GET` | `/api/v1/usuarios/perfil` | `Autenticado` (Cualquier rol) | Obtener información del usuario en sesión |
| `POST` | `/api/v1/usuarios` | `ADMINISTRADOR` | Crear nuevo usuario directamente |
| `PUT` | `/api/v1/usuarios/{id}` | `ADMINISTRADOR`, `ENTRENADOR`, `CLIENTE` | Actualizar datos del usuario |
| `PUT` | `/api/v1/usuarios/cambiar-password` | `Autenticado` (Cualquier rol) | Cambiar contraseña validando la anterior |
| `DELETE` | `/api/v1/usuarios/{id}` | `ADMINISTRADOR` | Borrado lógico (estado: `inactivo`) |

---

### 🏋️ 3.3. Catálogo de Ejercicios (`/api/v1/ejercicios`)

| Método | Endpoint | Roles Permitidos | Descripción |
|---|---|---|---|
| `GET` | `/api/v1/ejercicios` | `CLIENTE`, `ENTRENADOR`, `ADMINISTRADOR` | Listar ejercicios paginados |
| `GET` | `/api/v1/ejercicios/{id}` | `CLIENTE`, `ENTRENADOR`, `ADMINISTRADOR` | Detalle de un ejercicio |
| `GET` | `/api/v1/ejercicios/filtrar` | `CLIENTE`, `ENTRENADOR`, `ADMINISTRADOR` | Filtrar por grupo muscular (`?grupoMuscular=Pecho`) |
| `GET` | `/api/v1/ejercicios/dificultad` | `CLIENTE`, `ENTRENADOR`, `ADMINISTRADOR` | Filtrar por dificultad (`?nivelDificultad=intermedio`) |
| `POST` | `/api/v1/ejercicios` | `ENTRENADOR`, `ADMINISTRADOR` | Registrar nuevo ejercicio |
| `PUT` | `/api/v1/ejercicios/{id}` | `ENTRENADOR`, `ADMINISTRADOR` | Actualizar ejercicio existente |
| `DELETE` | `/api/v1/ejercicios/{id}` | `ENTRENADOR`, `ADMINISTRADOR` | Eliminar ejercicio |

---

### 📋 3.4. Rutinas de Entrenamiento (`/api/v1/rutinas`)

| Método | Endpoint | Roles Permitidos | Descripción |
|---|---|---|---|
| `GET` | `/api/v1/rutinas` | `ENTRENADOR`, `ADMINISTRADOR` | Listar todas las rutinas paginadas |
| `GET` | `/api/v1/rutinas/{id}` | `CLIENTE`, `ENTRENADOR`, `ADMINISTRADOR` | Detalle de una rutina |
| `GET` | `/api/v1/rutinas/cliente/{idCliente}` | `CLIENTE`, `ENTRENADOR`, `ADMINISTRADOR` | Consultar rutinas asignadas a un cliente |
| `POST` | `/api/v1/rutinas` | `ENTRENADOR`, `ADMINISTRADOR` | Crear y asignar rutina deportiva |
| `PUT` | `/api/v1/rutinas/{id}` | `ENTRENADOR`, `ADMINISTRADOR` | Modificar rutina |
| `DELETE` | `/api/v1/rutinas/{id}` | `ENTRENADOR`, `ADMINISTRADOR` | Eliminar rutina |

---

### 🔗 3.5. Ejercicios en Rutina (`/api/v1/rutina-ejercicios`)

| Método | Endpoint | Roles Permitidos | Descripción |
|---|---|---|---|
| `GET` | `/api/v1/rutina-ejercicios` | `ENTRENADOR`, `ADMINISTRADOR` | Listar asociaciones globales |
| `GET` | `/api/v1/rutina-ejercicios/{id}` | `CLIENTE`, `ENTRENADOR`, `ADMINISTRADOR` | Detalle de ejercicio en rutina |
| `GET` | `/api/v1/rutina-ejercicios/rutina/{idRutina}` | `CLIENTE`, `ENTRENADOR`, `ADMINISTRADOR` | Ejercicios de una rutina específica |
| `POST` | `/api/v1/rutina-ejercicios` | `ENTRENADOR`, `ADMINISTRADOR` | Asociar ejercicio con series, repeticiones y descanso |
| `PUT` | `/api/v1/rutina-ejercicios/{id}` | `ENTRENADOR`, `ADMINISTRADOR` | Actualizar series / repeticiones |
| `DELETE` | `/api/v1/rutina-ejercicios/{id}` | `ENTRENADOR`, `ADMINISTRADOR` | Desvincular ejercicio de la rutina |

---

### 📊 3.6. Seguimiento de Progreso (`/api/v1/progresos`)

| Método | Endpoint | Roles Permitidos | Descripción |
|---|---|---|---|
| `GET` | `/api/v1/progresos` | `ENTRENADOR`, `ADMINISTRADOR` | Listar progresos generales |
| `GET` | `/api/v1/progresos/{id}` | `CLIENTE`, `ENTRENADOR`, `ADMINISTRADOR` | Detalle de medición |
| `GET` | `/api/v1/progresos/usuario/{idUsuario}` | `CLIENTE`, `ENTRENADOR`, `ADMINISTRADOR` | Historial cronológico de un usuario |
| `POST` | `/api/v1/progresos` | `CLIENTE`, `ENTRENADOR`, `ADMINISTRADOR` | Registrar medición (peso, altura, IMC) |
| `PUT` | `/api/v1/progresos/{id}` | `CLIENTE`, `ENTRENADOR`, `ADMINISTRADOR` | Actualizar medición |
| `DELETE` | `/api/v1/progresos/{id}` | `ENTRENADOR`, `ADMINISTRADOR` | Eliminar medición |

---

### 📏 3.7. Medidas Corporales (`/api/v1/progresos-medidas`)

| Método | Endpoint | Roles Permitidos | Descripción |
|---|---|---|---|
| `GET` | `/api/v1/progresos-medidas` | `ENTRENADOR`, `ADMINISTRADOR` | Listar todas las medidas |
| `GET` | `/api/v1/progresos-medidas/{id}` | `CLIENTE`, `ENTRENADOR`, `ADMINISTRADOR` | Detalle de una medida anatómica |
| `GET` | `/api/v1/progresos-medidas/progreso/{idProgreso}` | `CLIENTE`, `ENTRENADOR`, `ADMINISTRADOR` | Medidas de un progreso específico |
| `POST` | `/api/v1/progresos-medidas` | `CLIENTE`, `ENTRENADOR`, `ADMINISTRADOR` | Registrar medida (brazo, cintura, etc.) |
| `PUT` | `/api/v1/progresos-medidas/{id}` | `CLIENTE`, `ENTRENADOR`, `ADMINISTRADOR` | Actualizar medida |
| `DELETE` | `/api/v1/progresos-medidas/{id}` | `ENTRENADOR`, `ADMINISTRADOR` | Eliminar medida |

---

### 💳 3.8. Membresías y Suscripciones (`/api/v1/membresias`)

| Método | Endpoint | Roles Permitidos | Descripción |
|---|---|---|---|
| `GET` | `/api/v1/membresias` | `ADMINISTRADOR` | Listado completo de membresías |
| `GET` | `/api/v1/membresias/{id}` | `CLIENTE`, `ADMINISTRADOR` | Detalle de membresía |
| `GET` | `/api/v1/membresias/usuario/{idUsuario}` | `CLIENTE`, `ADMINISTRADOR` | Estado de suscripción del cliente |
| `POST` | `/api/v1/membresias` | `ADMINISTRADOR` | Crear/renovar suscripción |
| `PUT` | `/api/v1/membresias/{id}` | `ADMINISTRADOR` | Modificar suscripción |
| `DELETE` | `/api/v1/membresias/{id}` | `ADMINISTRADOR` | Cancelar membresía |

---

### ⏱️ 3.9. Asistencias al Gimnasio (`/api/v1/asistencias`)

| Método | Endpoint | Roles Permitidos | Descripción |
|---|---|---|---|
| `GET` | `/api/v1/asistencias` | `ADMINISTRADOR` | Auditoría de asistencias del gimnasio |
| `GET` | `/api/v1/asistencias/{id}` | `CLIENTE`, `ADMINISTRADOR` | Detalle de un registro de ingreso |
| `GET` | `/api/v1/asistencias/usuario/{idUsuario}` | `CLIENTE`, `ADMINISTRADOR` | Historial de asistencias de un cliente |
| `POST` | `/api/v1/asistencias` | `CLIENTE`, `ADMINISTRADOR` | Marcar asistencia (código QR / entrada) |
| `PUT` | `/api/v1/asistencias/{id}` | `ADMINISTRADOR` | Modificar asistencia |
| `DELETE` | `/api/v1/asistencias/{id}` | `ADMINISTRADOR` | Eliminar asistencia |

---

### 🔔 3.10. Alertas y Notificaciones (`/api/v1/alertas`)

| Método | Endpoint | Roles Permitidos | Descripción |
|---|---|---|---|
| `GET` | `/api/v1/alertas` | `ENTRENADOR`, `ADMINISTRADOR` | Listar todas las alertas |
| `GET` | `/api/v1/alertas/{id}` | `CLIENTE`, `ENTRENADOR`, `ADMINISTRADOR` | Detalle de alerta |
| `GET` | `/api/v1/alertas/usuario/{idUsuario}` | `CLIENTE`, `ENTRENADOR`, `ADMINISTRADOR` | Buzón de alertas del usuario |
| `POST` | `/api/v1/alertas` | `ENTRENADOR`, `ADMINISTRADOR` | Enviar alerta (inactividad, progreso, etc.) |
| `PUT` | `/api/v1/alertas/{id}` | `ENTRENADOR`, `ADMINISTRADOR` | Actualizar estado de alerta |
| `DELETE` | `/api/v1/alertas/{id}` | `ADMINISTRADOR` | Eliminar alerta |

---

### 🤝 3.11. Asignación Entrenador-Cliente (`/api/v1/entrenador-cliente`)

| Método | Endpoint | Roles Permitidos | Descripción |
|---|---|---|---|
| `GET` | `/api/v1/entrenador-cliente` | `ADMINISTRADOR` | Listar todas las asignaciones |
| `GET` | `/api/v1/entrenador-cliente/{id}` | `ADMINISTRADOR`, `ENTRENADOR`, `CLIENTE` | Detalle de asignación |
| `GET` | `/api/v1/entrenador-cliente/entrenador/{id}` | `ADMINISTRADOR`, `ENTRENADOR` | Listar clientes asignados a un entrenador |
| `GET` | `/api/v1/entrenador-cliente/cliente/{id}` | `ADMINISTRADOR`, `ENTRENADOR`, `CLIENTE` | Entrenador asignado a un cliente |
| `POST` | `/api/v1/entrenador-cliente` | `ADMINISTRADOR` | Asignar cliente a preparador físico |
| `PUT` | `/api/v1/entrenador-cliente/{id}` | `ADMINISTRADOR` | Modificar asignación |
| `DELETE` | `/api/v1/entrenador-cliente/{id}` | `ADMINISTRADOR` | Desvincular cliente |

---

### 💪 3.12. Sesiones de Entrenamiento (`/api/v1/sesiones-entrenamiento`)

Módulo de seguimiento del avance diario de entrenamiento. Permite al cliente registrar qué ejercicios completó, aplazó o dejó pendiente de su rutina asignada. El ID del usuario se obtiene automáticamente del token JWT, nunca del cuerpo de la petición.

| Método | Endpoint | Roles Permitidos | Descripción |
|---|---|---|---|
| `PUT` | `/api/v1/sesiones-entrenamiento/hoy` | `CLIENTE` | Guardar (upsert) el avance del día del cliente autenticado |
| `GET` | `/api/v1/sesiones-entrenamiento/hoy` | `CLIENTE` | Consultar el avance de hoy (para retomarlo en otro dispositivo) |
| `GET` | `/api/v1/sesiones-entrenamiento/usuario/{idCliente}?desde=&hasta=` | `CLIENTE`, `ENTRENADOR`, `ADMINISTRADOR` | Historial de sesiones en un rango de fechas |

#### Reglas de negocio:
- **Upsert:** Si ya existe una sesión para el usuario en la fecha actual, se actualiza; si no, se crea una nueva. Restricción `UNIQUE(id_usuario, fecha)`.
- **Validación de pertenencia:** Un `idRutinaEjercicio` que no pertenezca a la rutina indicada genera error `400 Bad Request`. Si la rutina no pertenece al cliente autenticado, se retorna `403 Forbidden`.
- **Historial con RBAC:** Un `CLIENTE` solo puede consultar su propio historial. Un `ENTRENADOR` solo puede ver el de sus clientes asignados (vía `entrenador_cliente`). El `ADMINISTRADOR` puede consultar cualquiera.

#### Ejemplo — PUT `/api/v1/sesiones-entrenamiento/hoy` (Guardar avance):
```json
// Request
{
  "idRutina": 5,
  "terminada": false,
  "ejercicios": [
    { "idRutinaEjercicio": 12, "estado": "completado" },
    { "idRutinaEjercicio": 13, "estado": "aplazado" },
    { "idRutinaEjercicio": 14, "estado": "pendiente" }
  ]
}
```

**Respuesta exitosa (`200 OK`):**
```json
{
  "idSesion": 1,
  "fecha": "2026-10-22",
  "idRutina": 5,
  "terminada": false,
  "ejercicios": [
    { "idRutinaEjercicio": 12, "estado": "completado" },
    { "idRutinaEjercicio": 13, "estado": "aplazado" },
    { "idRutinaEjercicio": 14, "estado": "pendiente" }
  ]
}
```

#### Ejemplo — GET `/api/v1/sesiones-entrenamiento/usuario/9?desde=2026-10-01&hasta=2026-10-22` (Historial):
**Respuesta exitosa (`200 OK`):**
```json
[
  {
    "fecha": "2026-10-22",
    "idRutina": 5,
    "terminada": false,
    "completados": 1,
    "aplazados": 1,
    "total": 3
  },
  {
    "fecha": "2026-10-21",
    "idRutina": 5,
    "terminada": true,
    "completados": 3,
    "aplazados": 0,
    "total": 3
  }
]
```

---

## ⚠️ 4. Estructura de Respuestas de Error

Todas las excepciones son gestionadas centralmente por `GlobalExceptionHandler`:

### 4.1. Error 401 Unauthorized (Sin Token o Token Expirado)
```json
{
  "status": 401,
  "error": "Unauthorized",
  "message": "Error: No autorizado. Token ausente, invalido o expirado."
}
```

### 4.2. Error 403 Forbidden (Rol Insuficiente)
```json
{
  "timestamp": "2026-10-17T19:30:00.000+00:00",
  "status": 403,
  "error": "Forbidden",
  "message": "Acceso denegado: No tiene permisos suficientes para realizar esta acción.",
  "path": "/api/v1/usuarios"
}
```

### 4.3. Error 400 Bad Request (Fallo en Validaciones de Campos)
```json
{
  "correo": "El formato del correo es inválido",
  "contrasena": "La contraseña debe tener al menos 6 caracteres"
}
```

---

## 🧪 5. Documentación y Pruebas en Postman

- **Colección Postman JSON:** `postman/collections/ApexFit_JWT_Security.postman_collection.json`
- **Ambientes:**
  - Local: `postman/environments/ApexFit_Local.postman_environment.json`
  - AWS RDS: `postman/environments/ApexFit_AWS_RDS.postman_environment.json`
- **Scripts de prueba:** 47 aserciones automatizadas (`pm.test`) que evalúan códigos HTTP, tiempos de respuesta (< 1500 ms), estructuras de esquema JSON y control RBAC.
- **Ejecución vía CLI (Newman):**
  ```powershell
  .\run_postman_tests.ps1
  ```
