package com.apexfit.backend.service;

import com.apexfit.backend.dto.chat.ChatMessageDto;
import com.apexfit.backend.dto.chat.ChatRequestDto;
import com.apexfit.backend.dto.chat.ChatResponseDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class ClaudeService {

    private static final Logger log = LoggerFactory.getLogger(ClaudeService.class);
    private static final String GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

    private static final String SYSTEM_PROMPT = """
            Eres el asistente virtual de ApexFit, una plataforma integral de gestión de gimnasios.
            Ayuda a los usuarios según su rol (CLIENTE, ENTRENADOR, ADMINISTRADOR).
            - CLIENTE: dudas sobre rutinas, membresía, QR de acceso, progreso físico
            - ENTRENADOR: creación de rutinas, seguimiento de atletas
            - ADMINISTRADOR: gestión de aforo, membresías, alertas del sistema
            Responde siempre en español, tono amigable y motivador.
            No inventes datos del usuario. Si algo está fuera de tu alcance, sugiere contactar soporte humano.
            """;

    private final RestClient restClient;

    @Value("${gemini.api.key:${anthropic.api.key:}}")
    private String apiKey;

    public ClaudeService(RestClient.Builder restClientBuilder) {
        this.restClient = restClientBuilder.build();
    }

    public ChatResponseDto generarRespuesta(ChatRequestDto request) {
        return generarRespuesta(request, null);
    }

    public ChatResponseDto generarRespuesta(ChatRequestDto request, String userContext) {
        if (apiKey == null || apiKey.trim().isEmpty()) {
            log.warn("Gemini API key no configurada. Respondiendo mensaje informativo.");
            return ChatResponseDto.builder()
                    .response("¡Hola! Soy el asistente virtual de ApexFit. Para habilitar mis respuestas de IA completas, se debe configurar 'gemini.api.key' en el servidor.")
                    .build();
        }

        List<Map<String, Object>> contents = new ArrayList<>();

        if (request.getHistory() != null) {
            for (ChatMessageDto msg : request.getHistory()) {
                if (msg != null && msg.getContent() != null && !msg.getContent().trim().isEmpty()) {
                    String role = "user".equalsIgnoreCase(msg.getRole()) ? "user" : "model";
                    contents.add(Map.of(
                            "role", role,
                            "parts", List.of(Map.of("text", msg.getContent().trim()))
                    ));
                }
            }
        }

        // Agregar el mensaje actual del usuario
        contents.add(Map.of(
                "role", "user",
                "parts", List.of(Map.of("text", request.getMessage().trim()))
        ));

        String promptFinal = SYSTEM_PROMPT;
        if (userContext != null && !userContext.trim().isEmpty()) {
            promptFinal += "\n\nContexto del usuario actual autenticado:\n" + userContext.trim();
        }

        Map<String, Object> body = new HashMap<>();
        body.put("system_instruction", Map.of(
                "parts", List.of(Map.of("text", promptFinal))
        ));
        body.put("contents", contents);

        try {
            String url = GEMINI_API_URL + "?key=" + apiKey.trim();

            Map<?, ?> response = restClient.post()
                    .uri(url)
                    .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                    .body(body)
                    .retrieve()
                    .body(Map.class);

            String replyText = extraerTextoDeRespuesta(response);
            return ChatResponseDto.builder()
                    .response(replyText)
                    .build();

        } catch (Exception ex) {
            log.error("Error al comunicarse con la API de Gemini: {}", ex.getMessage(), ex);
            return ChatResponseDto.builder()
                    .response("Lo siento, hubo un inconveniente al conectar con el asistente de IA. Por favor, intenta nuevamente en unos momentos.")
                    .build();
        }
    }

    private String extraerTextoDeRespuesta(Map<?, ?> response) {
        if (response == null) {
            return "No recibí respuesta del servidor de IA.";
        }
        try {
            Object candidatesObj = response.get("candidates");
            if (candidatesObj instanceof List<?> candidates && !candidates.isEmpty()) {
                Object firstCandidate = candidates.get(0);
                if (firstCandidate instanceof Map<?, ?> candidateMap) {
                    Object contentObj = candidateMap.get("content");
                    if (contentObj instanceof Map<?, ?> contentMap) {
                        Object partsObj = contentMap.get("parts");
                        if (partsObj instanceof List<?> parts && !parts.isEmpty()) {
                            Object firstPart = parts.get(0);
                            if (firstPart instanceof Map<?, ?> partMap) {
                                Object text = partMap.get("text");
                                if (text != null) {
                                    return text.toString().trim();
                                }
                            }
                        }
                    }
                }
            }
        } catch (Exception e) {
            log.error("Error analizando estructura de respuesta Gemini", e);
        }
        return "No pude interpretar la respuesta del asistente. Intenta de nuevo.";
    }
}
