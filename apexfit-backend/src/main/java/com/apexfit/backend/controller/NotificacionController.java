package com.apexfit.backend.controller;

import com.apexfit.backend.dto.NotificacionResponseDto;
import com.apexfit.backend.security.services.UserDetailsImpl;
import com.apexfit.backend.service.NotificacionService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/notificaciones")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('CLIENTE', 'ENTRENADOR', 'ADMINISTRADOR')")
public class NotificacionController {

    private final NotificacionService notificacionService;

    @GetMapping
    public ResponseEntity<Page<NotificacionResponseDto>> listar(
            @RequestParam(defaultValue = "false") boolean soloNoLeidas,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            Authentication authentication) {

        Integer idUsuario = extraerIdUsuario(authentication);
        Page<NotificacionResponseDto> resultado = notificacionService.obtenerNotificaciones(idUsuario, soloNoLeidas, page, size);
        return ResponseEntity.ok(resultado);
    }

    @GetMapping("/no-leidas/contador")
    public ResponseEntity<Map<String, Long>> contarNoLeidas(Authentication authentication) {
        Integer idUsuario = extraerIdUsuario(authentication);
        long total = notificacionService.contarNoLeidas(idUsuario);
        return ResponseEntity.ok(Map.of("total", total));
    }

    @PutMapping("/{id}/leida")
    public ResponseEntity<Void> marcarComoLeida(
            @PathVariable Long id,
            Authentication authentication) {

        Integer idUsuario = extraerIdUsuario(authentication);
        notificacionService.marcarComoLeida(id, idUsuario);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/leidas")
    public ResponseEntity<Map<String, Integer>> marcarTodasComoLeidas(Authentication authentication) {
        Integer idUsuario = extraerIdUsuario(authentication);
        int marcadas = notificacionService.marcarTodasComoLeidas(idUsuario);
        return ResponseEntity.ok(Map.of("marcadas", marcadas));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(
            @PathVariable Long id,
            Authentication authentication) {

        Integer idUsuario = extraerIdUsuario(authentication);
        notificacionService.eliminar(id, idUsuario);
        return ResponseEntity.noContent().build();
    }

    private Integer extraerIdUsuario(Authentication authentication) {
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        return userDetails.getIdUsuario();
    }
}

