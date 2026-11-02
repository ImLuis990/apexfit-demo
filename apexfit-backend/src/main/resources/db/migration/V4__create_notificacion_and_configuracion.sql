-- Migración V4: Tabla configuracion y tabla notificacion

CREATE TABLE configuracion (
    clave VARCHAR(50) PRIMARY KEY,
    valor VARCHAR(255) NOT NULL
);

INSERT INTO configuracion (clave, valor) VALUES ('dias_inactividad', '10');

CREATE TABLE notificacion (
    id_notificacion BIGINT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    tipo VARCHAR(40) NOT NULL,
    titulo VARCHAR(100),
    mensaje VARCHAR(255),
    referencia_id INT NOT NULL DEFAULT 0,
    fecha_clave DATE NOT NULL,
    creada_en DATETIME DEFAULT CURRENT_TIMESTAMP,
    leida_en DATETIME NULL,
    CONSTRAINT fk_notif_usuario FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario),
    CONSTRAINT uq_notif UNIQUE (id_usuario, tipo, referencia_id, fecha_clave)
);

CREATE INDEX idx_notif_usuario ON notificacion (id_usuario, leida_en, creada_en DESC);

