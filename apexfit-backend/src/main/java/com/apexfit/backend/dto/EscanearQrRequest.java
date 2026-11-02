package com.apexfit.backend.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class EscanearQrRequest {

    @NotBlank(message = "El contenido del código QR es obligatorio")
    private String qrData;
}
