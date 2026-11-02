package com.apexfit.backend.service;

import com.apexfit.backend.dto.RutinaEjercicioDto;
import com.apexfit.backend.entity.Ejercicio;
import com.apexfit.backend.entity.Rutina;
import com.apexfit.backend.entity.RutinaEjercicio;
import com.apexfit.backend.exception.ResourceNotFoundException;
import com.apexfit.backend.repository.EjercicioRepository;
import com.apexfit.backend.repository.RutinaEjercicioRepository;
import com.apexfit.backend.repository.RutinaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class RutinaEjercicioService {

    private final RutinaEjercicioRepository repo;
    private final RutinaRepository rutinaRepository;
    private final EjercicioRepository ejercicioRepository;
    private final NotificacionService notificacionService;

    public List<RutinaEjercicioDto> getAll() {
        return repo.findAll().stream().map(this::toDto).collect(Collectors.toList());
    }

    public List<RutinaEjercicioDto> getByRutina(Integer idRutina) {
        return repo.findByRutina_IdRutina(idRutina).stream().map(this::toDto).collect(Collectors.toList());
    }

    public RutinaEjercicioDto getById(Integer id) {
        return toDto(repo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("RutinaEjercicio no encontrado con id: " + id)));
    }

    @Transactional
    public RutinaEjercicioDto create(RutinaEjercicioDto dto) {
        RutinaEjercicio re = new RutinaEjercicio();
        Rutina rutina = rutinaRepository.findById(dto.getIdRutina())
                .orElseThrow(() -> new ResourceNotFoundException("Rutina no encontrada: " + dto.getIdRutina()));
        Ejercicio ejercicio = ejercicioRepository.findById(dto.getIdEjercicio())
                .orElseThrow(() -> new ResourceNotFoundException("Ejercicio no encontrado: " + dto.getIdEjercicio()));
        re.setRutina(rutina);
        re.setEjercicio(ejercicio);
        re.setDiaSemana(dto.getDiaSemana());
        re.setSeries(dto.getSeries());
        re.setRepeticiones(dto.getRepeticiones());
        re.setDescansoSeg(dto.getDescansoSeg());

        boolean primerEjercicio = repo.findByRutina_IdRutina(dto.getIdRutina()).isEmpty();
        RutinaEjercicio saved = repo.save(re);

        LocalDate hoy = LocalDate.now();
        if (primerEjercicio) {
            notificacionService.crear(
                    rutina.getCliente().getIdUsuario(),
                    "RUTINA_ASIGNADA",
                    "Nueva rutina asignada",
                    "Se ha asignado tu rutina: " + rutina.getNombre(),
                    rutina.getIdRutina(),
                    hoy
            );
        } else {
            notificacionService.crear(
                    rutina.getCliente().getIdUsuario(),
                    "RUTINA_ACTUALIZADA",
                    "Rutina actualizada",
                    "Tu rutina '" + rutina.getNombre() + "' ha sido actualizada.",
                    rutina.getIdRutina(),
                    hoy
            );
        }

        return toDto(saved);
    }

    @Transactional
    public RutinaEjercicioDto update(Integer id, RutinaEjercicioDto dto) {
        RutinaEjercicio re = repo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("RutinaEjercicio no encontrado con id: " + id));
        re.setDiaSemana(dto.getDiaSemana());
        re.setSeries(dto.getSeries());
        re.setRepeticiones(dto.getRepeticiones());
        re.setDescansoSeg(dto.getDescansoSeg());

        RutinaEjercicio saved = repo.save(re);
        Rutina rutina = saved.getRutina();
        notificacionService.crear(
                rutina.getCliente().getIdUsuario(),
                "RUTINA_ACTUALIZADA",
                "Rutina actualizada",
                "Tu rutina '" + rutina.getNombre() + "' ha sido actualizada.",
                rutina.getIdRutina(),
                LocalDate.now()
        );

        return toDto(saved);
    }

    @Transactional
    public void delete(Integer id) {
        RutinaEjercicio re = repo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("RutinaEjercicio no encontrado con id: " + id));
        Rutina rutina = re.getRutina();
        repo.deleteById(id);

        notificacionService.crear(
                rutina.getCliente().getIdUsuario(),
                "RUTINA_ACTUALIZADA",
                "Rutina actualizada",
                "Tu rutina '" + rutina.getNombre() + "' ha sido actualizada.",
                rutina.getIdRutina(),
                LocalDate.now()
        );
    }

    private RutinaEjercicioDto toDto(RutinaEjercicio re) {
        RutinaEjercicioDto dto = new RutinaEjercicioDto();
        dto.setIdRutinaEjercicio(re.getIdRutinaEjercicio());
        dto.setIdRutina(re.getRutina().getIdRutina());
        dto.setIdEjercicio(re.getEjercicio().getIdEjercicio());
        dto.setDiaSemana(re.getDiaSemana());
        dto.setSeries(re.getSeries());
        dto.setRepeticiones(re.getRepeticiones());
        dto.setDescansoSeg(re.getDescansoSeg());
        return dto;
    }
}
