package com.apexfit.backend.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class RutinaEjercicioDto {
    private Integer idRutinaEjercicio;

    @NotNull(message = "El id de la rutina es obligatorio")
    private Integer idRutina;

    @NotNull(message = "El id del ejercicio es obligatorio")
    private Integer idEjercicio;

    private String diaSemana;

    @NotNull(message = "Las series son obligatorias")
    private Short series;

    @NotNull(message = "Las repeticiones son obligatorias")
    private Short repeticiones;

    private Short descansoSeg;
}
