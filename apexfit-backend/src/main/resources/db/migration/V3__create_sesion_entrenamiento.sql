-- Módulo de Sesiones de Entrenamiento: registra el avance diario de cada cliente ejercicio por ejercicio.

CREATE TABLE sesion_entrenamiento (
    id_sesion      BIGINT AUTO_INCREMENT PRIMARY KEY,
    id_usuario     INT       NOT NULL,
    id_rutina      INT       NOT NULL,
    fecha          DATE      NOT NULL,
    terminada      BOOLEAN   NOT NULL DEFAULT FALSE,
    CONSTRAINT fk_sesion_usuario FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario),
    CONSTRAINT fk_sesion_rutina  FOREIGN KEY (id_rutina)  REFERENCES rutina(id_rutina),
    CONSTRAINT uq_sesion_usuario_fecha UNIQUE (id_usuario, fecha)
);

CREATE TABLE sesion_ejercicio (
    id_sesion_ejercicio  BIGINT AUTO_INCREMENT PRIMARY KEY,
    id_sesion            BIGINT NOT NULL,
    id_rutina_ejercicio  INT    NOT NULL,
    estado               ENUM('completado', 'aplazado', 'pendiente') NOT NULL DEFAULT 'pendiente',
    completado_en        DATETIME NULL,
    CONSTRAINT fk_se_sesion           FOREIGN KEY (id_sesion)           REFERENCES sesion_entrenamiento(id_sesion),
    CONSTRAINT fk_se_rutina_ejercicio FOREIGN KEY (id_rutina_ejercicio) REFERENCES rutina_ejercicio(id_rutina_ejercicio),
    CONSTRAINT uq_sesion_rutina_ej    UNIQUE (id_sesion, id_rutina_ejercicio)
);
