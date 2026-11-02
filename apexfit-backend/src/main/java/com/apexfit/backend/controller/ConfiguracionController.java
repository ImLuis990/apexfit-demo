package com.apexfit.backend.controller;

import com.apexfit.backend.dto.DiasInactividadRequest;
import com.apexfit.backend.service.ConfiguracionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/configuracion")
@RequiredArgsConstructor
public class ConfiguracionController {

    private final ConfiguracionService configuracionService;

    @GetMapping("/inactividad")
    @PreAuthorize("hasAnyRole('CLIENTE', 'ENTRENADOR', 'ADMINISTRADOR')")
    public ResponseEntity<Map<String, Integer>> getInactividad() {
        int dias = configuracionService.getDiasInactividad();
        return ResponseEntity.ok(Map.of("dias", dias));
    }

    @PutMapping("/inactividad")
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    public ResponseEntity<Map<String, Integer>> setInactividad(@Valid @RequestBody DiasInactividadRequest request) {
        int dias = configuracionService.setDiasInactividad(request.getDias());
        return ResponseEntity.ok(Map.of("dias", dias));
    }
}

