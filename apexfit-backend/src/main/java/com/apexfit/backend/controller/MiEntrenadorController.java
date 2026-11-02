package com.apexfit.backend.controller;

import com.apexfit.backend.dto.EntrenadorInfoDto;
import com.apexfit.backend.entity.EntrenadorCliente;
import com.apexfit.backend.entity.Usuario;
import com.apexfit.backend.repository.EntrenadorClienteRepository;
import com.apexfit.backend.security.services.UserDetailsImpl;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Comparator;
import java.util.List;
import java.util.Optional;

/**
 * Endpoint para que el cliente autenticado consulte su entrenador asignado.
 * GET /api/v1/mi-entrenador → EntrenadorInfoDto o 204 si no tiene asignación activa.
 */
@RestController
@RequestMapping("/api/v1/mi-entrenador")
@PreAuthorize("hasAnyRole('CLIENTE', 'ADMINISTRADOR')")
public class MiEntrenadorController {

    private static final Logger log = LoggerFactory.getLogger(MiEntrenadorController.class);

    private final EntrenadorClienteRepository entrenadorClienteRepository;

    public MiEntrenadorController(EntrenadorClienteRepository entrenadorClienteRepository) {
        this.entrenadorClienteRepository = entrenadorClienteRepository;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public ResponseEntity<EntrenadorInfoDto> getMiEntrenador(Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.noContent().build();
        }

        Integer idCliente = null;
        if (authentication.getPrincipal() instanceof UserDetailsImpl ud) {
            idCliente = ud.getIdUsuario();
        }
        if (idCliente == null) {
            log.warn("MiEntrenadorController: no se pudo obtener idCliente del token");
            return ResponseEntity.noContent().build();
        }

        List<EntrenadorCliente> asignaciones = entrenadorClienteRepository.findByCliente_IdUsuario(idCliente);

        // Preferir la asignación con estado "activa"; si no, la más reciente
        Optional<EntrenadorCliente> asignacionOpt = asignaciones.stream()
                .filter(a -> "activa".equalsIgnoreCase(a.getEstado()))
                .max(Comparator.comparing(a -> a.getFechaAsignacion() != null ? a.getFechaAsignacion().toString() : ""));

        if (asignacionOpt.isEmpty()) {
            asignacionOpt = asignaciones.stream()
                    .max(Comparator.comparing(a -> a.getFechaAsignacion() != null ? a.getFechaAsignacion().toString() : ""));
        }

        if (asignacionOpt.isEmpty()) {
            return ResponseEntity.noContent().build();
        }

        EntrenadorCliente asignacion = asignacionOpt.get();
        Usuario entrenador = asignacion.getEntrenador();

        EntrenadorInfoDto dto = new EntrenadorInfoDto(
                entrenador.getIdUsuario(),
                entrenador.getNombre(),
                entrenador.getApellido(),
                entrenador.getCorreo(),
                entrenador.getTelefono(),
                asignacion.getEstado(),
                asignacion.getFechaAsignacion() != null ? asignacion.getFechaAsignacion().toString() : null
        );

        log.info("MiEntrenadorController: cliente {} → entrenador {}", idCliente, entrenador.getIdUsuario());
        return ResponseEntity.ok(dto);
    }
}
