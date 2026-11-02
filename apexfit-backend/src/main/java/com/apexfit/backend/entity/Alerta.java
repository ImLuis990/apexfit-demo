package com.apexfit.backend.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "alerta")
@Getter @Setter @NoArgsConstructor
public class Alerta {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_alerta")
    private Integer idAlerta;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_usuario", nullable = false)
    private Usuario usuario;

    @Column(nullable = false)
    private String tipo;

    @Column(nullable = false, length = 255)
    private String mensaje;

    @Column(name = "fecha_generada")
    private LocalDateTime fechaGenerada;

    @Column(nullable = false)
    private String estado = "pendiente";

    @PrePersist
    public void prePersist() {
        if (fechaGenerada == null) fechaGenerada = LocalDateTime.now();
    }
}
