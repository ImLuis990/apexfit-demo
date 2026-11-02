package com.apexfit.backend.service;

import com.apexfit.backend.entity.EntrenadorCliente;
import com.apexfit.backend.entity.Membresia;
import com.apexfit.backend.entity.Rutina;
import com.apexfit.backend.entity.Usuario;
import com.apexfit.backend.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.time.temporal.TemporalAdjusters;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class TareaProgramadaService {

    public static final ZoneId ZONA_BOGOTA = ZoneId.of("America/Bogota");

    private final MembresiaRepository membresiaRepository;
    private final AsistenciaRepository asistenciaRepository;
    private final RutinaRepository rutinaRepository;
    private final UsuarioRepository usuarioRepository;
    private final EntrenadorClienteRepository entrenadorClienteRepository;
    private final ConfiguracionService configuracionService;
    private final NotificacionService notificacionService;

    @Scheduled(cron = "0 0 6 * * *", zone = "America/Bogota")
    @Transactional
    public void ejecutarTareaDiaria() {
        LocalDate hoy = LocalDate.now(ZONA_BOGOTA);
        log.info("Ejecutando tarea diaria programada para la fecha: {}", hoy);
        ejecutarTareaDiaria(hoy);
    }

    @Transactional
    public void ejecutarTareaDiaria(LocalDate hoy) {
        // 1. Opcional: Pasar a 'vencida' las de fecha_fin pasada
        actualizarMembresiasVencidas(hoy);

        // 2. Membresías por vencer (7, 3, 1) y vencida
        procesarNotificacionesMembresia(hoy);

        // 3. CLIENTE_INACTIVO
        int inactivosCount = procesarClientesInactivos(hoy);

        // 4. CLIENTE_SIN_RUTINA
        procesarClientesSinRutina(hoy);

        // 5. Resúmenes de membresías e inactivos para el admin
        procesarResumenesAdmin(hoy, inactivosCount);
    }

    private void actualizarMembresiasVencidas(LocalDate hoy) {
        List<Membresia> activasPasadas = membresiaRepository.findByEstadoAndFechaFinLessThan("activa", hoy);
        for (Membresia m : activasPasadas) {
            m.setEstado("vencida");
        }
        if (!activasPasadas.isEmpty()) {
            membresiaRepository.saveAll(activasPasadas);
            log.info("Se actualizaron {} membresías vencidas pasadas", activasPasadas.size());
        }
    }

    private void procesarNotificacionesMembresia(LocalDate hoy) {
        List<Membresia> activas = membresiaRepository.findByEstado("activa");
        for (Membresia m : activas) {
            long diasRestantes = ChronoUnit.DAYS.between(hoy, m.getFechaFin());
            if (diasRestantes == 7 || diasRestantes == 3 || diasRestantes == 1) {
                String mensaje = (diasRestantes == 1)
                        ? "Tu membresía vencerá mañana (" + m.getFechaFin() + ")."
                        : "Tu membresía vencerá en " + diasRestantes + " días (" + m.getFechaFin() + ").";

                notificacionService.crear(
                        m.getUsuario().getIdUsuario(),
                        "MEMBRESIA_POR_VENCER",
                        "Membresía por vencer",
                        mensaje,
                        m.getIdMembresia(),
                        hoy
                );
            }
        }

        // Vencidas recientemente: aquellas cuyo fin fue ayer
        List<Membresia> vencidasAyer = membresiaRepository.findByEstadoAndFechaFin("vencida", hoy.minusDays(1));
        for (Membresia m : vencidasAyer) {
            notificacionService.crear(
                    m.getUsuario().getIdUsuario(),
                    "MEMBRESIA_VENCIDA",
                    "Membresía vencida",
                    "Tu membresía ha vencido (" + m.getFechaFin() + "). Renuévala para continuar entrenando.",
                    m.getIdMembresia(),
                    hoy
            );
        }
    }

    private int procesarClientesInactivos(LocalDate hoy) {
        int diasInactividad = configuracionService.getDiasInactividad();
        LocalDate lunesSemana = hoy.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));

        List<Usuario> clientes = usuarioRepository.findByRol_NombreRolIgnoreCaseAndEstadoIgnoreCase("cliente", "activo");
        int inactivosCount = 0;

        for (Usuario c : clientes) {
            // Requiere membresía activa vigente (no vencida)
            List<Membresia> membresias = membresiaRepository.findByUsuario_IdUsuarioAndEstado(c.getIdUsuario(), "activa");
            boolean tieneVigente = membresias.stream().anyMatch(m -> !m.getFechaFin().isBefore(hoy));
            if (!tieneVigente) {
                continue;
            }

            LocalDate ultimaAsistencia = asistenciaRepository.findUltimaFechaAsistencia(c.getIdUsuario());
            boolean esInactivo = (ultimaAsistencia == null) || (ChronoUnit.DAYS.between(ultimaAsistencia, hoy) > diasInactividad);

            if (esInactivo) {
                inactivosCount++;

                // Notificación al cliente
                notificacionService.crear(
                        c.getIdUsuario(),
                        "CLIENTE_INACTIVO",
                        "Llevas tiempo sin asistir",
                        "Llevas más de " + diasInactividad + " días sin registrar asistencia. ¡Te esperamos para entrenar!",
                        0,
                        lunesSemana
                );

                // Notificación a sus entrenadores vigentes
                List<EntrenadorCliente> asignaciones = entrenadorClienteRepository.findByCliente_IdUsuarioAndEstadoIgnoreCase(c.getIdUsuario(), "activa");
                for (EntrenadorCliente ec : asignaciones) {
                    notificacionService.crear(
                            ec.getEntrenador().getIdUsuario(),
                            "CLIENTE_INACTIVO",
                            "Cliente inactivo",
                            "Tu cliente " + c.getNombre() + " " + c.getApellido() + " lleva más de " + diasInactividad + " días sin asistir.",
                            c.getIdUsuario(),
                            lunesSemana
                    );
                }
            }
        }
        return inactivosCount;
    }

    private void procesarClientesSinRutina(LocalDate hoy) {
        List<Usuario> clientes = usuarioRepository.findByRol_NombreRolIgnoreCaseAndEstadoIgnoreCase("cliente", "activo");

        for (Usuario c : clientes) {
            List<Membresia> membresias = membresiaRepository.findByUsuario_IdUsuarioAndEstado(c.getIdUsuario(), "activa");
            boolean tieneVigente = membresias.stream().anyMatch(m -> !m.getFechaFin().isBefore(hoy));
            if (!tieneVigente) {
                continue;
            }

            List<Rutina> rutinas = rutinaRepository.findByCliente_IdUsuario(c.getIdUsuario());
            boolean tieneRutinaActiva = rutinas.stream().anyMatch(r -> "activa".equalsIgnoreCase(r.getEstado()));

            if (!tieneRutinaActiva) {
                // Notificar a entrenadores vigentes
                List<EntrenadorCliente> asignaciones = entrenadorClienteRepository.findByCliente_IdUsuarioAndEstadoIgnoreCase(c.getIdUsuario(), "activa");
                for (EntrenadorCliente ec : asignaciones) {
                    notificacionService.crear(
                            ec.getEntrenador().getIdUsuario(),
                            "CLIENTE_SIN_RUTINA",
                            "Cliente sin rutina",
                            "El cliente " + c.getNombre() + " " + c.getApellido() + " no tiene una rutina activa asignada.",
                            c.getIdUsuario(),
                            hoy
                    );
                }

                // Notificar al cliente
                notificacionService.crear(
                        c.getIdUsuario(),
                        "CLIENTE_SIN_RUTINA",
                        "Sin rutina asignada",
                        "Aún no tienes una rutina asignada. Tu entrenador la preparará pronto.",
                        0,
                        hoy
                );
            }
        }
    }

    private void procesarResumenesAdmin(LocalDate hoy, int inactivosCount) {
        List<Usuario> admins = usuarioRepository.findByRol_NombreRolIgnoreCaseAndEstadoIgnoreCase("administrador", "activo");
        if (admins.isEmpty()) {
            return;
        }

        // Membresías activas que vencen en los próximos 7 días
        long porVencer7Dias = membresiaRepository.findByEstado("activa").stream()
                .filter(m -> {
                    long dias = ChronoUnit.DAYS.between(hoy, m.getFechaFin());
                    return dias >= 0 && dias <= 7;
                })
                .count();

        long vencidasAyer = membresiaRepository.countByEstadoAndFechaFin("vencida", hoy.minusDays(1));

        String mensajeMembresias = "Hay " + porVencer7Dias + " membresía(s) por vencer en los próximos 7 días y "
                + vencidasAyer + " vencida(s) recientemente.";

        String mensajeInactivos = "Hay " + inactivosCount + " cliente(s) inactivo(s) (más de "
                + configuracionService.getDiasInactividad() + " días sin asistir).";

        for (Usuario admin : admins) {
            notificacionService.crear(
                    admin.getIdUsuario(),
                    "RESUMEN_MEMBRESIAS",
                    "Resumen de membresías",
                    mensajeMembresias,
                    0,
                    hoy
            );

            notificacionService.crear(
                    admin.getIdUsuario(),
                    "RESUMEN_INACTIVOS",
                    "Resumen de clientes inactivos",
                    mensajeInactivos,
                    0,
                    hoy
            );
        }
    }
}

