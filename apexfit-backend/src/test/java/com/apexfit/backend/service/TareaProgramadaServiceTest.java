package com.apexfit.backend.service;

import com.apexfit.backend.entity.*;
import com.apexfit.backend.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TareaProgramadaServiceTest {

    @Mock
    private MembresiaRepository membresiaRepository;
    @Mock
    private AsistenciaRepository asistenciaRepository;
    @Mock
    private RutinaRepository rutinaRepository;
    @Mock
    private UsuarioRepository usuarioRepository;
    @Mock
    private EntrenadorClienteRepository entrenadorClienteRepository;
    @Mock
    private ConfiguracionService configuracionService;
    @Mock
    private NotificacionService notificacionService;

    @InjectMocks
    private TareaProgramadaService tareaProgramadaService;

    private Usuario cliente;
    private Usuario admin;
    private Usuario entrenador;
    private LocalDate hoy;

    @BeforeEach
    void setUp() {
        hoy = LocalDate.of(2026, 10, 30); // Viernes

        Rol rolCliente = new Rol(3, "cliente");
        Rol rolAdmin = new Rol(1, "administrador");
        Rol rolEntrenador = new Rol(2, "entrenador");

        cliente = new Usuario();
        cliente.setIdUsuario(10);
        cliente.setNombre("Ana");
        cliente.setApellido("Gomez");
        cliente.setRol(rolCliente);
        cliente.setEstado("activo");

        admin = new Usuario();
        admin.setIdUsuario(1);
        admin.setNombre("Admin");
        admin.setApellido("Apex");
        admin.setRol(rolAdmin);
        admin.setEstado("activo");

        entrenador = new Usuario();
        entrenador.setIdUsuario(2);
        entrenador.setNombre("Pedro");
        entrenador.setApellido("Entrenador");
        entrenador.setRol(rolEntrenador);
        entrenador.setEstado("activo");

        lenient().when(configuracionService.getDiasInactividad()).thenReturn(10);
        lenient().when(usuarioRepository.findByRol_NombreRolIgnoreCaseAndEstadoIgnoreCase(eq("cliente"), any())).thenReturn(Collections.emptyList());
        lenient().when(usuarioRepository.findByRol_NombreRolIgnoreCaseAndEstadoIgnoreCase(eq("administrador"), any())).thenReturn(Collections.emptyList());
    }

    @Test
    @DisplayName("ejecutarTareaDiaria: actualiza membresías pasadas a 'vencida'")
    void actualizarMembresiasVencidas() {
        Membresia m = new Membresia();
        m.setIdMembresia(101);
        m.setUsuario(cliente);
        m.setTipo("Mensual");
        m.setFechaInicio(hoy.minusDays(40));
        m.setFechaFin(hoy.minusDays(5));
        m.setEstado("activa");
        m.setPrecio(BigDecimal.valueOf(100));

        when(membresiaRepository.findByEstadoAndFechaFinLessThan("activa", hoy))
                .thenReturn(List.of(m));

        tareaProgramadaService.ejecutarTareaDiaria(hoy);

        assertEquals("vencida", m.getEstado());
        verify(membresiaRepository).saveAll(List.of(m));
    }

    @Test
    @DisplayName("ejecutarTareaDiaria: notifica membresías por vencer a 7, 3 y 1 días")
    void notificaMembresiasPorVencer() {
        Membresia m7 = new Membresia();
        m7.setIdMembresia(1);
        m7.setUsuario(cliente);
        m7.setTipo("Trimestral");
        m7.setFechaInicio(hoy.minusDays(83));
        m7.setFechaFin(hoy.plusDays(7));
        m7.setEstado("activa");
        m7.setPrecio(BigDecimal.valueOf(200));

        Membresia m3 = new Membresia();
        m3.setIdMembresia(2);
        m3.setUsuario(cliente);
        m3.setTipo("Mensual");
        m3.setFechaInicio(hoy.minusDays(27));
        m3.setFechaFin(hoy.plusDays(3));
        m3.setEstado("activa");
        m3.setPrecio(BigDecimal.valueOf(100));

        Membresia m1 = new Membresia();
        m1.setIdMembresia(3);
        m1.setUsuario(cliente);
        m1.setTipo("Mensual");
        m1.setFechaInicio(hoy.minusDays(29));
        m1.setFechaFin(hoy.plusDays(1));
        m1.setEstado("activa");
        m1.setPrecio(BigDecimal.valueOf(100));

        when(membresiaRepository.findByEstado("activa")).thenReturn(List.of(m7, m3, m1));

        tareaProgramadaService.ejecutarTareaDiaria(hoy);

        verify(notificacionService).crear(eq(10), eq("MEMBRESIA_POR_VENCER"), eq("Membresía por vencer"), contains("7 días"), eq(1), eq(hoy));
        verify(notificacionService).crear(eq(10), eq("MEMBRESIA_POR_VENCER"), eq("Membresía por vencer"), contains("3 días"), eq(2), eq(hoy));
        verify(notificacionService).crear(eq(10), eq("MEMBRESIA_POR_VENCER"), eq("Membresía por vencer"), contains("mañana"), eq(3), eq(hoy));
    }

    @Test
    @DisplayName("ejecutarTareaDiaria: notifica CLIENTE_INACTIVO con fecha_clave en el lunes de la semana")
    void notificaClienteInactivo() {
        when(usuarioRepository.findByRol_NombreRolIgnoreCaseAndEstadoIgnoreCase("cliente", "activo"))
                .thenReturn(List.of(cliente));

        Membresia m = new Membresia();
        m.setIdMembresia(10);
        m.setUsuario(cliente);
        m.setEstado("activa");
        m.setFechaFin(hoy.plusDays(10));
        when(membresiaRepository.findByUsuario_IdUsuarioAndEstado(10, "activa")).thenReturn(List.of(m));

        // Asistió hace 15 días (mayor que 10)
        when(asistenciaRepository.findUltimaFechaAsistencia(10)).thenReturn(hoy.minusDays(15));

        EntrenadorCliente ec = new EntrenadorCliente();
        ec.setEntrenador(entrenador);
        ec.setCliente(cliente);
        ec.setEstado("activa");
        when(entrenadorClienteRepository.findByCliente_IdUsuarioAndEstadoIgnoreCase(10, "activa"))
                .thenReturn(List.of(ec));

        LocalDate lunes = hoy.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));

        tareaProgramadaService.ejecutarTareaDiaria(hoy);

        // Cliente recibe CLIENTE_INACTIVO con referencia_id=0 y fecha_clave=lunes
        verify(notificacionService).crear(eq(10), eq("CLIENTE_INACTIVO"), anyString(), contains("10 días"), eq(0), eq(lunes));
        // Entrenador recibe CLIENTE_INACTIVO con referencia_id=idCliente y fecha_clave=lunes
        verify(notificacionService).crear(eq(2), eq("CLIENTE_INACTIVO"), anyString(), contains("10 días"), eq(10), eq(lunes));
    }

    @Test
    @DisplayName("ejecutarTareaDiaria: notifica CLIENTE_SIN_RUTINA al cliente y sus entrenadores vigentes")
    void notificaClienteSinRutina() {
        when(usuarioRepository.findByRol_NombreRolIgnoreCaseAndEstadoIgnoreCase("cliente", "activo"))
                .thenReturn(List.of(cliente));

        Membresia m = new Membresia();
        m.setIdMembresia(10);
        m.setUsuario(cliente);
        m.setEstado("activa");
        m.setFechaFin(hoy.plusDays(10));
        when(membresiaRepository.findByUsuario_IdUsuarioAndEstado(10, "activa")).thenReturn(List.of(m));

        when(rutinaRepository.findByCliente_IdUsuario(10)).thenReturn(Collections.emptyList());

        EntrenadorCliente ec = new EntrenadorCliente();
        ec.setEntrenador(entrenador);
        ec.setCliente(cliente);
        ec.setEstado("activa");
        when(entrenadorClienteRepository.findByCliente_IdUsuarioAndEstadoIgnoreCase(10, "activa"))
                .thenReturn(List.of(ec));

        tareaProgramadaService.ejecutarTareaDiaria(hoy);

        verify(notificacionService).crear(eq(10), eq("CLIENTE_SIN_RUTINA"), anyString(), anyString(), eq(0), eq(hoy));
        verify(notificacionService).crear(eq(2), eq("CLIENTE_SIN_RUTINA"), anyString(), anyString(), eq(10), eq(hoy));
    }

    @Test
    @DisplayName("ejecutarTareaDiaria: genera resúmenes diarios de membresías e inactivos para los administradores")
    void generaResumenesAdmin() {
        when(usuarioRepository.findByRol_NombreRolIgnoreCaseAndEstadoIgnoreCase("administrador", "activo"))
                .thenReturn(List.of(admin));

        tareaProgramadaService.ejecutarTareaDiaria(hoy);

        verify(notificacionService).crear(eq(1), eq("RESUMEN_MEMBRESIAS"), anyString(), anyString(), eq(0), eq(hoy));
        verify(notificacionService).crear(eq(1), eq("RESUMEN_INACTIVOS"), anyString(), anyString(), eq(0), eq(hoy));
    }
}
