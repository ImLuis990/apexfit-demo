package com.apexfit.backend.controller;

import com.apexfit.backend.dto.SesionEntrenamientoRequest;
import com.apexfit.backend.dto.SesionEntrenamientoResponse;
import com.apexfit.backend.dto.SesionHistorialDto;
import com.apexfit.backend.security.services.UserDetailsImpl;
import com.apexfit.backend.service.SesionEntrenamientoService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/sesiones-entrenamiento")
@RequiredArgsConstructor
public class SesionEntrenamientoController {

    private final SesionEntrenamientoService sesionService;

    /**
     * PUT /hoy — guarda (upsert) el avance del día para el cliente autenticado.
     */
    @PutMapping("/hoy")
    @PreAuthorize("hasRole('CLIENTE')")
    public ResponseEntity<SesionEntrenamientoResponse> guardarAvanceHoy(
            @Valid @RequestBody SesionEntrenamientoRequest request,
            Authentication authentication) {

        Integer idUsuario = ((UserDetailsImpl) authentication.getPrincipal()).getIdUsuario();
        SesionEntrenamientoResponse response = sesionService.guardarAvanceHoy(idUsuario, request);
        return ResponseEntity.ok(response);
    }

    /**
     * GET /hoy — devuelve el avance de hoy del cliente autenticado (para retomarlo en otro dispositivo).
     * Retorna 404 si no hay sesión registrada hoy.
     */
    @GetMapping("/hoy")
    @PreAuthorize("hasRole('CLIENTE')")
    public ResponseEntity<SesionEntrenamientoResponse> obtenerAvanceHoy(Authentication authentication) {

        Integer idUsuario = ((UserDetailsImpl) authentication.getPrincipal()).getIdUsuario();
        SesionEntrenamientoResponse response = sesionService.obtenerAvanceHoy(idUsuario);
        return ResponseEntity.ok(response);
    }

    /**
     * GET /usuario/{idCliente}?desde=yyyy-MM-dd&hasta=yyyy-MM-dd — historial de sesiones.
     * ENTRENADOR: solo sus clientes asignados.
     * ADMIN: cualquier cliente.
     * CLIENTE: solo el suyo.
     */
    @GetMapping("/usuario/{idCliente}")
    @PreAuthorize("hasAnyRole('CLIENTE', 'ENTRENADOR', 'ADMINISTRADOR')")
    public ResponseEntity<List<SesionHistorialDto>> obtenerHistorial(
            @PathVariable Integer idCliente,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta,
            Authentication authentication) {

        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        Integer idSolicitante = userDetails.getIdUsuario();
        String rol = userDetails.getAuthorities().stream()
                .findFirst()
                .map(GrantedAuthority::getAuthority)
                .orElse("");

        List<SesionHistorialDto> historial = sesionService.obtenerHistorial(
                idSolicitante, rol, idCliente, desde, hasta);
        return ResponseEntity.ok(historial);
    }
}
