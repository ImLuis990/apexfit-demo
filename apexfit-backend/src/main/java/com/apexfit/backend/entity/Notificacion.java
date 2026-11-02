package com.apexfit.backend.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(
    name = "notificacion",
    uniqueConstraints = {
        @UniqueConstraint(name = "uq_notif", columnNames = {"id_usuario", "tipo", "referencia_id", "fecha_clave"})
    },
    indexes = {
        @Index(name = "idx_notif_usuario", columnList = "id_usuario, leida_en, creada_en DESC")
    }
)
@Getter
@Setter
@NoArgsConstructor
public class Notificacion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_notificacion")
    private Long idNotificacion;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_usuario", nullable = false)
    private Usuario usuario;

    @Column(name = "tipo", nullable = false, length = 40)
    private String tipo;

    @Column(name = "titulo", length = 100)
    private String titulo;

    @Column(name = "mensaje", length = 255)
    private String mensaje;

    @Column(name = "referencia_id", nullable = false)
    private Integer referenciaId = 0;

    @Column(name = "fecha_clave", nullable = false)
    private LocalDate fechaClave;

    @Column(name = "creada_en", updatable = false)
    private LocalDateTime creadaEn;

    @Column(name = "leida_en")
    private LocalDateTime leidaEn;

    @PrePersist
    public void prePersist() {
        if (creadaEn == null) {
            creadaEn = LocalDateTime.now();
        }
        if (referenciaId == null) {
            referenciaId = 0;
        }
    }
}

