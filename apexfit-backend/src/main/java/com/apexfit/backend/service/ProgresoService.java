package com.apexfit.backend.service;

import com.apexfit.backend.dto.ProgresoDto;
import com.apexfit.backend.dto.ProgresoMedidaDto;
import com.apexfit.backend.entity.Progreso;
import com.apexfit.backend.entity.ProgresoMedida;
import com.apexfit.backend.entity.Usuario;
import com.apexfit.backend.exception.ResourceNotFoundException;
import com.apexfit.backend.repository.ProgresoRepository;
import com.apexfit.backend.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ProgresoService {

    private final ProgresoRepository repo;
    private final UsuarioRepository usuarioRepository;

    public List<ProgresoDto> getAll() {
        return repo.findAll().stream().map(this::toDto).collect(Collectors.toList());
    }

    public List<ProgresoDto> getByUsuario(Integer idUsuario) {
        return repo.findByUsuario_IdUsuarioOrderByFechaDesc(idUsuario).stream().map(this::toDto).collect(Collectors.toList());
    }

    public ProgresoDto getById(Integer id) {
        return toDto(repo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Progreso no encontrado con id: " + id)));
    }

    @Transactional
    public ProgresoDto create(ProgresoDto dto) {
        Progreso p = new Progreso();
        Usuario usuario = usuarioRepository.findById(dto.getIdUsuario())
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado: " + dto.getIdUsuario()));
        p.setUsuario(usuario);
        p.setFecha(dto.getFecha());
        p.setPeso(dto.getPeso());
        p.setAltura(dto.getAltura());
        p.setImc(dto.getImc());
        p.setObservaciones(dto.getObservaciones());
        Progreso saved = repo.save(p);
        if (dto.getMedidas() != null) {
            List<ProgresoMedida> medidas = dto.getMedidas().stream().map(m -> {
                ProgresoMedida pm = new ProgresoMedida();
                pm.setProgreso(saved);
                pm.setTipoMedida(m.getTipoMedida());
                pm.setValorCm(m.getValorCm());
                return pm;
            }).collect(Collectors.toList());
            saved.setMedidas(medidas);
            return toDto(repo.save(saved));
        }
        return toDto(saved);
    }

    @Transactional
    public ProgresoDto update(Integer id, ProgresoDto dto) {
        Progreso p = repo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Progreso no encontrado con id: " + id));
        p.setPeso(dto.getPeso());
        p.setAltura(dto.getAltura());
        p.setImc(dto.getImc());
        p.setObservaciones(dto.getObservaciones());
        return toDto(repo.save(p));
    }

    @Transactional
    public void delete(Integer id) {
        if (!repo.existsById(id))
            throw new ResourceNotFoundException("Progreso no encontrado con id: " + id);
        repo.deleteById(id);
    }

    private ProgresoDto toDto(Progreso p) {
        ProgresoDto dto = new ProgresoDto();
        dto.setIdProgreso(p.getIdProgreso());
        dto.setIdUsuario(p.getUsuario().getIdUsuario());
        dto.setFecha(p.getFecha());
        dto.setPeso(p.getPeso());
        dto.setAltura(p.getAltura());
        dto.setImc(p.getImc());
        dto.setObservaciones(p.getObservaciones());
        if (p.getMedidas() != null) {
            dto.setMedidas(p.getMedidas().stream().map(m -> {
                ProgresoMedidaDto md = new ProgresoMedidaDto();
                md.setIdMedida(m.getIdMedida());
                md.setIdProgreso(p.getIdProgreso());
                md.setTipoMedida(m.getTipoMedida());
                md.setValorCm(m.getValorCm());
                return md;
            }).collect(Collectors.toList()));
        }
        return dto;
    }
}
