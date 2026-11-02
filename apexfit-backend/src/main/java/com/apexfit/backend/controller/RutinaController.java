package com.apexfit.backend.controller;

import com.apexfit.backend.dto.RutinaDto;
import com.apexfit.backend.service.RutinaService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/rutinas")
@RequiredArgsConstructor
public class RutinaController {

    private final RutinaService rutinaService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ENTRENADOR', 'ADMINISTRADOR')")
    public ResponseEntity<Page<RutinaDto>> getAllRutinas(Pageable pageable) {
        return ResponseEntity.ok(rutinaService.getAllRutinas(pageable));
    }

    @GetMapping("/cliente/{idCliente}")
    @PreAuthorize("hasAnyRole('CLIENTE', 'ENTRENADOR', 'ADMINISTRADOR')")
    public ResponseEntity<Page<RutinaDto>> getRutinasByCliente(@PathVariable Integer idCliente, Pageable pageable) {
        return ResponseEntity.ok(rutinaService.getRutinasByCliente(idCliente, pageable));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('CLIENTE', 'ENTRENADOR', 'ADMINISTRADOR')")
    public ResponseEntity<RutinaDto> getRutinaById(@PathVariable Integer id) {
        return ResponseEntity.ok(rutinaService.getRutinaById(id));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ENTRENADOR', 'ADMINISTRADOR')")
    public ResponseEntity<RutinaDto> createRutina(@Valid @RequestBody RutinaDto rutinaDto) {
        return new ResponseEntity<>(rutinaService.createRutina(rutinaDto), HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ENTRENADOR', 'ADMINISTRADOR')")
    public ResponseEntity<RutinaDto> updateRutina(@PathVariable Integer id, @Valid @RequestBody RutinaDto rutinaDto) {
        return ResponseEntity.ok(rutinaService.updateRutina(id, rutinaDto));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ENTRENADOR', 'ADMINISTRADOR')")
    public ResponseEntity<Void> deleteRutina(@PathVariable Integer id) {
        rutinaService.deleteRutina(id);
        return ResponseEntity.noContent().build();
    }
}
