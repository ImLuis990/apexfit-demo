package com.apexfit.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificacionResponseDto {
    private Long idNotificacion;
    private String tipo;
    private String titulo;
    private String mensaje;
    private Integer referenciaId;
    private LocalDateTime creadaEn;
    private boolean leida;
}

