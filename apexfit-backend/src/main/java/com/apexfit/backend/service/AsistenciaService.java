package com.apexfit.backend.service;

import com.apexfit.backend.dto.AsistenciaDto;
import com.apexfit.backend.entity.Asistencia;
import com.apexfit.backend.entity.Usuario;
import com.apexfit.backend.exception.ResourceNotFoundException;
import com.apexfit.backend.repository.AsistenciaRepository;
import com.apexfit.backend.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AsistenciaService {

    private static final ZoneId ZONA_HORARIA = ZoneId.of("America/Bogota");

    private final AsistenciaRepository repo;
    private final UsuarioRepository usuarioRepository;

    public List<AsistenciaDto> getAll() {
        return repo.findAll().stream().map(this::toDto).collect(Collectors.toList());
    }

    public List<AsistenciaDto> getByUsuario(Integer idUsuario) {
        return repo.findByUsuario_IdUsuario(idUsuario).stream().map(this::toDto).collect(Collectors.toList());
    }

    public AsistenciaDto getById(Long id) {
        return toDto(repo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Asistencia no encontrada con id: " + id)));
    }

    @Transactional
    public AsistenciaDto create(AsistenciaDto dto) {
        Asistencia a = new Asistencia();
        Usuario usuario = usuarioRepository.findById(dto.getIdUsuario())
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado: " + dto.getIdUsuario()));
        a.setUsuario(usuario);
        a.setFecha(dto.getFecha() != null ? dto.getFecha() : LocalDate.now(ZONA_HORARIA));
        a.setHoraEntrada(dto.getHoraEntrada() != null ? dto.getHoraEntrada() : LocalTime.now(ZONA_HORARIA).truncatedTo(ChronoUnit.SECONDS));
        a.setHoraSalida(dto.getHoraSalida());
        a.setMetodoRegistro(dto.getMetodoRegistro() != null ? dto.getMetodoRegistro() : "QR");
        return toDto(repo.save(a));
    }

    /**
     * Lógica de entrada/salida por QR (toggle):
     * - Si el usuario tiene una entrada HOY sin hora de salida → registra la SALIDA.
     * - Si no tiene entrada abierta hoy → registra una nueva ENTRADA.
     */
    @Transactional
    public AsistenciaDto registrarPorQr(String qrData) {
        Integer idUsuario = resolverIdUsuario(qrData);

        Usuario usuario = usuarioRepository.findById(idUsuario)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario con id " + idUsuario + " no encontrado"));

        LocalDate hoy = LocalDate.now(ZONA_HORARIA);
        LocalTime ahora = LocalTime.now(ZONA_HORARIA).truncatedTo(ChronoUnit.SECONDS);

        // Buscar entrada abierta de hoy (sin hora de salida)
        Optional<Asistencia> entradaAbierta = repo.findByUsuario_IdUsuario(idUsuario)
                .stream()
                .filter(a -> hoy.equals(a.getFecha()) && a.getHoraSalida() == null)
                .findFirst();

        if (entradaAbierta.isPresent()) {
            // Segundo escaneo → registrar hora de salida
            Asistencia a = entradaAbierta.get();
            a.setHoraSalida(ahora);
            return toDto(repo.save(a));
        } else {
            // Primer escaneo (o ya registró salida antes) → nueva entrada
            Asistencia a = new Asistencia();
            a.setUsuario(usuario);
            a.setFecha(hoy);
            a.setHoraEntrada(ahora);
            a.setMetodoRegistro("QR");
            return toDto(repo.save(a));
        }
    }

    @Transactional
    public AsistenciaDto update(Long id, AsistenciaDto dto) {
        Asistencia a = repo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Asistencia no encontrada con id: " + id));
        a.setHoraSalida(dto.getHoraSalida());
        a.setMetodoRegistro(dto.getMetodoRegistro());
        return toDto(repo.save(a));
    }

    /**
     * Registra la hora de salida en una asistencia específica por ID.
     * Usado cuando el cliente pulsa "Registrar salida" desde la app.
     */
    @Transactional
    public AsistenciaDto registrarSalida(Long id) {
        Asistencia a = repo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Asistencia no encontrada con id: " + id));
        if (a.getHoraSalida() != null) {
            throw new IllegalStateException("Esta asistencia ya tiene hora de salida registrada.");
        }
        a.setHoraSalida(LocalTime.now(ZONA_HORARIA).truncatedTo(ChronoUnit.SECONDS));
        return toDto(repo.save(a));
    }

    @Transactional
    public void delete(Long id) {
        if (!repo.existsById(id))
            throw new ResourceNotFoundException("Asistencia no encontrada con id: " + id);
        repo.deleteById(id);
    }

    // ── Helpers ─────────────────────────────────────────────────────────────

    private Integer resolverIdUsuario(String qrData) {
        if (qrData.startsWith("APEXFIT-USER-")) {
            String[] parts = qrData.split("-");
            return Integer.parseInt(parts[2]);
        }
        try {
            return Integer.parseInt(qrData.trim());
        } catch (NumberFormatException e) {
            return usuarioRepository.findByCorreo(qrData.trim())
                    .orElseThrow(() -> new ResourceNotFoundException("Código QR inválido o usuario no encontrado"))
                    .getIdUsuario();
        }
    }

    private AsistenciaDto toDto(Asistencia a) {
        AsistenciaDto dto = new AsistenciaDto();
        dto.setIdAsistencia(a.getIdAsistencia());
        dto.setIdUsuario(a.getUsuario().getIdUsuario());
        dto.setFecha(a.getFecha());
        dto.setHoraEntrada(a.getHoraEntrada());
        dto.setHoraSalida(a.getHoraSalida());
        dto.setMetodoRegistro(a.getMetodoRegistro());
        return dto;
    }
}
