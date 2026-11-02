package com.apexfit.backend.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DiasInactividadRequest {

    @NotNull(message = "El número de días es obligatorio")
    @Min(value = 1, message = "Los días deben ser al menos 1")
    @Max(value = 365, message = "Los días no pueden superar 365")
    private Integer dias;
}

