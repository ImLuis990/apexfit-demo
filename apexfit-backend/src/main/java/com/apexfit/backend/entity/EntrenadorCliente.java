package com.apexfit.backend.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "entrenador_cliente")
@Getter @Setter @NoArgsConstructor
public class EntrenadorCliente {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_asignacion")
    private Integer idAsignacion;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_entrenador", nullable = false)
    private Usuario entrenador;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_cliente", nullable = false)
    private Usuario cliente;

    @Column(name = "fecha_asignacion")
    private LocalDateTime fechaAsignacion;

    @Column(nullable = false)
    private String estado = "activa";

    @PrePersist
    public void prePersist() {
        if (fechaAsignacion == null) fechaAsignacion = LocalDateTime.now();
    }
}
