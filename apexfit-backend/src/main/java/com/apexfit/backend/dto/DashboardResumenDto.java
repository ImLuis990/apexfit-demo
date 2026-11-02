package com.apexfit.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardResumenDto {
    private long totalUsuarios;
    private long totalClientesActivos;
    private long totalEntrenadores;
    private long totalAsistenciasHoy;
    private long totalMembresiasActivas;
    private long totalEjercicios;
    private long totalRutinas;
    private Map<String, Long> asistenciasPorMetodo;
}
