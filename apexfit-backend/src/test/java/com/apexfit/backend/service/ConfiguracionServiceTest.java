package com.apexfit.backend.service;

import com.apexfit.backend.entity.Configuracion;
import com.apexfit.backend.repository.ConfiguracionRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ConfiguracionServiceTest {

    @Mock
    private ConfiguracionRepository repo;

    @InjectMocks
    private ConfiguracionService service;

    @Test
    @DisplayName("getDiasInactividad: retorna 10 por defecto si no existe en BD")
    void getDiasInactividadDefault() {
        when(repo.findById("dias_inactividad")).thenReturn(Optional.empty());
        assertEquals(10, service.getDiasInactividad());
    }

    @Test
    @DisplayName("getDiasInactividad: retorna el valor parseado de BD")
    void getDiasInactividadDeBd() {
        when(repo.findById("dias_inactividad")).thenReturn(Optional.of(new Configuracion("dias_inactividad", "15")));
        assertEquals(15, service.getDiasInactividad());
    }

    @Test
    @DisplayName("setDiasInactividad: guarda y retorna el valor válido entre 1 y 365")
    void setDiasInactividadValido() {
        Configuracion existente = new Configuracion("dias_inactividad", "10");
        when(repo.findById("dias_inactividad")).thenReturn(Optional.of(existente));

        int resultado = service.setDiasInactividad(20);
        assertEquals(20, resultado);
        assertEquals("20", existente.getValor());
        verify(repo).save(existente);
    }

    @Test
    @DisplayName("setDiasInactividad: lanza IllegalArgumentException si < 1 o > 365")
    void setDiasInactividadFueraDeRango() {
        assertThrows(IllegalArgumentException.class, () -> service.setDiasInactividad(0));
        assertThrows(IllegalArgumentException.class, () -> service.setDiasInactividad(366));
        assertThrows(IllegalArgumentException.class, () -> service.setDiasInactividad(-5));
        verify(repo, never()).save(any());
    }
}

