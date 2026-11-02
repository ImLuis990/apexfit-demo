package com.apexfit.backend.controller;

import com.apexfit.backend.dto.RutinaEjercicioDto;
import com.apexfit.backend.service.RutinaEjercicioService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/rutina-ejercicios")
@RequiredArgsConstructor
public class RutinaEjercicioController {

    private final RutinaEjercicioService service;

    @GetMapping
    @PreAuthorize("hasAnyRole('ENTRENADOR', 'ADMINISTRADOR')")
    public ResponseEntity<List<RutinaEjercicioDto>> getAll() {
        return ResponseEntity.ok(service.getAll());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('CLIENTE', 'ENTRENADOR', 'ADMINISTRADOR')")
    public ResponseEntity<RutinaEjercicioDto> getById(@PathVariable Integer id) {
        return ResponseEntity.ok(service.getById(id));
    }

    @GetMapping("/rutina/{idRutina}")
    @PreAuthorize("hasAnyRole('CLIENTE', 'ENTRENADOR', 'ADMINISTRADOR')")
    public ResponseEntity<List<RutinaEjercicioDto>> getByRutina(@PathVariable Integer idRutina) {
        return ResponseEntity.ok(service.getByRutina(idRutina));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ENTRENADOR', 'ADMINISTRADOR')")
    public ResponseEntity<RutinaEjercicioDto> create(@Valid @RequestBody RutinaEjercicioDto dto) {
        return new ResponseEntity<>(service.create(dto), HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ENTRENADOR', 'ADMINISTRADOR')")
    public ResponseEntity<RutinaEjercicioDto> update(@PathVariable Integer id, @Valid @RequestBody RutinaEjercicioDto dto) {
        return ResponseEntity.ok(service.update(id, dto));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ENTRENADOR', 'ADMINISTRADOR')")
    public ResponseEntity<Void> delete(@PathVariable Integer id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
