package com.apexfit.backend.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "sesion_ejercicio",
       uniqueConstraints = @UniqueConstraint(columnNames = {"id_sesion", "id_rutina_ejercicio"}))
@Getter @Setter @NoArgsConstructor
public class SesionEjercicio {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_sesion_ejercicio")
    private Long idSesionEjercicio;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_sesion", nullable = false)
    private SesionEntrenamiento sesion;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_rutina_ejercicio", nullable = false)
    private RutinaEjercicio rutinaEjercicio;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EstadoEjercicio estado = EstadoEjercicio.pendiente;

    @Column(name = "completado_en")
    private LocalDateTime completadoEn;

    public enum EstadoEjercicio {
        completado, aplazado, pendiente
    }
}
