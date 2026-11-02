package com.apexfit.backend.controller;

import com.apexfit.backend.dto.ProgresoMedidaDto;
import com.apexfit.backend.service.ProgresoMedidaService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/progresos-medidas")
@RequiredArgsConstructor
public class ProgresoMedidaController {

    private final ProgresoMedidaService service;

    @GetMapping
    @PreAuthorize("hasAnyRole('ENTRENADOR', 'ADMINISTRADOR')")
    public ResponseEntity<List<ProgresoMedidaDto>> getAll() {
        return ResponseEntity.ok(service.getAll());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('CLIENTE', 'ENTRENADOR', 'ADMINISTRADOR')")
    public ResponseEntity<ProgresoMedidaDto> getById(@PathVariable Integer id) {
        return ResponseEntity.ok(service.getById(id));
    }

    @GetMapping("/progreso/{idProgreso}")
    @PreAuthorize("hasAnyRole('CLIENTE', 'ENTRENADOR', 'ADMINISTRADOR')")
    public ResponseEntity<List<ProgresoMedidaDto>> getByProgreso(@PathVariable Integer idProgreso) {
        return ResponseEntity.ok(service.getByProgreso(idProgreso));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('CLIENTE', 'ENTRENADOR', 'ADMINISTRADOR')")
    public ResponseEntity<ProgresoMedidaDto> create(@Valid @RequestBody ProgresoMedidaDto dto) {
        return new ResponseEntity<>(service.create(dto), HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('CLIENTE', 'ENTRENADOR', 'ADMINISTRADOR')")
    public ResponseEntity<ProgresoMedidaDto> update(@PathVariable Integer id, @Valid @RequestBody ProgresoMedidaDto dto) {
        return ResponseEntity.ok(service.update(id, dto));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ENTRENADOR', 'ADMINISTRADOR')")
    public ResponseEntity<Void> delete(@PathVariable Integer id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
