package com.apexfit.backend.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.Pattern;
import lombok.Data;
import java.time.LocalDate;

@Data
public class UsuarioDto {
    private Integer idUsuario;
    
    @NotBlank(message = "El nombre es obligatorio")
    @Size(max = 100)
    private String nombre;

    @NotBlank(message = "El apellido es obligatorio")
    @Size(max = 100)
    private String apellido;

    @NotBlank(message = "El correo es obligatorio")
    @Email(message = "Debe ser un correo válido")
    @Size(max = 120)
    private String correo;

    @NotNull(message = "El rol es obligatorio")
    private Integer idRol;

    @Pattern(regexp = "^[0-9]{7,15}$", message = "El teléfono debe tener entre 7 y 15 dígitos")
    private String telefono;
    private LocalDate fechaNacimiento;
    private String estado;
}
