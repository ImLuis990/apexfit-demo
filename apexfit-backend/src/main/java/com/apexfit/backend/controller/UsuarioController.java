package com.apexfit.backend.controller;

import com.apexfit.backend.dto.UsuarioDto;
import com.apexfit.backend.service.UsuarioService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/usuarios")
@RequiredArgsConstructor
public class UsuarioController {

    private final UsuarioService usuarioService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMINISTRADOR', 'ENTRENADOR')")
    public ResponseEntity<Page<UsuarioDto>> getAllUsuarios(Pageable pageable) {
        return ResponseEntity.ok(usuarioService.getAllUsuarios(pageable));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR', 'ENTRENADOR', 'CLIENTE')")
    public ResponseEntity<UsuarioDto> getUsuarioById(@PathVariable Integer id) {
        return ResponseEntity.ok(usuarioService.getUsuarioById(id));
    }

    @GetMapping("/buscar")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR', 'ENTRENADOR')")
    public ResponseEntity<UsuarioDto> getUsuarioByCorreo(@RequestParam String correo) {
        return ResponseEntity.ok(usuarioService.getUsuarioByCorreo(correo));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    public ResponseEntity<UsuarioDto> createUsuario(@Valid @RequestBody UsuarioDto usuarioDto) {
        return new ResponseEntity<>(usuarioService.createUsuario(usuarioDto), HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR', 'ENTRENADOR', 'CLIENTE')")
    public ResponseEntity<UsuarioDto> updateUsuario(@PathVariable Integer id, @Valid @RequestBody UsuarioDto usuarioDto) {
        return ResponseEntity.ok(usuarioService.updateUsuario(id, usuarioDto));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    public ResponseEntity<Void> deleteUsuario(@PathVariable Integer id) {
        usuarioService.deleteUsuario(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/perfil")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<UsuarioDto> getPerfil(org.springframework.security.core.Authentication authentication) {
        String correo = authentication.getName();
        return ResponseEntity.ok(usuarioService.getUsuarioByCorreo(correo));
    }

    @PutMapping("/cambiar-password")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<java.util.Map<String, String>> cambiarPassword(
            @Valid @RequestBody com.apexfit.backend.dto.ChangePasswordDto request,
            org.springframework.security.core.Authentication authentication) {
        String correo = authentication.getName();
        usuarioService.changePassword(correo, request.getContrasenaActual(), request.getNuevaContrasena());
        return ResponseEntity.ok(java.util.Map.of("mensaje", "Contraseña actualizada exitosamente."));
    }
}
