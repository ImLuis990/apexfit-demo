package com.apexfit.backend.service;

import com.apexfit.backend.dto.AlertaDto;
import com.apexfit.backend.entity.Alerta;
import com.apexfit.backend.entity.Usuario;
import com.apexfit.backend.exception.ResourceNotFoundException;
import com.apexfit.backend.repository.AlertaRepository;
import com.apexfit.backend.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AlertaService {

    private final AlertaRepository repo;
    private final UsuarioRepository usuarioRepository;

    public List<AlertaDto> getAll() {
        return repo.findAll().stream().map(this::toDto).collect(Collectors.toList());
    }

    public List<AlertaDto> getByUsuario(Integer idUsuario) {
        return repo.findByUsuario_IdUsuario(idUsuario).stream().map(this::toDto).collect(Collectors.toList());
    }

    public AlertaDto getById(Integer id) {
        return toDto(repo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Alerta no encontrada con id: " + id)));
    }

    @Transactional
    public AlertaDto create(AlertaDto dto) {
        Alerta a = new Alerta();
        Usuario usuario = usuarioRepository.findById(dto.getIdUsuario())
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado: " + dto.getIdUsuario()));
        a.setUsuario(usuario);
        a.setTipo(dto.getTipo());
        a.setMensaje(dto.getMensaje());
        if (dto.getEstado() != null) a.setEstado(dto.getEstado());
        return toDto(repo.save(a));
    }

    @Transactional
    public AlertaDto update(Integer id, AlertaDto dto) {
        Alerta a = repo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Alerta no encontrada con id: " + id));
        a.setMensaje(dto.getMensaje());
        if (dto.getEstado() != null) a.setEstado(dto.getEstado());
        return toDto(repo.save(a));
    }

    @Transactional
    public void delete(Integer id) {
        if (!repo.existsById(id))
            throw new ResourceNotFoundException("Alerta no encontrada con id: " + id);
        repo.deleteById(id);
    }

    private AlertaDto toDto(Alerta a) {
        AlertaDto dto = new AlertaDto();
        dto.setIdAlerta(a.getIdAlerta());
        dto.setIdUsuario(a.getUsuario().getIdUsuario());
        dto.setTipo(a.getTipo());
        dto.setMensaje(a.getMensaje());
        dto.setFechaGenerada(a.getFechaGenerada());
        dto.setEstado(a.getEstado());
        return dto;
    }
}
