package com.apexfit.backend.dto.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class RecuperarPasswordRequest {

    @NotBlank(message = "El correo es obligatorio")
    @Email(message = "El formato del correo no es válido")
    private String correo;
}
