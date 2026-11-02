package com.apexfit.backend.dto.auth;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.List;

@Data
@AllArgsConstructor
public class JwtResponse {
    private String token;
    private String type = "Bearer";
    private Integer id;
    private Integer idUsuario;
    private String correo;
    private List<String> roles;

    public JwtResponse(String token, Integer id, String correo, List<String> roles) {
        this.token = token;
        this.id = id;
        this.idUsuario = id;
        this.correo = correo;
        this.roles = roles;
    }
}
