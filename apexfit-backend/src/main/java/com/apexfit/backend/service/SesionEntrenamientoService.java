package com.apexfit.backend.service;

import com.apexfit.backend.dto.SesionEntrenamientoRequest;
import com.apexfit.backend.dto.SesionEntrenamientoResponse;
import com.apexfit.backend.dto.SesionHistorialDto;
import com.apexfit.backend.entity.*;
import com.apexfit.backend.exception.ResourceNotFoundException;
import com.apexfit.backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SesionEntrenamientoService {

    private final SesionEntrenamientoRepository sesionRepo;
    private final RutinaRepository rutinaRepo;
    private final RutinaEjercicioRepository rutinaEjercicioRepo;
    private final UsuarioRepository usuarioRepo;
    private final EntrenadorClienteRepository entrenadorClienteRepo;
    private final NotificacionService notificacionService;

    // ── PUT /hoy ─────────────────────────────────────────────────────────
    @Transactional
    public SesionEntrenamientoResponse guardarAvanceHoy(Integer idUsuario, SesionEntrenamientoRequest request) {

        // 1. Verificar que la rutina exista
        Rutina rutina = rutinaRepo.findById(request.getIdRutina())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Rutina no encontrada con id: " + request.getIdRutina()));

        // 2. Verificar que la rutina pertenezca al cliente autenticado
        if (!rutina.getCliente().getIdUsuario().equals(idUsuario)) {
            throw new org.springframework.security.access.AccessDeniedException(
                    "La rutina no pertenece al cliente autenticado.");
        }

        // 3. Obtener los rutina_ejercicio válidos de esa rutina
        List<RutinaEjercicio> ejerciciosDeRutina = rutinaEjercicioRepo.findByRutina_IdRutina(request.getIdRutina());
        Set<Integer> idsValidos = ejerciciosDeRutina.stream()
                .map(RutinaEjercicio::getIdRutinaEjercicio)
                .collect(Collectors.toSet());

        // 4. Validar que todos los idRutinaEjercicio del request pertenezcan a esa rutina
        for (SesionEntrenamientoRequest.EjercicioAvance ej : request.getEjercicios()) {
            if (!idsValidos.contains(ej.getIdRutinaEjercicio())) {
                throw new RuntimeException(
                        "El rutina-ejercicio con id " + ej.getIdRutinaEjercicio()
                        + " no pertenece a la rutina " + request.getIdRutina());
            }
            // Validar estado
            try {
                SesionEjercicio.EstadoEjercicio.valueOf(ej.getEstado());
            } catch (IllegalArgumentException e) {
                throw new RuntimeException(
                        "Estado inválido: '" + ej.getEstado()
                        + "'. Valores permitidos: completado, aplazado, pendiente");
            }
        }

        // 5. Upsert: buscar sesión de hoy o crear nueva
        LocalDate hoy = LocalDate.now();
        Usuario usuario = usuarioRepo.findById(idUsuario)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado con id: " + idUsuario));

        SesionEntrenamiento sesion = sesionRepo
                .findByUsuario_IdUsuarioAndFecha(idUsuario, hoy)
                .orElseGet(() -> {
                    SesionEntrenamiento nueva = new SesionEntrenamiento();
                    nueva.setUsuario(usuario);
                    nueva.setRutina(rutina);
                    nueva.setFecha(hoy);
                    return nueva;
                });

        boolean eraTerminada = Boolean.TRUE.equals(sesion.getTerminada());
        boolean ahoraTerminada = Boolean.TRUE.equals(request.getTerminada());
        boolean transicionTerminada = ahoraTerminada && !eraTerminada;

        // Actualizar campos de la sesión
        sesion.setRutina(rutina);
        sesion.setTerminada(request.getTerminada());

        // 6. Sincronizar ejercicios: crear un mapa de los existentes por idRutinaEjercicio
        Map<Integer, SesionEjercicio> existentes = sesion.getEjercicios().stream()
                .collect(Collectors.toMap(
                        se -> se.getRutinaEjercicio().getIdRutinaEjercicio(),
                        se -> se));

        // Preparar mapa de RutinaEjercicio por id
        Map<Integer, RutinaEjercicio> reMap = ejerciciosDeRutina.stream()
                .collect(Collectors.toMap(RutinaEjercicio::getIdRutinaEjercicio, re -> re));

        List<SesionEjercicio> nuevaLista = new ArrayList<>();
        for (SesionEntrenamientoRequest.EjercicioAvance avance : request.getEjercicios()) {
            SesionEjercicio.EstadoEjercicio estado = SesionEjercicio.EstadoEjercicio.valueOf(avance.getEstado());

            SesionEjercicio se = existentes.get(avance.getIdRutinaEjercicio());
            if (se == null) {
                se = new SesionEjercicio();
                se.setSesion(sesion);
                se.setRutinaEjercicio(reMap.get(avance.getIdRutinaEjercicio()));
            }
            se.setEstado(estado);
            se.setCompletadoEn(estado == SesionEjercicio.EstadoEjercicio.completado
                    ? LocalDateTime.now() : null);
            nuevaLista.add(se);
        }

        sesion.getEjercicios().clear();
        sesion.getEjercicios().addAll(nuevaLista);

        SesionEntrenamiento saved = sesionRepo.save(sesion);

        if (transicionTerminada) {
            long completados = saved.getEjercicios().stream()
                    .filter(se -> se.getEstado() == SesionEjercicio.EstadoEjercicio.completado)
                    .count();
            long aplazados = saved.getEjercicios().stream()
                    .filter(se -> se.getEstado() == SesionEjercicio.EstadoEjercicio.aplazado)
                    .count();

            List<EntrenadorCliente> asignaciones = entrenadorClienteRepo.findByCliente_IdUsuarioAndEstadoIgnoreCase(idUsuario, "activa");
            Set<Integer> idsEntrenadores = asignaciones.stream()
                    .map(ac -> ac.getEntrenador().getIdUsuario())
                    .collect(Collectors.toSet());

            if (rutina.getEntrenador() != null) {
                idsEntrenadores.add(rutina.getEntrenador().getIdUsuario());
            }

            String nombreCliente = usuario.getNombre() + " " + usuario.getApellido();
            String mensaje = "El cliente " + nombreCliente + " completó su entrenamiento: "
                    + completados + " completados, " + aplazados + " aplazados.";

            for (Integer idEntrenador : idsEntrenadores) {
                notificacionService.crear(
                        idEntrenador,
                        "SESION_TERMINADA",
                        "Sesión finalizada",
                        mensaje,
                        saved.getIdSesion().intValue(),
                        saved.getFecha()
                );
            }
        }

        return mapToResponse(saved);
    }

    // ── GET /hoy ─────────────────────────────────────────────────────────
    public SesionEntrenamientoResponse obtenerAvanceHoy(Integer idUsuario) {
        LocalDate hoy = LocalDate.now();
        SesionEntrenamiento sesion = sesionRepo
                .findByUsuario_IdUsuarioAndFecha(idUsuario, hoy)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "No hay sesión de entrenamiento registrada para hoy."));
        return mapToResponse(sesion);
    }

    // ── GET /usuario/{id}?desde=&hasta= ──────────────────────────────────
    public List<SesionHistorialDto> obtenerHistorial(Integer idSolicitante, String rolSolicitante,
                                                      Integer idCliente,
                                                      LocalDate desde, LocalDate hasta) {

        // Validar permisos según rol
        if (rolSolicitante.contains("CLIENTE")) {
            // Un cliente solo puede ver su propio historial
            if (!idSolicitante.equals(idCliente)) {
                throw new org.springframework.security.access.AccessDeniedException(
                        "Un cliente solo puede consultar su propio historial.");
            }
        } else if (rolSolicitante.contains("ENTRENADOR")) {
            // Un entrenador solo puede ver historial de sus clientes asignados
            boolean esCliente = entrenadorClienteRepo
                    .findByEntrenador_IdUsuario(idSolicitante).stream()
                    .anyMatch(ec -> ec.getCliente().getIdUsuario().equals(idCliente)
                                    && "activa".equalsIgnoreCase(ec.getEstado()));
            if (!esCliente) {
                throw new org.springframework.security.access.AccessDeniedException(
                        "El entrenador no tiene asignado al cliente con id: " + idCliente);
            }
        }
        // ADMINISTRADOR puede ver cualquiera → no se filtra

        // Verificar que el cliente exista
        if (!usuarioRepo.existsById(idCliente)) {
            throw new ResourceNotFoundException("Usuario no encontrado con id: " + idCliente);
        }

        List<SesionEntrenamiento> sesiones = sesionRepo
                .findByUsuario_IdUsuarioAndFechaBetweenOrderByFechaDesc(idCliente, desde, hasta);

        return sesiones.stream().map(this::mapToHistorial).collect(Collectors.toList());
    }

    // ── Mappers ──────────────────────────────────────────────────────────

    private SesionEntrenamientoResponse mapToResponse(SesionEntrenamiento sesion) {
        SesionEntrenamientoResponse resp = new SesionEntrenamientoResponse();
        resp.setIdSesion(sesion.getIdSesion());
        resp.setFecha(sesion.getFecha());
        resp.setIdRutina(sesion.getRutina().getIdRutina());
        resp.setTerminada(sesion.getTerminada());
        resp.setEjercicios(sesion.getEjercicios().stream().map(se -> {
            SesionEntrenamientoResponse.EjercicioDetalle det = new SesionEntrenamientoResponse.EjercicioDetalle();
            det.setIdRutinaEjercicio(se.getRutinaEjercicio().getIdRutinaEjercicio());
            det.setEstado(se.getEstado().name());
            return det;
        }).collect(Collectors.toList()));
        return resp;
    }

    private SesionHistorialDto mapToHistorial(SesionEntrenamiento sesion) {
        SesionHistorialDto dto = new SesionHistorialDto();
        dto.setFecha(sesion.getFecha());
        dto.setIdRutina(sesion.getRutina().getIdRutina());
        dto.setTerminada(sesion.getTerminada());

        long total = sesion.getEjercicios().size();
        long completados = sesion.getEjercicios().stream()
                .filter(se -> se.getEstado() == SesionEjercicio.EstadoEjercicio.completado)
                .count();
        long aplazados = sesion.getEjercicios().stream()
                .filter(se -> se.getEstado() == SesionEjercicio.EstadoEjercicio.aplazado)
                .count();

        dto.setTotal(total);
        dto.setCompletados(completados);
        dto.setAplazados(aplazados);
        return dto;
    }
}
