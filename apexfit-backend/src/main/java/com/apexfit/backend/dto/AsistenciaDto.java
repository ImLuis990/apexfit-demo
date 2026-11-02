package com.apexfit.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.time.LocalDate;
import java.time.LocalTime;

@Data
public class AsistenciaDto {
    private Long idAsistencia;

    @NotNull(message = "El id de usuario es obligatorio")
    private Integer idUsuario;

    @NotNull(message = "La fecha es obligatoria")
    private LocalDate fecha;

    @NotNull(message = "La hora de entrada es obligatoria")
    private LocalTime horaEntrada;

    private LocalTime horaSalida;

    @NotBlank(message = "El método de registro es obligatorio")
    private String metodoRegistro;
}
