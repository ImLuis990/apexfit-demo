package com.apexfit.backend.service;

import com.apexfit.backend.dto.RutinaDto;
import com.apexfit.backend.entity.Rutina;
import com.apexfit.backend.entity.Usuario;
import com.apexfit.backend.exception.ResourceNotFoundException;
import com.apexfit.backend.repository.RutinaRepository;
import com.apexfit.backend.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class RutinaService {

    private final RutinaRepository rutinaRepository;
    private final UsuarioRepository usuarioRepository;
    private final NotificacionService notificacionService;

    public Page<RutinaDto> getAllRutinas(Pageable pageable) {
        return rutinaRepository.findAll(pageable).map(this::mapToDto);
    }

    public Page<RutinaDto> getRutinasByCliente(Integer idCliente, Pageable pageable) {
        return rutinaRepository.findByCliente_IdUsuario(idCliente, pageable).map(this::mapToDto);
    }

    public RutinaDto getRutinaById(Integer id) {
        Rutina rutina = rutinaRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Rutina no encontrada con id: " + id));
        return mapToDto(rutina);
    }

    @Transactional
    public RutinaDto createRutina(RutinaDto dto) {
        Rutina rutina = new Rutina();
        mapToEntity(dto, rutina);
        Rutina savedRutina = rutinaRepository.save(rutina);
        return mapToDto(savedRutina);
    }

    @Transactional
    public RutinaDto updateRutina(Integer id, RutinaDto dto) {
        Rutina rutina = rutinaRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Rutina no encontrada con id: " + id));

        mapToEntity(dto, rutina);
        Rutina updatedRutina = rutinaRepository.save(rutina);

        notificacionService.crear(
                updatedRutina.getCliente().getIdUsuario(),
                "RUTINA_ACTUALIZADA",
                "Rutina actualizada",
                "Tu rutina '" + updatedRutina.getNombre() + "' ha sido actualizada.",
                updatedRutina.getIdRutina(),
                LocalDate.now()
        );

        return mapToDto(updatedRutina);
    }

    @Transactional
    public void deleteRutina(Integer id) {
        Rutina rutina = rutinaRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Rutina no encontrada con id: " + id));
        rutina.setEstado("inactiva");
        rutinaRepository.save(rutina);
    }

    private RutinaDto mapToDto(Rutina rutina) {
        RutinaDto dto = new RutinaDto();
        dto.setIdRutina(rutina.getIdRutina());
        dto.setNombre(rutina.getNombre());
        dto.setDescripcion(rutina.getDescripcion());
        dto.setIdEntrenador(rutina.getEntrenador().getIdUsuario());
        dto.setIdCliente(rutina.getCliente().getIdUsuario());
        dto.setFechaCreacion(rutina.getFechaCreacion());
        dto.setEstado(rutina.getEstado());
        return dto;
    }

    private void mapToEntity(RutinaDto dto, Rutina rutina) {
        rutina.setNombre(dto.getNombre());
        rutina.setDescripcion(dto.getDescripcion());
        
        if (dto.getEstado() != null) {
            rutina.setEstado(dto.getEstado());
        }

        Usuario entrenador = usuarioRepository.findById(dto.getIdEntrenador())
                .orElseThrow(() -> new ResourceNotFoundException("Entrenador no encontrado con id: " + dto.getIdEntrenador()));
        rutina.setEntrenador(entrenador);

        Usuario cliente = usuarioRepository.findById(dto.getIdCliente())
                .orElseThrow(() -> new ResourceNotFoundException("Cliente no encontrado con id: " + dto.getIdCliente()));
        rutina.setCliente(cliente);
    }
}
