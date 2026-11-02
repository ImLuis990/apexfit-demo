package com.apexfit.backend.dto;

import lombok.Data;

import java.time.LocalDate;
import java.util.List;

/**
 * Response body para GET/PUT /api/v1/sesiones-entrenamiento/hoy
 */
@Data
public class SesionEntrenamientoResponse {

    private Long idSesion;
    private LocalDate fecha;
    private Integer idRutina;
    private Boolean terminada;
    private List<EjercicioDetalle> ejercicios;

    @Data
    public static class EjercicioDetalle {
        private Integer idRutinaEjercicio;
        private String estado;
    }
}
