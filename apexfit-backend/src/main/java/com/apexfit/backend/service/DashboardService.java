package com.apexfit.backend.service;

import com.apexfit.backend.dto.DashboardResumenDto;
import com.apexfit.backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DashboardService {

    private final UsuarioRepository usuarioRepository;
    private final MembresiaRepository membresiaRepository;
    private final AsistenciaRepository asistenciaRepository;
    private final EjercicioRepository ejercicioRepository;
    private final RutinaRepository rutinaRepository;

    public DashboardResumenDto getResumen() {
        long totalUsuarios = usuarioRepository.count();
        long totalActivos = usuarioRepository.countByEstado("activo");
        long totalEntrenadores = usuarioRepository.countByRol_NombreRol("entrenador");
        long totalMembresiasActivas = membresiaRepository.countByEstado("activa");
        long totalAsistenciasHoy = asistenciaRepository.countByFecha(LocalDate.now());
        long totalEjercicios = ejercicioRepository.count();
        long totalRutinas = rutinaRepository.count();

        // Conteo por método de registro
        Map<String, Long> asistenciasPorMetodo = asistenciaRepository.findAll().stream()
                .filter(a -> a.getMetodoRegistro() != null)
                .collect(Collectors.groupingBy(a -> a.getMetodoRegistro(), Collectors.counting()));

        return DashboardResumenDto.builder()
                .totalUsuarios(totalUsuarios)
                .totalClientesActivos(totalActivos)
                .totalEntrenadores(totalEntrenadores)
                .totalMembresiasActivas(totalMembresiasActivas)
                .totalAsistenciasHoy(totalAsistenciasHoy)
                .totalEjercicios(totalEjercicios)
                .totalRutinas(totalRutinas)
                .asistenciasPorMetodo(asistenciasPorMetodo)
                .build();
    }
}
