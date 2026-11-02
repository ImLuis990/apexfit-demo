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
import java.util.Comparator;
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
        log.info("Chat invocado con contexto:\n{}", contextInfo);
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
                sb.append(String.format("- Nombre del cliente: %s\n", nombreCompleto.isEmpty() ? u.getCorreo() : nombreCompleto));
                sb.append(String.format("- Correo: %s\n", u.getCorreo()));
                sb.append(String.format("- Rol en ApexFit: %s\n", rol));
                sb.append(String.format("- Estado de la cuenta: %s\n", estado));

                // Buscar la membresía vinculada exactamente igual que la pantalla 'Hoy' del cliente
                List<Membresia> membresias = membresiaRepository.findByUsuario_IdUsuario(u.getIdUsuario());
                LocalDate hoy = LocalDate.now();

                // Ordenamos por fechaFin descendente para encontrar la más vigente
                Optional<Membresia> activaOpt = membresias.stream()
                        .filter(m -> "activa".equalsIgnoreCase(m.getEstado()) && m.getFechaFin() != null && !m.getFechaFin().isBefore(hoy))
                        .max(Comparator.comparing(Membresia::getFechaFin));

                if (activaOpt.isPresent()) {
                    Membresia m = activaOpt.get();
                    long diasRestantes = ChronoUnit.DAYS.between(hoy, m.getFechaFin());
                    sb.append(String.format(
                            "- Membresía vinculada: Plan %s | Estado: Activa | Fecha de vencimiento: %s | Días restantes calculados: %d días\n",
                            m.getTipo(), m.getFechaFin(), Math.max(0, diasRestantes)
                    ));
                } else if (!membresias.isEmpty()) {
                    Membresia ultima = membresias.stream()
                            .max(Comparator.comparing(Membresia::getFechaFin))
                            .orElse(membresias.get(0));
                    sb.append(String.format(
                            "- Membresía: Plan %s | Estado: %s (venció el %s)\n",
                            ultima.getTipo(), ultima.getEstado(), ultima.getFechaFin()
                    ));
                } else {
                    sb.append("- Membresía: El cliente no tiene ninguna membresía registrada en el sistema.\n");
                }

                sb.append("\nInstrucciones estrictas para la IA:\n");
                sb.append("1. El cliente YA está autenticado y su membresía ya fue consultada y vinculada en los datos anteriores.\n");
                sb.append("2. Si te pregunta por cuántos días le quedan a su membresía, responde con los datos exactos del plan, la fecha de vencimiento y los días restantes que aparecen arriba.\n");
                sb.append("3. NUNCA digas que no tienes acceso a sus datos, ni que es una simulación, ni le pidas que revise la app ni que ingrese datos.");

                return sb.toString();
            } else {
                log.warn("Usuario no encontrado en BD. idUsuario={}, correo={}", idUsuario, correo);
            }
        } catch (Exception e) {
            log.error("Error al armar contexto de usuario: {}", e.getMessage(), e);
        }
        return null;
    }
}
