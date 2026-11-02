package com.apexfit.backend.controller;

import com.apexfit.backend.dto.MembresiaDto;
import com.apexfit.backend.service.MembresiaService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/membresias")
@RequiredArgsConstructor
public class MembresiaController {

    private final MembresiaService membresiaService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMINISTRADOR', 'ENTRENADOR')")
    public ResponseEntity<List<MembresiaDto>> getAll() {
        return ResponseEntity.ok(membresiaService.getAll());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('CLIENTE', 'ADMINISTRADOR')")
    public ResponseEntity<MembresiaDto> getById(@PathVariable Integer id) {
        return ResponseEntity.ok(membresiaService.getById(id));
    }

    @GetMapping("/usuario/{idUsuario}")
    @PreAuthorize("hasAnyRole('CLIENTE', 'ADMINISTRADOR')")
    public ResponseEntity<List<MembresiaDto>> getByUsuario(@PathVariable Integer idUsuario) {
        return ResponseEntity.ok(membresiaService.getByUsuario(idUsuario));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMINISTRADOR', 'ENTRENADOR')")
    public ResponseEntity<MembresiaDto> create(@Valid @RequestBody MembresiaDto dto) {
        return new ResponseEntity<>(membresiaService.create(dto), HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    public ResponseEntity<MembresiaDto> update(@PathVariable Integer id, @Valid @RequestBody MembresiaDto dto) {
        return ResponseEntity.ok(membresiaService.update(id, dto));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    public ResponseEntity<Void> delete(@PathVariable Integer id) {
        membresiaService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
