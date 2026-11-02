package com.apexfit.backend.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Data
public class ProgresoDto {
    private Integer idProgreso;

    @NotNull(message = "El id de usuario es obligatorio")
    private Integer idUsuario;

    @NotNull(message = "La fecha es obligatoria")
    private LocalDate fecha;

    @NotNull(message = "El peso es obligatorio")
    private BigDecimal peso;

    private BigDecimal altura;
    private BigDecimal imc;
    private String observaciones;
    private List<ProgresoMedidaDto> medidas;
}
