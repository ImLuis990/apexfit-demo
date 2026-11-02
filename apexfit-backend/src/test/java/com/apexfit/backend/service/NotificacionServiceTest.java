package com.apexfit.backend.service;

import com.apexfit.backend.dto.NotificacionResponseDto;
import com.apexfit.backend.entity.Notificacion;
import com.apexfit.backend.entity.Usuario;
import com.apexfit.backend.exception.ResourceNotFoundException;
import com.apexfit.backend.repository.NotificacionRepository;
import com.apexfit.backend.repository.UsuarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class NotificacionServiceTest {

    @Mock
    private NotificacionRepository notificacionRepository;

    @Mock
    private UsuarioRepository usuarioRepository;

    @InjectMocks
    private NotificacionService notificacionService;

    private Usuario usuario;
    private Notificacion notificacion;

    @BeforeEach
    void setUp() {
        usuario = new Usuario();
        usuario.setIdUsuario(10);
        usuario.setNombre("Carlos");
        usuario.setApellido("Perez");

        notificacion = new Notificacion();
        notificacion.setIdNotificacion(100L);
        notificacion.setUsuario(usuario);
        notificacion.setTipo("ENTRENADOR_ASIGNADO");
        notificacion.setTitulo("Entrenador asignado");
        notificacion.setMensaje("Se te asignó un entrenador");
        notificacion.setReferenciaId(5);
        notificacion.setFechaClave(LocalDate.now());
        notificacion.setCreadaEn(LocalDateTime.now());
    }

    @Test
    @DisplayName("crear: inserta ignorando duplicados con insertIgnore nativo")
    void crearExitosoConInsertIgnore() {
        when(notificacionRepository.insertIgnore(eq(10), eq("ENTRENADOR_ASIGNADO"), anyString(), anyString(), eq(5), any(), any()))
                .thenReturn(1);

        boolean creada = notificacionService.crear(10, "ENTRENADOR_ASIGNADO", "Titulo", "Mensaje", 5, LocalDate.now());
        assertTrue(creada);
    }

    @Test
    @DisplayName("crear: si es duplicado, insertIgnore devuelve 0 y el servicio devuelve false sin fallar")
    void crearDuplicadoDevuelveFalseSinExcepcion() {
        when(notificacionRepository.insertIgnore(eq(10), eq("ENTRENADOR_ASIGNADO"), anyString(), anyString(), eq(5), any(), any()))
                .thenReturn(0);

        boolean creada = notificacionService.crear(10, "ENTRENADOR_ASIGNADO", "Titulo", "Mensaje", 5, LocalDate.now());
        assertFalse(creada);
    }

    @Test
    @DisplayName("obtenerNotificaciones: devuelve página ordenada y mapeada a DTO")
    void obtenerNotificacionesTodas() {
        Page<Notificacion> page = new PageImpl<>(List.of(notificacion));
        when(notificacionRepository.findByUsuario_IdUsuarioOrderByCreadaEnDesc(eq(10), any(Pageable.class)))
                .thenReturn(page);

        Page<NotificacionResponseDto> resultado = notificacionService.obtenerNotificaciones(10, false, 0, 20);
        assertNotNull(resultado);
        assertEquals(1, resultado.getContent().size());
        NotificacionResponseDto dto = resultado.getContent().get(0);
        assertEquals(100L, dto.getIdNotificacion());
        assertEquals("ENTRENADOR_ASIGNADO", dto.getTipo());
        assertFalse(dto.isLeida());
    }

    @Test
    @DisplayName("obtenerNotificaciones: si soloNoLeidas=true consulta solo las no leídas")
    void obtenerNotificacionesSoloNoLeidas() {
        Page<Notificacion> page = new PageImpl<>(List.of(notificacion));
        when(notificacionRepository.findByUsuario_IdUsuarioAndLeidaEnIsNullOrderByCreadaEnDesc(eq(10), any(Pageable.class)))
                .thenReturn(page);

        Page<NotificacionResponseDto> resultado = notificacionService.obtenerNotificaciones(10, true, 0, 20);
        assertEquals(1, resultado.getContent().size());
        verify(notificacionRepository).findByUsuario_IdUsuarioAndLeidaEnIsNullOrderByCreadaEnDesc(eq(10), any(Pageable.class));
    }

    @Test
    @DisplayName("contarNoLeidas: retorna el contador correcto")
    void contarNoLeidas() {
        when(notificacionRepository.countByUsuario_IdUsuarioAndLeidaEnIsNull(10)).thenReturn(3L);
        assertEquals(3L, notificacionService.contarNoLeidas(10));
    }

    @Test
    @DisplayName("marcarComoLeida: marca la notificación si pertenece al usuario")
    void marcarComoLeidaExitoso() {
        when(notificacionRepository.findByIdNotificacionAndUsuario_IdUsuario(100L, 10))
                .thenReturn(Optional.of(notificacion));

        notificacionService.marcarComoLeida(100L, 10);
        assertNotNull(notificacion.getLeidaEn());
        verify(notificacionRepository).save(notificacion);
    }

    @Test
    @DisplayName("marcarComoLeida: lanza 404 (ResourceNotFoundException) si no existe o es de otro usuario")
    void marcarComoLeidaDeOtroUsuarioLanza404() {
        when(notificacionRepository.findByIdNotificacionAndUsuario_IdUsuario(100L, 99))
                .thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> notificacionService.marcarComoLeida(100L, 99));
    }

    @Test
    @DisplayName("marcarTodasComoLeidas: ejecuta actualización en lote")
    void marcarTodasComoLeidas() {
        when(notificacionRepository.marcarTodasComoLeidas(eq(10), any(LocalDateTime.class))).thenReturn(5);
        int marcadas = notificacionService.marcarTodasComoLeidas(10);
        assertEquals(5, marcadas);
    }

    @Test
    @DisplayName("eliminar: borra la notificación si pertenece al usuario")
    void eliminarExitoso() {
        when(notificacionRepository.findByIdNotificacionAndUsuario_IdUsuario(100L, 10))
                .thenReturn(Optional.of(notificacion));

        notificacionService.eliminar(100L, 10);
        verify(notificacionRepository).delete(notificacion);
    }

    @Test
    @DisplayName("eliminar: lanza 404 (ResourceNotFoundException) si no existe o pertenece a otro")
    void eliminarDeOtroUsuarioLanza404() {
        when(notificacionRepository.findByIdNotificacionAndUsuario_IdUsuario(100L, 99))
                .thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> notificacionService.eliminar(100L, 99));
    }
}

