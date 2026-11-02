package com.apexfit.backend.service;

import com.apexfit.backend.dto.*;
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
import java.time.LocalDate;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EventosNotificacionTest {

    @Mock
    private NotificacionService notificacionService;
    @Mock
    private UsuarioRepository usuarioRepository;
    @Mock
    private EntrenadorClienteRepository entrenadorClienteRepository;
    @Mock
    private RutinaRepository rutinaRepository;
    @Mock
    private RutinaEjercicioRepository rutinaEjercicioRepository;
    @Mock
    private EjercicioRepository ejercicioRepository;
    @Mock
    private MembresiaRepository membresiaRepository;
    @Mock
    private SesionEntrenamientoRepository sesionEntrenamientoRepository;

    private Usuario cliente;
    private Usuario entrenador;
    private Rutina rutina;

    @BeforeEach
    void setUp() {
        cliente = new Usuario();
        cliente.setIdUsuario(10);
        cliente.setNombre("Carlos");
        cliente.setApellido("Gomez");

        entrenador = new Usuario();
        entrenador.setIdUsuario(5);
        entrenador.setNombre("Laura");
        entrenador.setApellido("Perez");

        rutina = new Rutina();
        rutina.setIdRutina(1);
        rutina.setNombre("Fuerza");
        rutina.setCliente(cliente);
        rutina.setEntrenador(entrenador);
        rutina.setEstado("activa");
    }

    @Test
    @DisplayName("EntrenadorClienteService.create dispara ENTRENADOR_ASIGNADO y CLIENTE_ASIGNADO")
    void testEntrenadorClienteCreate() {
        EntrenadorClienteService service = new EntrenadorClienteService(entrenadorClienteRepository, usuarioRepository, notificacionService);

        when(usuarioRepository.findById(5)).thenReturn(Optional.of(entrenador));
        when(usuarioRepository.findById(10)).thenReturn(Optional.of(cliente));
        when(entrenadorClienteRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        EntrenadorClienteDto dto = new EntrenadorClienteDto();
        dto.setIdEntrenador(5);
        dto.setIdCliente(10);
        dto.setEstado("activa");

        service.create(dto);

        verify(notificacionService).crear(eq(10), eq("ENTRENADOR_ASIGNADO"), anyString(), contains("Laura Perez"), eq(5), any());
        verify(notificacionService).crear(eq(5), eq("CLIENTE_ASIGNADO"), anyString(), contains("Carlos Gomez"), eq(10), any());
    }

    @Test
    @DisplayName("RutinaEjercicioService.create (primer ejercicio) dispara RUTINA_ASIGNADA")
    void testRutinaEjercicioPrimerEjercicio() {
        RutinaEjercicioService service = new RutinaEjercicioService(rutinaEjercicioRepository, rutinaRepository, ejercicioRepository, notificacionService);

        Ejercicio ejercicio = new Ejercicio();
        ejercicio.setIdEjercicio(20);

        when(rutinaRepository.findById(1)).thenReturn(Optional.of(rutina));
        when(ejercicioRepository.findById(20)).thenReturn(Optional.of(ejercicio));
        when(rutinaEjercicioRepository.findByRutina_IdRutina(1)).thenReturn(Collections.emptyList());
        when(rutinaEjercicioRepository.save(any())).thenAnswer(invocation -> {
            RutinaEjercicio re = invocation.getArgument(0);
            re.setIdRutinaEjercicio(100);
            return re;
        });

        RutinaEjercicioDto dto = new RutinaEjercicioDto();
        dto.setIdRutina(1);
        dto.setIdEjercicio(20);
        dto.setSeries((short) 4);
        dto.setRepeticiones((short) 10);

        service.create(dto);

        verify(notificacionService).crear(eq(10), eq("RUTINA_ASIGNADA"), anyString(), contains("Fuerza"), eq(1), any());
    }

    @Test
    @DisplayName("RutinaEjercicioService.create (segundo ejercicio) dispara RUTINA_ACTUALIZADA")
    void testRutinaEjercicioSegundoEjercicio() {
        RutinaEjercicioService service = new RutinaEjercicioService(rutinaEjercicioRepository, rutinaRepository, ejercicioRepository, notificacionService);

        Ejercicio ejercicio = new Ejercicio();
        ejercicio.setIdEjercicio(21);

        when(rutinaRepository.findById(1)).thenReturn(Optional.of(rutina));
        when(ejercicioRepository.findById(21)).thenReturn(Optional.of(ejercicio));
        when(rutinaEjercicioRepository.findByRutina_IdRutina(1)).thenReturn(List.of(new RutinaEjercicio()));
        when(rutinaEjercicioRepository.save(any())).thenAnswer(invocation -> {
            RutinaEjercicio re = invocation.getArgument(0);
            re.setIdRutinaEjercicio(101);
            return re;
        });

        RutinaEjercicioDto dto = new RutinaEjercicioDto();
        dto.setIdRutina(1);
        dto.setIdEjercicio(21);
        dto.setSeries((short) 4);
        dto.setRepeticiones((short) 10);

        service.create(dto);

        verify(notificacionService).crear(eq(10), eq("RUTINA_ACTUALIZADA"), anyString(), contains("Fuerza"), eq(1), any());
    }

    @Test
    @DisplayName("RutinaService.updateRutina dispara RUTINA_ACTUALIZADA")
    void testRutinaUpdate() {
        RutinaService service = new RutinaService(rutinaRepository, usuarioRepository, notificacionService);

        when(rutinaRepository.findById(1)).thenReturn(Optional.of(rutina));
        when(usuarioRepository.findById(5)).thenReturn(Optional.of(entrenador));
        when(usuarioRepository.findById(10)).thenReturn(Optional.of(cliente));
        when(rutinaRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        RutinaDto dto = new RutinaDto();
        dto.setNombre("Fuerza Avanzada");
        dto.setIdEntrenador(5);
        dto.setIdCliente(10);

        service.updateRutina(1, dto);

        verify(notificacionService).crear(eq(10), eq("RUTINA_ACTUALIZADA"), anyString(), contains("Fuerza Avanzada"), eq(1), any());
    }

    @Test
    @DisplayName("MembresiaService.create y update disparan MEMBRESIA_RENOVADA")
    void testMembresiaEvents() {
        MembresiaService service = new MembresiaService(membresiaRepository, usuarioRepository, notificacionService);

        Membresia m = new Membresia();
        m.setIdMembresia(50);
        m.setUsuario(cliente);
        m.setTipo("Semestral");
        m.setFechaFin(LocalDate.now().plusMonths(6));

        when(usuarioRepository.findById(10)).thenReturn(Optional.of(cliente));
        when(membresiaRepository.save(any())).thenReturn(m);

        MembresiaDto dto = new MembresiaDto();
        dto.setIdUsuario(10);
        dto.setTipo("Semestral");
        dto.setFechaInicio(LocalDate.now());
        dto.setFechaFin(LocalDate.now().plusMonths(6));
        dto.setPrecio(BigDecimal.valueOf(300));

        service.create(dto);

        verify(notificacionService).crear(eq(10), eq("MEMBRESIA_RENOVADA"), anyString(), contains("Semestral"), eq(50), any());
    }

    @Test
    @DisplayName("SesionEntrenamientoService.guardarAvanceHoy dispara SESION_TERMINADA al pasar terminada a true")
    void testSesionTerminadaEvent() {
        SesionEntrenamientoService service = new SesionEntrenamientoService(
                sesionEntrenamientoRepository, rutinaRepository, rutinaEjercicioRepository,
                usuarioRepository, entrenadorClienteRepository, notificacionService);

        when(rutinaRepository.findById(1)).thenReturn(Optional.of(rutina));
        when(usuarioRepository.findById(10)).thenReturn(Optional.of(cliente));

        RutinaEjercicio re1 = new RutinaEjercicio();
        re1.setIdRutinaEjercicio(101);
        re1.setRutina(rutina);

        when(rutinaEjercicioRepository.findByRutina_IdRutina(1)).thenReturn(List.of(re1));

        SesionEntrenamiento sesionExistente = new SesionEntrenamiento();
        sesionExistente.setIdSesion(999L);
        sesionExistente.setUsuario(cliente);
        sesionExistente.setRutina(rutina);
        sesionExistente.setFecha(LocalDate.now());
        sesionExistente.setTerminada(false); // Estaba en false

        when(sesionEntrenamientoRepository.findByUsuario_IdUsuarioAndFecha(eq(10), any()))
                .thenReturn(Optional.of(sesionExistente));
        when(sesionEntrenamientoRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        EntrenadorCliente ac = new EntrenadorCliente();
        ac.setEntrenador(entrenador);
        ac.setCliente(cliente);
        ac.setEstado("activa");
        when(entrenadorClienteRepository.findByCliente_IdUsuarioAndEstadoIgnoreCase(10, "activa"))
                .thenReturn(List.of(ac));

        SesionEntrenamientoRequest request = new SesionEntrenamientoRequest();
        request.setIdRutina(1);
        request.setTerminada(true); // Cambia a true
        SesionEntrenamientoRequest.EjercicioAvance avance = new SesionEntrenamientoRequest.EjercicioAvance();
        avance.setIdRutinaEjercicio(101);
        avance.setEstado("completado");
        request.setEjercicios(List.of(avance));

        service.guardarAvanceHoy(10, request);

        // Notificación de SESION_TERMINADA al entrenador
        verify(notificacionService).crear(
                eq(5),
                eq("SESION_TERMINADA"),
                anyString(),
                contains("1 completados, 0 aplazados"),
                eq(999),
                any()
        );
    }
}

