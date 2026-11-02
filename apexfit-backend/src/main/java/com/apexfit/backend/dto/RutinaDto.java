package com.apexfit.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;
import java.time.LocalDateTime;

@Data
public class RutinaDto {
    private Integer idRutina;
    
    @NotBlank(message = "El nombre de la rutina es obligatorio")
    @Size(max = 100)
    private String nombre;

    private String descripcion;

    @NotNull(message = "El ID del entrenador es obligatorio")
    private Integer idEntrenador;

    @NotNull(message = "El ID del cliente es obligatorio")
    private Integer idCliente;

    private LocalDateTime fechaCreacion;
    private String estado;
}
