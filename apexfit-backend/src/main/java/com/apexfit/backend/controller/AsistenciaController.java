package com.apexfit.backend.controller;

import com.apexfit.backend.dto.AsistenciaDto;
import com.apexfit.backend.service.AsistenciaService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/asistencias")
@RequiredArgsConstructor
public class AsistenciaController {

    private final AsistenciaService asistenciaService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMINISTRADOR', 'ENTRENADOR')")
    public ResponseEntity<List<AsistenciaDto>> getAll() {
        return ResponseEntity.ok(asistenciaService.getAll());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('CLIENTE', 'ENTRENADOR', 'ADMINISTRADOR')")
    public ResponseEntity<AsistenciaDto> getById(@PathVariable Long id) {
        return ResponseEntity.ok(asistenciaService.getById(id));
    }

    @GetMapping("/usuario/{idUsuario}")
    @PreAuthorize("hasAnyRole('CLIENTE', 'ENTRENADOR', 'ADMINISTRADOR')")
    public ResponseEntity<List<AsistenciaDto>> getByUsuario(@PathVariable Integer idUsuario) {
        return ResponseEntity.ok(asistenciaService.getByUsuario(idUsuario));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('CLIENTE', 'ADMINISTRADOR')")
    public ResponseEntity<AsistenciaDto> create(@Valid @RequestBody AsistenciaDto dto) {
        return new ResponseEntity<>(asistenciaService.create(dto), HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    public ResponseEntity<AsistenciaDto> update(@PathVariable Long id, @Valid @RequestBody AsistenciaDto dto) {
        return ResponseEntity.ok(asistenciaService.update(id, dto));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        asistenciaService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/escanear-qr")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR', 'ENTRENADOR', 'CLIENTE')")
    public ResponseEntity<AsistenciaDto> registrarPorQr(@Valid @RequestBody com.apexfit.backend.dto.EscanearQrRequest request) {
        return new ResponseEntity<>(asistenciaService.registrarPorQr(request.getQrData()), HttpStatus.CREATED);
    }
}
