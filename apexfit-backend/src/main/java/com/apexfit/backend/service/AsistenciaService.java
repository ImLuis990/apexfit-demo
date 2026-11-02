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

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AsistenciaService {

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
        a.setFecha(dto.getFecha() != null ? dto.getFecha() : java.time.LocalDate.now());
        a.setHoraEntrada(dto.getHoraEntrada() != null ? dto.getHoraEntrada() : java.time.LocalTime.now());
        a.setHoraSalida(dto.getHoraSalida());
        a.setMetodoRegistro(dto.getMetodoRegistro() != null ? dto.getMetodoRegistro() : "QR");
        return toDto(repo.save(a));
    }

    @Transactional
    public AsistenciaDto registrarPorQr(String qrData) {
        // Formato esperado: "APEXFIT-USER-{id}-{correo}" o simplemente "{id}"
        Integer idUsuario;
        if (qrData.startsWith("APEXFIT-USER-")) {
            String[] parts = qrData.split("-");
            idUsuario = Integer.parseInt(parts[2]);
        } else {
            try {
                idUsuario = Integer.parseInt(qrData.trim());
            } catch (NumberFormatException e) {
                Usuario u = usuarioRepository.findByCorreo(qrData.trim())
                        .orElseThrow(() -> new ResourceNotFoundException("Código QR inválido o usuario no encontrado"));
                idUsuario = u.getIdUsuario();
            }
        }

        final Integer finalUserId = idUsuario;
        Usuario usuario = usuarioRepository.findById(finalUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario con id " + finalUserId + " no encontrado"));

        Asistencia a = new Asistencia();
        a.setUsuario(usuario);
        a.setFecha(java.time.LocalDate.now());
        a.setHoraEntrada(java.time.LocalTime.now());
        a.setMetodoRegistro("QR");
        return toDto(repo.save(a));
    }

    @Transactional
    public AsistenciaDto update(Long id, AsistenciaDto dto) {
        Asistencia a = repo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Asistencia no encontrada con id: " + id));
        a.setHoraSalida(dto.getHoraSalida());
        a.setMetodoRegistro(dto.getMetodoRegistro());
        return toDto(repo.save(a));
    }

    @Transactional
    public void delete(Long id) {
        if (!repo.existsById(id))
            throw new ResourceNotFoundException("Asistencia no encontrada con id: " + id);
        repo.deleteById(id);
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
