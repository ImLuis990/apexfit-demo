package com.apexfit.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.time.LocalDateTime;

@Data
public class AlertaDto {
    private Integer idAlerta;

    @NotNull(message = "El id de usuario es obligatorio")
    private Integer idUsuario;

    @NotBlank(message = "El tipo de alerta es obligatorio")
    private String tipo;

    @NotBlank(message = "El mensaje es obligatorio")
    private String mensaje;

    private LocalDateTime fechaGenerada;
    private String estado;
}
