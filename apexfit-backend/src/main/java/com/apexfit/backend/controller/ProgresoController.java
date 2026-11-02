package com.apexfit.backend.controller;

import com.apexfit.backend.dto.ProgresoDto;
import com.apexfit.backend.service.ProgresoService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/progresos")
@RequiredArgsConstructor
public class ProgresoController {

    private final ProgresoService progresoService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ENTRENADOR', 'ADMINISTRADOR')")
    public ResponseEntity<List<ProgresoDto>> getAll() {
        return ResponseEntity.ok(progresoService.getAll());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('CLIENTE', 'ENTRENADOR', 'ADMINISTRADOR')")
    public ResponseEntity<ProgresoDto> getById(@PathVariable Integer id) {
        return ResponseEntity.ok(progresoService.getById(id));
    }

    @GetMapping("/usuario/{idUsuario}")
    @PreAuthorize("hasAnyRole('CLIENTE', 'ENTRENADOR', 'ADMINISTRADOR')")
    public ResponseEntity<List<ProgresoDto>> getByUsuario(@PathVariable Integer idUsuario) {
        return ResponseEntity.ok(progresoService.getByUsuario(idUsuario));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('CLIENTE', 'ENTRENADOR', 'ADMINISTRADOR')")
    public ResponseEntity<ProgresoDto> create(@Valid @RequestBody ProgresoDto dto) {
        return new ResponseEntity<>(progresoService.create(dto), HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('CLIENTE', 'ENTRENADOR', 'ADMINISTRADOR')")
    public ResponseEntity<ProgresoDto> update(@PathVariable Integer id, @Valid @RequestBody ProgresoDto dto) {
        return ResponseEntity.ok(progresoService.update(id, dto));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ENTRENADOR', 'ADMINISTRADOR')")
    public ResponseEntity<Void> delete(@PathVariable Integer id) {
        progresoService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
