package com.apexfit.backend.controller;

import com.apexfit.backend.dto.chat.ChatRequestDto;
import com.apexfit.backend.dto.chat.ChatResponseDto;
import com.apexfit.backend.security.services.UserDetailsImpl;
import com.apexfit.backend.service.ChatContextService;
import com.apexfit.backend.service.ClaudeService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping({"/api/chat", "/api/v1/chat"})
@PreAuthorize("hasAnyRole('CLIENTE', 'ENTRENADOR', 'ADMINISTRADOR')")
public class ChatController {

    private static final Logger log = LoggerFactory.getLogger(ChatController.class);

    private final ClaudeService claudeService;
    private final ChatContextService chatContextService;

    public ChatController(ClaudeService claudeService, ChatContextService chatContextService) {
        this.claudeService = claudeService;
        this.chatContextService = chatContextService;
    }

    @PostMapping
    public ResponseEntity<ChatResponseDto> chat(
            @Valid @RequestBody ChatRequestDto request,
            Authentication authentication) {

        Integer idUsuario = null;
        String correo = authentication != null ? authentication.getName() : null;

        if (authentication != null && authentication.getPrincipal() instanceof UserDetailsImpl ud) {
            idUsuario = ud.getIdUsuario();
            correo = ud.getUsername();
        }

        String contextInfo = chatContextService.construirContexto(idUsuario, correo);
        log.info("Chat invocado. Usuario={}, contextoNull={}", correo, contextInfo == null);

        return ResponseEntity.ok(claudeService.generarRespuesta(request, contextInfo));
    }
}
