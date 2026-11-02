package com.apexfit.backend.controller;

import com.apexfit.backend.dto.auth.JwtResponse;
import com.apexfit.backend.dto.auth.LoginRequest;
import com.apexfit.backend.dto.auth.RegisterRequest;
import com.apexfit.backend.entity.Rol;
import com.apexfit.backend.entity.Usuario;
import com.apexfit.backend.repository.RolRepository;
import com.apexfit.backend.repository.UsuarioRepository;
import com.apexfit.backend.security.jwt.JwtUtils;
import com.apexfit.backend.security.services.UserDetailsImpl;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import com.apexfit.backend.dto.auth.RecuperarPasswordRequest;
import com.apexfit.backend.dto.auth.ResetearPasswordRequest;
import org.springframework.http.HttpStatus;
import java.util.Optional;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    @Autowired
    AuthenticationManager authenticationManager;

    @Autowired
    UsuarioRepository usuarioRepository;

    @Autowired
    RolRepository rolRepository;

    @Autowired
    PasswordEncoder encoder;

    @Autowired
    JwtUtils jwtUtils;

    // ─── LOGIN ────────────────────────────────────────────────────────────────
    @PostMapping("/login")
    public ResponseEntity<?> authenticateUser(@Valid @RequestBody LoginRequest loginRequest) {

        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(loginRequest.getCorreo(), loginRequest.getContrasena()));

        SecurityContextHolder.getContext().setAuthentication(authentication);
        String jwt = jwtUtils.generateJwtToken(authentication);

        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        List<String> roles = userDetails.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .collect(Collectors.toList());

        return ResponseEntity.ok(new JwtResponse(jwt, userDetails.getIdUsuario(), userDetails.getUsername(), roles));
    }

    // ─── REGISTRO ─────────────────────────────────────────────────────────────
    @PostMapping("/register")
    public ResponseEntity<?> registerUser(@Valid @RequestBody RegisterRequest registerRequest) {

        // Validar correo único
        if (usuarioRepository.findByCorreo(registerRequest.getCorreo()).isPresent()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("mensaje", "Error: El correo ya está en uso."));
        }

        // Determinar rol (por defecto "cliente")
        String rolNombre = (registerRequest.getRol() != null) ? registerRequest.getRol().toLowerCase() : "cliente";
        Rol rol = rolRepository.findByNombreRol(rolNombre)
                .orElseThrow(() -> new RuntimeException("Error: Rol '" + rolNombre + "' no encontrado."));

        // Crear nuevo usuario con contraseña encriptada
        Usuario usuario = new Usuario();
        usuario.setNombre(registerRequest.getNombre());
        usuario.setApellido(registerRequest.getApellido());
        usuario.setCorreo(registerRequest.getCorreo());
        usuario.setContrasenaHash(encoder.encode(registerRequest.getContrasena()));
        usuario.setRol(rol);
        usuario.setTelefono(registerRequest.getTelefono());

        usuarioRepository.save(usuario);

        return ResponseEntity.ok(Map.of("mensaje", "Usuario registrado exitosamente."));
    }

    // ─── SOLICITAR RECUPERACIÓN DE CONTRASEÑA ──────────────────────────────
    @PostMapping("/solicitar-recuperacion")
    public ResponseEntity<?> solicitarRecuperacion(@Valid @RequestBody RecuperarPasswordRequest request) {
        Optional<Usuario> usuarioOpt = usuarioRepository.findByCorreo(request.getCorreo());

        if (usuarioOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("mensaje", "No existe ningún usuario registrado con el correo proporcionado."));
        }

        Usuario usuario = usuarioOpt.get();
        if ("inactivo".equalsIgnoreCase(usuario.getEstado())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("mensaje", "La cuenta se encuentra inactiva. Contacte al administrador."));
        }

        String tokenRecuperacion = jwtUtils.generatePasswordResetToken(usuario.getCorreo());

        return ResponseEntity.ok(Map.of(
                "mensaje", "Token de recuperación generado exitosamente. Válido por 15 minutos.",
                "correo", usuario.getCorreo(),
                "tokenRecuperacion", tokenRecuperacion,
                "expiraEnMinutos", 15
        ));
    }

    // ─── RESETEAR CONTRASEÑA ───────────────────────────────────────────────
    @PostMapping("/resetear-password")
    public ResponseEntity<?> resetearPassword(@Valid @RequestBody ResetearPasswordRequest request) {
        if (!jwtUtils.validatePasswordResetToken(request.getToken())) {
            return ResponseEntity.badRequest()
                    .body(Map.of("mensaje", "El token de recuperación es inválido o ha expirado."));
        }

        String correo = jwtUtils.getCorreoFromResetToken(request.getToken());
        Usuario usuario = usuarioRepository.findByCorreo(correo)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado con correo: " + correo));

        usuario.setContrasenaHash(encoder.encode(request.getNuevaContrasena()));
        usuarioRepository.save(usuario);

        return ResponseEntity.ok(Map.of(
                "mensaje", "Contraseña restablecida exitosamente. Ahora puedes iniciar sesión con tu nueva contraseña."
        ));
    }
}
