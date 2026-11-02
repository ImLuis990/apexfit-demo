package com.apexfit.backend.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.time.LocalDateTime;

@Data
public class EntrenadorClienteDto {
    private Integer idAsignacion;

    @NotNull(message = "El id del entrenador es obligatorio")
    private Integer idEntrenador;

    @NotNull(message = "El id del cliente es obligatorio")
    private Integer idCliente;

    private LocalDateTime fechaAsignacion;
    private String estado;
}
