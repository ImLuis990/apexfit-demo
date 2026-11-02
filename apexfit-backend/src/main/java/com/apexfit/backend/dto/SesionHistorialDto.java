package com.apexfit.backend.dto;

import lombok.Data;

import java.time.LocalDate;

/**
 * Response item para GET /api/v1/sesiones-entrenamiento/usuario/{id} (historial)
 */
@Data
public class SesionHistorialDto {

    private LocalDate fecha;
    private Integer idRutina;
    private Boolean terminada;
    private Long completados;
    private Long aplazados;
    private Long total;
}
