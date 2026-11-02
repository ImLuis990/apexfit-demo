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

                        StringBuilder sb = new StringBuilder();
                        sb.append(String.format("- Nombre del usuario: %s\n", nombreCompleto.isEmpty() ? u.getCorreo() : nombreCompleto));
                        sb.append(String.format("- Correo: %s\n", u.getCorreo()));
                        sb.append(String.format("- Rol en ApexFit: %s\n", rol));
                        sb.append(String.format("- Estado de la cuenta: %s\n", estado));

                        // Si es CLIENTE, buscamos el estado de su membresía para responder preguntas sobre días restantes o vencimiento
                        if ("CLIENTE".equalsIgnoreCase(rol)) {
                            List<Membresia> membresias = membresiaRepository.findByUsuario_IdUsuario(idUsuario);
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
                        }

                        sb.append("Instrucciones para el asistente:\n");
                        sb.append("1. Tienes acceso seguro a estos datos del usuario actual porque está autenticado en la plataforma.\n");
                        sb.append("2. Si te pregunta sobre su membresía, días restantes, su nombre o estado de cuenta, responde directamente con estos datos reales de forma concisa y amigable.");

                        return sb.toString();
                    }
                }
            }
        } catch (Exception e) {
            // No interrumpir si ocurre error al armar contexto
        }
        return null;
    }
}
