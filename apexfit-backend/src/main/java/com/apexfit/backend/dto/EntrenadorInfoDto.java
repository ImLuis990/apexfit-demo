package com.apexfit.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Datos del entrenador asignado al cliente autenticado.
 * Devuelto por GET /api/v1/mi-entrenador
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class EntrenadorInfoDto {
    private Integer idEntrenador;
    private String nombre;
    private String apellido;
    private String correo;
    private String telefono;
    private String estado;           // estado de la asignación
    private String fechaAsignacion;  // ISO-8601 string para simplicidad
}
