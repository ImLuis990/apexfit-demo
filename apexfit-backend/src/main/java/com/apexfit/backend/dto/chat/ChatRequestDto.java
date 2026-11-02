package com.apexfit.backend.dto.chat;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatRequestDto {

    @NotBlank(message = "El mensaje no puede estar vacío")
    private String message;

    @Builder.Default
    private List<ChatMessageDto> history = new ArrayList<>();
}
