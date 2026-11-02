package com.apexfit.backend.controller;

import com.apexfit.backend.dto.NotificacionResponseDto;
import com.apexfit.backend.entity.Rol;
import com.apexfit.backend.entity.Usuario;
import com.apexfit.backend.exception.GlobalExceptionHandler;
import com.apexfit.backend.exception.ResourceNotFoundException;
import com.apexfit.backend.security.services.UserDetailsImpl;
import com.apexfit.backend.service.NotificacionService;
import com.fasterxml.jackson.core.JsonGenerator;
import com.fasterxml.jackson.databind.JsonSerializer;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializerProvider;
import com.fasterxml.jackson.databind.module.SimpleModule;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.io.IOException;
import java.security.Principal;
import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class NotificacionControllerTest {

    private MockMvc mockMvc;

    @Mock
    private NotificacionService notificacionService;

    @InjectMocks
    private NotificacionController notificacionController;

    private Principal principal;

    @BeforeEach
    void setUp() {
        ObjectMapper objectMapper = new ObjectMapper();
        SimpleModule module = new SimpleModule();
        module.addSerializer(LocalDateTime.class, new JsonSerializer<LocalDateTime>() {
            @Override
            public void serialize(LocalDateTime value, JsonGenerator gen, SerializerProvider serializers) throws IOException {
                gen.writeString(value != null ? value.toString() : null);
            }
        });
        objectMapper.registerModule(module);

        mockMvc = MockMvcBuilders.standaloneSetup(notificacionController)
                .setMessageConverters(new MappingJackson2HttpMessageConverter(objectMapper))
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();

        Usuario u = new Usuario();
        u.setIdUsuario(42);
        u.setCorreo("cliente@apexfit.com");
        u.setRol(new Rol(3, "cliente"));
        UserDetailsImpl userDetails = UserDetailsImpl.build(u);

        UsernamePasswordAuthenticationToken auth =
                new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
        SecurityContextHolder.getContext().setAuthentication(auth);
        principal = auth;
    }

    @Test
    @DisplayName("GET /api/v1/notificaciones retorna página de notificaciones")
    void testListar() throws Exception {
        NotificacionResponseDto dto = NotificacionResponseDto.builder()
                .idNotificacion(1L)
                .tipo("ENTRENADOR_ASIGNADO")
                .titulo("Asignado")
                .mensaje("Mensaje")
                .referenciaId(5)
                .creadaEn(LocalDateTime.now())
                .leida(false)
                .build();

        when(notificacionService.obtenerNotificaciones(eq(42), eq(false), eq(0), eq(20)))
                .thenReturn(new PageImpl<>(List.of(dto), org.springframework.data.domain.PageRequest.of(0, 20), 1));

        mockMvc.perform(get("/api/v1/notificaciones")
                        .principal(principal)
                        .param("page", "0")
                        .param("size", "20"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].idNotificacion").value(1))
                .andExpect(jsonPath("$.content[0].tipo").value("ENTRENADOR_ASIGNADO"));
    }

    @Test
    @DisplayName("GET /api/v1/notificaciones/no-leidas/contador retorna {total}")
    void testContarNoLeidas() throws Exception {
        when(notificacionService.contarNoLeidas(42)).thenReturn(7L);

        mockMvc.perform(get("/api/v1/notificaciones/no-leidas/contador").principal(principal))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(7));
    }

    @Test
    @DisplayName("PUT /api/v1/notificaciones/{id}/leida retorna 204")
    void testMarcarComoLeida() throws Exception {
        doNothing().when(notificacionService).marcarComoLeida(10L, 42);

        mockMvc.perform(put("/api/v1/notificaciones/10/leida").principal(principal))
                .andExpect(status().isNoContent());

        verify(notificacionService).marcarComoLeida(10L, 42);
    }

    @Test
    @DisplayName("PUT /api/v1/notificaciones/{id}/leida de otro usuario retorna 404 (no 403)")
    void testMarcarComoLeidaDeOtroUsuario404() throws Exception {
        doThrow(new ResourceNotFoundException("Notificación no encontrada"))
                .when(notificacionService).marcarComoLeida(99L, 42);

        mockMvc.perform(put("/api/v1/notificaciones/99/leida").principal(principal))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("PUT /api/v1/notificaciones/leidas retorna {marcadas: X}")
    void testMarcarTodasComoLeidas() throws Exception {
        when(notificacionService.marcarTodasComoLeidas(42)).thenReturn(3);

        mockMvc.perform(put("/api/v1/notificaciones/leidas").principal(principal))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.marcadas").value(3));
    }

    @Test
    @DisplayName("DELETE /api/v1/notificaciones/{id} retorna 204")
    void testEliminar() throws Exception {
        doNothing().when(notificacionService).eliminar(10L, 42);

        mockMvc.perform(delete("/api/v1/notificaciones/10").principal(principal))
                .andExpect(status().isNoContent());

        verify(notificacionService).eliminar(10L, 42);
    }

    @Test
    @DisplayName("DELETE /api/v1/notificaciones/{id} de otro usuario retorna 404 (no 403)")
    void testEliminarDeOtroUsuario404() throws Exception {
        doThrow(new ResourceNotFoundException("Notificación no encontrada"))
                .when(notificacionService).eliminar(99L, 42);

        mockMvc.perform(delete("/api/v1/notificaciones/99").principal(principal))
                .andExpect(status().isNotFound());
    }
}
