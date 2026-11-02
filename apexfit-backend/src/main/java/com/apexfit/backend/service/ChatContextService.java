package com.apexfit.backend.service;

import com.apexfit.backend.entity.Membresia;
import com.apexfit.backend.entity.Usuario;
import com.apexfit.backend.repository.MembresiaRepository;
import com.apexfit.backend.repository.UsuarioRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

/**
 * Servicio que construye el contexto del usuario autenticado para el chatbot.
 * Debe ser @Transactional para que las relaciones LAZY (como Rol) se puedan
 * acceder sin LazyInitializationException.
 */
@Service
public class ChatContextService {

    private static final Logger log = LoggerFactory.getLogger(ChatContextService.class);

    private final UsuarioRepository usuarioRepository;
    private final MembresiaRepository membresiaRepository;

    public ChatContextService(UsuarioRepository usuarioRepository,
                              MembresiaRepository membresiaRepository) {
        this.usuarioRepository = usuarioRepository;
        this.membresiaRepository = membresiaRepository;
    }

    /**
     * Construye el bloque de contexto que se inyecta en la conversación de Gemini.
     * Se ejecuta dentro de una transacción para evitar LazyInitializationException
     * al acceder a la relación Rol (LAZY).
     *
     * @param idUsuario ID del usuario autenticado (puede ser null si no disponible)
     * @param correo    correo del usuario autenticado (fallback si idUsuario es null)
     * @return String con el contexto listo para inyectar, o null si no se pudo construir
     */
    @Transactional(readOnly = true)
    public String construirContexto(Integer idUsuario, String correo) {
        try {
            Optional<Usuario> usuarioOpt = Optional.empty();

            if (idUsuario != null) {
                usuarioOpt = usuarioRepository.findById(idUsuario);
            }
            if (usuarioOpt.isEmpty() && correo != null && !correo.isBlank()) {
                usuarioOpt = usuarioRepository.findByCorreo(correo);
            }

            if (usuarioOpt.isEmpty()) {
                log.warn("ChatContextService: usuario no encontrado. idUsuario={}, correo={}", idUsuario, correo);
                return null;
            }

            Usuario u = usuarioOpt.get();

            // Accedemos a Rol DENTRO de la transacción → no hay LazyInitializationException
            String nombreCompleto = (
                    (u.getNombre() != null ? u.getNombre() : "") + " " +
                    (u.getApellido() != null ? u.getApellido() : "")
            ).trim();

            String rol = (u.getRol() != null && u.getRol().getNombreRol() != null)
                    ? u.getRol().getNombreRol()
                    : "CLIENTE";

            String estado = u.getEstado() != null ? u.getEstado() : "activo";

            StringBuilder sb = new StringBuilder();
            sb.append(String.format("- Nombre del cliente: %s\n",
                    nombreCompleto.isEmpty() ? u.getCorreo() : nombreCompleto));
            sb.append(String.format("- Correo: %s\n", u.getCorreo()));
            sb.append(String.format("- Rol en ApexFit: %s\n", rol));
            sb.append(String.format("- Estado de la cuenta: %s\n", estado));

            // Membresía — misma lógica que la pantalla 'Hoy' del cliente
            List<Membresia> membresias = membresiaRepository.findByUsuario_IdUsuario(u.getIdUsuario());
            LocalDate hoy = LocalDate.now();

            Optional<Membresia> activaOpt = membresias.stream()
                    .filter(m -> "activa".equalsIgnoreCase(m.getEstado())
                            && m.getFechaFin() != null
                            && !m.getFechaFin().isBefore(hoy))
                    .max(Comparator.comparing(Membresia::getFechaFin));

            if (activaOpt.isPresent()) {
                Membresia m = activaOpt.get();
                long dias = ChronoUnit.DAYS.between(hoy, m.getFechaFin());
                sb.append(String.format(
                        "- Membresía vinculada: Plan %s | Estado: Activa | Fecha de vencimiento: %s | Días restantes: %d días\n",
                        m.getTipo(), m.getFechaFin(), Math.max(0, dias)
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
                sb.append("- Membresía: El cliente no tiene ninguna membresía registrada.\n");
            }

            sb.append("\nInstrucciones estrictas para la IA:\n");
            sb.append("1. El cliente YA está autenticado. Sus datos reales están listados arriba.\n");
            sb.append("2. Salúdalo por su nombre. Responde directamente con los datos exactos de su membresía.\n");
            sb.append("3. NUNCA digas que no tienes acceso a sus datos ni que es una simulación.\n");
            sb.append("4. NUNCA le pidas correo, contraseña, número de socio, rol ni ningún dato de identificación.\n");
            sb.append("5. NUNCA le digas que revise la app ni que vaya a recepción si la información ya está en los datos de arriba.\n");

            log.info("ChatContextService: contexto construido para idUsuario={}, rol={}", u.getIdUsuario(), rol);
            return sb.toString();

        } catch (Exception e) {
            log.error("ChatContextService: error construyendo contexto: {}", e.getMessage(), e);
            return null;
        }
    }
}
