package com.apexfit.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class MembresiaDto {
    private Integer idMembresia;

    @NotNull(message = "El id de usuario es obligatorio")
    private Integer idUsuario;

    @NotBlank(message = "El tipo de membresía es obligatorio")
    private String tipo;

    @NotNull(message = "La fecha de inicio es obligatoria")
    private LocalDate fechaInicio;

    @NotNull(message = "La fecha de fin es obligatoria")
    private LocalDate fechaFin;

    @NotNull(message = "El precio es obligatorio")
    @Positive(message = "El precio debe ser positivo")
    private BigDecimal precio;

    private String estado;
}
