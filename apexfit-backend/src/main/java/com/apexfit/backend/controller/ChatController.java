package com.apexfit.backend.controller;

import com.apexfit.backend.dto.chat.ChatRequestDto;
import com.apexfit.backend.dto.chat.ChatResponseDto;
import com.apexfit.backend.entity.Membresia;
import com.apexfit.backend.entity.Usuario;
import com.apexfit.backend.repository.MembresiaRepository;
import com.apexfit.backend.repository.UsuarioRepository;
import com.apexfit.backend.security.services.UserDetailsImpl;
import com.apexfit.backend.service.ClaudeService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping({"/api/chat", "/api/v1/chat"})
@PreAuthorize("hasAnyRole('CLIENTE', 'ENTRENADOR', 'ADMINISTRADOR')")
public class ChatController {

    private static final Logger log = LoggerFactory.getLogger(ChatController.class);

    private final ClaudeService claudeService;
    private final UsuarioRepository usuarioRepository;
    private final MembresiaRepository membresiaRepository;

    public ChatController(ClaudeService claudeService,
                          UsuarioRepository usuarioRepository,
                          MembresiaRepository membresiaRepository) {
        this.claudeService = claudeService;
        this.usuarioRepository = usuarioRepository;
        this.membresiaRepository = membresiaRepository;
    }

    @PostMapping
    public ResponseEntity<ChatResponseDto> chat(@Valid @RequestBody ChatRequestDto request) {
        String contextInfo = armarContextoUsuario();
        log.info("Chat invoked. Contexto generado: {}", contextInfo);
        ChatResponseDto response = claudeService.generarRespuesta(request, contextInfo);
        return ResponseEntity.ok(response);
    }

    private String armarContextoUsuario() {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth == null) {
                log.warn("SecurityContextHolder authentication es null");
                return null;
            }
            log.info("Authentication principal type: {}", auth.getPrincipal().getClass().getName());

            Integer idUsuario = null;
            String correo = null;

            if (auth.getPrincipal() instanceof UserDetailsImpl userDetails) {
                idUsuario = userDetails.getIdUsuario();
                correo = userDetails.getUsername();
            } else if (auth.getPrincipal() instanceof org.springframework.security.core.userdetails.UserDetails ud) {
                correo = ud.getUsername();
            } else if (auth.getName() != null) {
                correo = auth.getName();
            }

            Optional<Usuario> usuarioOpt = Optional.empty();
            if (idUsuario != null) {
                usuarioOpt = usuarioRepository.findById(idUsuario);
            }
            if (usuarioOpt.isEmpty() && correo != null) {
                usuarioOpt = usuarioRepository.findByCorreo(correo);
            }

            if (usuarioOpt.isPresent()) {
                Usuario u = usuarioOpt.get();
                String nombreCompleto = ((u.getNombre() != null ? u.getNombre() : "") + " " +
                        (u.getApellido() != null ? u.getApellido() : "")).trim();
                String rol = (u.getRol() != null && u.getRol().getNombreRol() != null)
                        ? u.getRol().getNombreRol()
                        : "CLIENTE";
                String estado = u.getEstado() != null ? u.getEstado() : "activo";

                StringBuilder sb = new StringBuilder();
                sb.append(String.format("- Nombre del usuario: %s\n", nombreCompleto.isEmpty() ? u.getCorreo() : nombreCompleto));
                sb.append(String.format("- Correo: %s\n", u.getCorreo()));
                sb.append(String.format("- Rol en ApexFit: %s\n", rol));
                sb.append(String.format("- Estado de la cuenta: %s\n", estado));

                // Buscar membresía
                List<Membresia> membresias = membresiaRepository.findByUsuario_IdUsuario(u.getIdUsuario());
                LocalDate hoy = LocalDate.now();
                Optional<Membresia> activaOpt = membresias.stream()
                        .filter(m -> "activa".equalsIgnoreCase(m.getEstado()) && (m.getFechaFin() == null || !m.getFechaFin().isBefore(hoy)))
                        .findFirst();

                if (activaOpt.isPresent()) {
                    Membresia m = activaOpt.get();
                    long diasRestantes = ChronoUnit.DAYS.between(hoy, m.getFechaFin());
                    sb.append(String.format(
                            "- Membresía actual: %s | Estado: Activa | Fecha fin: %s | Días restantes: %d días\n",
                            m.getTipo(), m.getFechaFin(), Math.max(0, diasRestantes)
                    ));
                } else if (!membresias.isEmpty()) {
                    Membresia m = membresias.get(0);
                    sb.append(String.format(
                            "- Membresía: %s | Estado: %s (venció el %s)\n",
                            m.getTipo(), m.getEstado(), m.getFechaFin()
                    ));
                } else {
                    sb.append("- Membresía: El usuario no tiene ninguna membresía registrada actualmente.\n");
                }

                sb.append("Instrucciones obligatorias para el asistente:\n");
                sb.append("1. El usuario YA está autenticado. Tienes acceso legítimo a sus datos arriba.\n");
                sb.append("2. NUNCA le pidas correo, ID, cédula o número de socio.\n");
                sb.append("3. Dirígete a él por su nombre directamente y responde sus dudas con la información arriba provista.");

                return sb.toString();
            } else {
                log.warn("No se encontró el usuario en base de datos para id={} o correo={}", idUsuario, correo);
            }
        } catch (Exception e) {
            log.error("Error al armar contexto de usuario: {}", e.getMessage(), e);
        }
        return null;
    }
}
