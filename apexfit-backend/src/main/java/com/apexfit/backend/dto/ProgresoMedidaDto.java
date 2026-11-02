package com.apexfit.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.math.BigDecimal;

@Data
public class ProgresoMedidaDto {
    private Integer idMedida;
    private Integer idProgreso;

    @NotBlank(message = "El tipo de medida es obligatorio")
    private String tipoMedida;

    @NotNull(message = "El valor es obligatorio")
    private BigDecimal valorCm;
}
