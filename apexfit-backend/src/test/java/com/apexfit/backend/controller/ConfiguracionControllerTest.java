package com.apexfit.backend.controller;

import com.apexfit.backend.exception.GlobalExceptionHandler;
import com.apexfit.backend.service.ConfiguracionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class ConfiguracionControllerTest {

    private MockMvc mockMvc;

    @Mock
    private ConfiguracionService configuracionService;

    @InjectMocks
    private ConfiguracionController configuracionController;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(configuracionController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("GET /api/v1/configuracion/inactividad retorna {dias}")
    void testGetInactividad() throws Exception {
        when(configuracionService.getDiasInactividad()).thenReturn(10);

        mockMvc.perform(get("/api/v1/configuracion/inactividad"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.dias").value(10));
    }

    @Test
    @DisplayName("PUT /api/v1/configuracion/inactividad actualiza {dias}")
    void testSetInactividadValido() throws Exception {
        when(configuracionService.setDiasInactividad(15)).thenReturn(15);

        mockMvc.perform(put("/api/v1/configuracion/inactividad")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"dias\": 15}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.dias").value(15));
    }

    @Test
    @DisplayName("PUT /api/v1/configuracion/inactividad con valor inválido retorna 400 Bad Request")
    void testSetInactividadInvalido() throws Exception {
        mockMvc.perform(put("/api/v1/configuracion/inactividad")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"dias\": 0}"))
                .andExpect(status().isBadRequest());

        mockMvc.perform(put("/api/v1/configuracion/inactividad")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"dias\": 366}"))
                .andExpect(status().isBadRequest());

        verify(configuracionService, never()).setDiasInactividad(anyInt());
    }
}

