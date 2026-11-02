package com.apexfit.backend.controller;

import com.apexfit.backend.dto.chat.ChatRequestDto;
import com.apexfit.backend.dto.chat.ChatResponseDto;
import com.apexfit.backend.entity.Usuario;
import com.apexfit.backend.repository.UsuarioRepository;
import com.apexfit.backend.security.services.UserDetailsImpl;
import com.apexfit.backend.service.ClaudeService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Optional;

@RestController
@RequestMapping({"/api/chat", "/api/v1/chat"})
@PreAuthorize("hasAnyRole('CLIENTE', 'ENTRENADOR', 'ADMINISTRADOR')")
public class ChatController {

    private final ClaudeService claudeService;
    private final UsuarioRepository usuarioRepository;

    public ChatController(ClaudeService claudeService, UsuarioRepository usuarioRepository) {
        this.claudeService = claudeService;
        this.usuarioRepository = usuarioRepository;
    }

    @PostMapping
    public ResponseEntity<ChatResponseDto> chat(@Valid @RequestBody ChatRequestDto request) {
        String contextInfo = armarContextoUsuario();
        ChatResponseDto response = claudeService.generarRespuesta(request, contextInfo);
        return ResponseEntity.ok(response);
    }

    private String armarContextoUsuario() {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.getPrincipal() instanceof UserDetailsImpl userDetails) {
                Integer idUsuario = userDetails.getIdUsuario();
                if (idUsuario != null) {
                    Optional<Usuario> usuarioOpt = usuarioRepository.findById(idUsuario);
                    if (usuarioOpt.isPresent()) {
                        Usuario u = usuarioOpt.get();
                        String nombreCompleto = ((u.getNombre() != null ? u.getNombre() : "") + " " +
                                (u.getApellido() != null ? u.getApellido() : "")).trim();
                        String rol = (u.getRol() != null && u.getRol().getNombreRol() != null)
                                ? u.getRol().getNombreRol()
                                : "CLIENTE";
                        String estado = u.getEstado() != null ? u.getEstado() : "activo";

                        return String.format(
                                "- Nombre del usuario: %s\n" +
                                "- Correo: %s\n" +
                                "- Rol en ApexFit: %s\n" +
                                "- Estado de la cuenta: %s\n" +
                                "Nota para ti: Dirígete a este usuario por su nombre de manera natural cuando sea oportuno y responde adaptándote a su rol y estado de cuenta.",
                                nombreCompleto.isEmpty() ? u.getCorreo() : nombreCompleto,
                                u.getCorreo(),
                                rol,
                                estado
                        );
                    }
                }
            }
        } catch (Exception e) {
            // Si ocurre algún fallo al obtener contexto, no se interrumpe el chat
        }
        return null;
    }
}
