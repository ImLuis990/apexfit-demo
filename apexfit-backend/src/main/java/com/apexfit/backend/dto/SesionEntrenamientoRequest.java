package com.apexfit.backend.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

/**
 * Request body para PUT /api/v1/sesiones-entrenamiento/hoy
 */
@Data
public class SesionEntrenamientoRequest {

    @NotNull(message = "El ID de la rutina es obligatorio")
    private Integer idRutina;

    @NotNull(message = "El campo terminada es obligatorio")
    private Boolean terminada;

    @Valid
    @NotNull(message = "La lista de ejercicios es obligatoria")
    private List<EjercicioAvance> ejercicios;

    @Data
    public static class EjercicioAvance {
        @NotNull(message = "El ID del rutina-ejercicio es obligatorio")
        private Integer idRutinaEjercicio;

        @NotNull(message = "El estado del ejercicio es obligatorio")
        private String estado; // completado | aplazado | pendiente
    }
}
