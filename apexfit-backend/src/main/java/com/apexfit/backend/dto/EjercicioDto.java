package com.apexfit.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class EjercicioDto {
    private Integer idEjercicio;
    
    @NotBlank(message = "El nombre del ejercicio es obligatorio")
    @Size(max = 100)
    private String nombre;

    @Size(max = 50)
    private String grupoMuscular;

    @Size(max = 255)
    private String videoUrl;

    private String nivelDificultad;
}
