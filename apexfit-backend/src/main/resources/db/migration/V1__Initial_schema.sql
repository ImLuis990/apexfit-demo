CREATE TABLE rol (
    id_rol INT AUTO_INCREMENT PRIMARY KEY,
    nombre_rol VARCHAR(30) UNIQUE NOT NULL
);

CREATE TABLE usuario (
    id_usuario INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    correo VARCHAR(120) UNIQUE NOT NULL,
    contrasena_hash VARCHAR(255) NOT NULL,
    id_rol INT NOT NULL,
    telefono VARCHAR(20),
    fecha_nacimiento DATE,
    fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
    estado ENUM('activo', 'inactivo') NOT NULL DEFAULT 'activo',
    CONSTRAINT fk_usuario_rol FOREIGN KEY (id_rol) REFERENCES rol(id_rol)
);

CREATE TABLE membresia (
    id_membresia INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    tipo VARCHAR(50) NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    precio DECIMAL(10,2) NOT NULL,
    estado ENUM('activa', 'vencida', 'cancelada') NOT NULL DEFAULT 'activa',
    CONSTRAINT fk_membresia_usuario FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario)
);

CREATE TABLE entrenador_cliente (
    id_asignacion INT AUTO_INCREMENT PRIMARY KEY,
    id_entrenador INT NOT NULL,
    id_cliente INT NOT NULL,
    fecha_asignacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    estado ENUM('activa', 'inactiva') NOT NULL DEFAULT 'activa',
    CONSTRAINT fk_ec_entrenador FOREIGN KEY (id_entrenador) REFERENCES usuario(id_usuario),
    CONSTRAINT fk_ec_cliente FOREIGN KEY (id_cliente) REFERENCES usuario(id_usuario),
    CONSTRAINT uq_entrenador_cliente UNIQUE (id_entrenador, id_cliente, estado)
);

CREATE TABLE rutina (
    id_rutina INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    id_entrenador INT NOT NULL,
    id_cliente INT NOT NULL,
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    estado ENUM('activa', 'inactiva') NOT NULL DEFAULT 'activa',
    CONSTRAINT fk_rutina_entrenador FOREIGN KEY (id_entrenador) REFERENCES usuario(id_usuario),
    CONSTRAINT fk_rutina_cliente FOREIGN KEY (id_cliente) REFERENCES usuario(id_usuario)
);

CREATE TABLE ejercicio (
    id_ejercicio INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) UNIQUE NOT NULL,
    grupo_muscular VARCHAR(50),
    video_url VARCHAR(255),
    nivel_dificultad ENUM('principiante', 'intermedio', 'avanzado')
);

CREATE TABLE rutina_ejercicio (
    id_rutina_ejercicio INT AUTO_INCREMENT PRIMARY KEY,
    id_rutina INT NOT NULL,
    id_ejercicio INT NOT NULL,
    dia_semana ENUM('lunes','martes','miercoles','jueves','viernes','sabado','domingo'),
    series SMALLINT NOT NULL,
    repeticiones SMALLINT NOT NULL,
    descanso_seg SMALLINT,
    CONSTRAINT fk_re_rutina FOREIGN KEY (id_rutina) REFERENCES rutina(id_rutina),
    CONSTRAINT fk_re_ejercicio FOREIGN KEY (id_ejercicio) REFERENCES ejercicio(id_ejercicio)
);

CREATE TABLE asistencia (
    id_asistencia BIGINT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    fecha DATE NOT NULL,
    hora_entrada TIME NOT NULL,
    hora_salida TIME,
    metodo_registro ENUM('qr', 'manual') NOT NULL,
    CONSTRAINT fk_asistencia_usuario FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario)
);

CREATE TABLE alerta (
    id_alerta INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    tipo ENUM('inactividad', 'membresia_por_vencer') NOT NULL,
    mensaje VARCHAR(255) NOT NULL,
    fecha_generada DATETIME DEFAULT CURRENT_TIMESTAMP,
    estado ENUM('pendiente', 'resuelta') NOT NULL DEFAULT 'pendiente',
    CONSTRAINT fk_alerta_usuario FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario)
);

CREATE TABLE progreso (
    id_progreso INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    fecha DATE NOT NULL,
    peso DECIMAL(5,2) NOT NULL,
    altura DECIMAL(5,2),
    imc DECIMAL(5,2),
    observaciones TEXT,
    CONSTRAINT fk_progreso_usuario FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario)
);

CREATE TABLE progreso_medida (
    id_medida INT AUTO_INCREMENT PRIMARY KEY,
    id_progreso INT NOT NULL,
    tipo_medida VARCHAR(30) NOT NULL,
    valor_cm DECIMAL(5,2) NOT NULL,
    CONSTRAINT fk_pm_progreso FOREIGN KEY (id_progreso) REFERENCES progreso(id_progreso)
);

-- Insertar roles por defecto
INSERT INTO rol (nombre_rol) VALUES ('cliente'), ('entrenador'), ('administrador');
