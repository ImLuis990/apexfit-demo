package com.apexfit.backend.controller;

import com.apexfit.backend.dto.EjercicioDto;
import com.apexfit.backend.service.EjercicioService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/ejercicios")
@RequiredArgsConstructor
public class EjercicioController {

    private final EjercicioService ejercicioService;

    @GetMapping
    @PreAuthorize("hasAnyRole('CLIENTE', 'ENTRENADOR', 'ADMINISTRADOR')")
    public ResponseEntity<Page<EjercicioDto>> getAllEjercicios(Pageable pageable) {
        return ResponseEntity.ok(ejercicioService.getAllEjercicios(pageable));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('CLIENTE', 'ENTRENADOR', 'ADMINISTRADOR')")
    public ResponseEntity<EjercicioDto> getEjercicioById(@PathVariable Integer id) {
        return ResponseEntity.ok(ejercicioService.getEjercicioById(id));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ENTRENADOR', 'ADMINISTRADOR')")
    public ResponseEntity<EjercicioDto> createEjercicio(@Valid @RequestBody EjercicioDto ejercicioDto) {
        return new ResponseEntity<>(ejercicioService.createEjercicio(ejercicioDto), HttpStatus.CREATED);
    }
  

    @GetMapping("/filtrar")
    @PreAuthorize("hasAnyRole('CLIENTE', 'ENTRENADOR', 'ADMINISTRADOR')")
    public ResponseEntity<Page<EjercicioDto>> getEjerciciosByGrupoMuscular(
        @RequestParam String grupoMuscular, Pageable pageable) {
        return ResponseEntity.ok(ejercicioService.getByGrupoMuscular(grupoMuscular, pageable));
    }

    @GetMapping("/dificultad")
    @PreAuthorize("hasAnyRole('CLIENTE', 'ENTRENADOR', 'ADMINISTRADOR')")
    public ResponseEntity<Page<EjercicioDto>> getEjerciciosByNivelDificultad(
            @RequestParam String nivelDificultad, Pageable pageable) {
        return ResponseEntity.ok(ejercicioService.getByNivelDificultad(nivelDificultad, pageable));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ENTRENADOR', 'ADMINISTRADOR')")
    public ResponseEntity<EjercicioDto> updateEjercicio(@PathVariable Integer id, @Valid @RequestBody EjercicioDto ejercicioDto) {
        return ResponseEntity.ok(ejercicioService.updateEjercicio(id, ejercicioDto));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ENTRENADOR', 'ADMINISTRADOR')")
    public ResponseEntity<Void> deleteEjercicio(@PathVariable Integer id) {
        ejercicioService.deleteEjercicio(id);
        return ResponseEntity.noContent().build();
    }
}
