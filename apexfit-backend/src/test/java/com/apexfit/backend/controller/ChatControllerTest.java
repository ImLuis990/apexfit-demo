package com.apexfit.backend.controller;

import com.apexfit.backend.dto.chat.ChatMessageDto;
import com.apexfit.backend.dto.chat.ChatRequestDto;
import com.apexfit.backend.dto.chat.ChatResponseDto;
import com.apexfit.backend.repository.MembresiaRepository;
import com.apexfit.backend.repository.UsuarioRepository;
import com.apexfit.backend.service.ClaudeService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.nullable;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ChatControllerTest {

    @Mock
    private ClaudeService claudeService;

    @Mock
    private UsuarioRepository usuarioRepository;

    @Mock
    private MembresiaRepository membresiaRepository;

    @InjectMocks
    private ChatController chatController;

    private ChatRequestDto requestDto;

    @BeforeEach
    void setUp() {
        requestDto = ChatRequestDto.builder()
                .message("¿Cómo veo mi rutina de hoy?")
                .history(List.of(new ChatMessageDto("assistant", "¡Hola! ¿En qué puedo ayudarte?")))
                .build();
    }

    @Test
    @DisplayName("Debe responder mensaje de chat exitosamente")
    void testChatExitoso() {
        ChatResponseDto mockResponse = ChatResponseDto.builder()
                .response("Puedes ver tu rutina en la pestaña 'Hoy'.")
                .build();

        when(claudeService.generarRespuesta(any(ChatRequestDto.class), nullable(String.class))).thenReturn(mockResponse);

        ResponseEntity<ChatResponseDto> response = chatController.chat(requestDto);

        assertNotNull(response);
        assertEquals(200, response.getStatusCode().value());
        assertNotNull(response.getBody());
        assertEquals("Puedes ver tu rutina en la pestaña 'Hoy'.", response.getBody().getResponse());
        verify(claudeService).generarRespuesta(any(ChatRequestDto.class), nullable(String.class));
    }
}
