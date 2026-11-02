package com.apexfit.backend.service;

import com.apexfit.backend.dto.MembresiaDto;
import com.apexfit.backend.entity.Membresia;
import com.apexfit.backend.entity.Usuario;
import com.apexfit.backend.exception.ResourceNotFoundException;
import com.apexfit.backend.repository.MembresiaRepository;
import com.apexfit.backend.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MembresiaService {

    private final MembresiaRepository membresiaRepository;
    private final UsuarioRepository usuarioRepository;
    private final NotificacionService notificacionService;

    public List<MembresiaDto> getAll() {
        return membresiaRepository.findAll().stream().map(this::toDto).collect(Collectors.toList());
    }

    public List<MembresiaDto> getByUsuario(Integer idUsuario) {
        return membresiaRepository.findByUsuario_IdUsuario(idUsuario).stream().map(this::toDto).collect(Collectors.toList());
    }

    public MembresiaDto getById(Integer id) {
        return toDto(membresiaRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Membresía no encontrada con id: " + id)));
    }

    @Transactional
    public MembresiaDto create(MembresiaDto dto) {
        Membresia m = new Membresia();
        Usuario usuario = usuarioRepository.findById(dto.getIdUsuario())
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado con id: " + dto.getIdUsuario()));
        m.setUsuario(usuario);
        m.setTipo(dto.getTipo());
        m.setFechaInicio(dto.getFechaInicio());
        m.setFechaFin(dto.getFechaFin());
        m.setPrecio(dto.getPrecio());
        if (dto.getEstado() != null) m.setEstado(dto.getEstado());

        Membresia saved = membresiaRepository.save(m);
        notificacionService.crear(
                saved.getUsuario().getIdUsuario(),
                "MEMBRESIA_RENOVADA",
                "Membresía renovada",
                "Tu membresía " + saved.getTipo() + " ha sido renovada hasta el " + saved.getFechaFin() + ".",
                saved.getIdMembresia(),
                LocalDate.now()
        );

        return toDto(saved);
    }

    @Transactional
    public MembresiaDto update(Integer id, MembresiaDto dto) {
        Membresia m = membresiaRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Membresía no encontrada con id: " + id));
        m.setTipo(dto.getTipo());
        m.setFechaInicio(dto.getFechaInicio());
        m.setFechaFin(dto.getFechaFin());
        m.setPrecio(dto.getPrecio());
        if (dto.getEstado() != null) m.setEstado(dto.getEstado());

        Membresia saved = membresiaRepository.save(m);
        notificacionService.crear(
                saved.getUsuario().getIdUsuario(),
                "MEMBRESIA_RENOVADA",
                "Membresía renovada",
                "Tu membresía " + saved.getTipo() + " ha sido renovada hasta el " + saved.getFechaFin() + ".",
                saved.getIdMembresia(),
                LocalDate.now()
        );

        return toDto(saved);
    }

    @Transactional
    public void delete(Integer id) {
        if (!membresiaRepository.existsById(id))
            throw new ResourceNotFoundException("Membresía no encontrada con id: " + id);
        membresiaRepository.deleteById(id);
    }

    private MembresiaDto toDto(Membresia m) {
        MembresiaDto dto = new MembresiaDto();
        dto.setIdMembresia(m.getIdMembresia());
        dto.setIdUsuario(m.getUsuario().getIdUsuario());
        dto.setTipo(m.getTipo());
        dto.setFechaInicio(m.getFechaInicio());
        dto.setFechaFin(m.getFechaFin());
        dto.setPrecio(m.getPrecio());
        dto.setEstado(m.getEstado());
        return dto;
    }
}
