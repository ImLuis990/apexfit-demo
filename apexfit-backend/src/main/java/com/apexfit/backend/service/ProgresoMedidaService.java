package com.apexfit.backend.service;

import com.apexfit.backend.dto.ProgresoMedidaDto;
import com.apexfit.backend.entity.Progreso;
import com.apexfit.backend.entity.ProgresoMedida;
import com.apexfit.backend.exception.ResourceNotFoundException;
import com.apexfit.backend.repository.ProgresoMedidaRepository;
import com.apexfit.backend.repository.ProgresoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ProgresoMedidaService {

    private final ProgresoMedidaRepository repo;
    private final ProgresoRepository progresoRepository;

    public List<ProgresoMedidaDto> getAll() {
        return repo.findAll().stream().map(this::toDto).collect(Collectors.toList());
    }

    public List<ProgresoMedidaDto> getByProgreso(Integer idProgreso) {
        return repo.findByProgreso_IdProgreso(idProgreso).stream().map(this::toDto).collect(Collectors.toList());
    }

    public ProgresoMedidaDto getById(Integer id) {
        return toDto(repo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Medida no encontrada con id: " + id)));
    }

    @Transactional
    public ProgresoMedidaDto create(ProgresoMedidaDto dto) {
        Progreso progreso = progresoRepository.findById(dto.getIdProgreso())
                .orElseThrow(() -> new ResourceNotFoundException("Progreso no encontrado con id: " + dto.getIdProgreso()));
        
        ProgresoMedida pm = new ProgresoMedida();
        pm.setProgreso(progreso);
        pm.setTipoMedida(dto.getTipoMedida());
        pm.setValorCm(dto.getValorCm());
        
        return toDto(repo.save(pm));
    }

    @Transactional
    public ProgresoMedidaDto update(Integer id, ProgresoMedidaDto dto) {
        ProgresoMedida pm = repo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Medida no encontrada con id: " + id));
        pm.setTipoMedida(dto.getTipoMedida());
        pm.setValorCm(dto.getValorCm());
        return toDto(repo.save(pm));
    }

    @Transactional
    public void delete(Integer id) {
        if (!repo.existsById(id)) {
            throw new ResourceNotFoundException("Medida no encontrada con id: " + id);
        }
        repo.deleteById(id);
    }

    private ProgresoMedidaDto toDto(ProgresoMedida entity) {
        ProgresoMedidaDto dto = new ProgresoMedidaDto();
        dto.setIdMedida(entity.getIdMedida());
        dto.setIdProgreso(entity.getProgreso().getIdProgreso());
        dto.setTipoMedida(entity.getTipoMedida());
        dto.setValorCm(entity.getValorCm());
        return dto;
    }
}
