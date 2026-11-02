package com.apexfit.backend.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "rutina_ejercicio")
@Getter @Setter @NoArgsConstructor
public class RutinaEjercicio {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_rutina_ejercicio")
    private Integer idRutinaEjercicio;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_rutina", nullable = false)
    private Rutina rutina;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_ejercicio", nullable = false)
    private Ejercicio ejercicio;

    @Column(name = "dia_semana")
    private String diaSemana;

    @Column(nullable = false)
    private Short series;

    @Column(nullable = false)
    private Short repeticiones;

    @Column(name = "descanso_seg")
    private Short descansoSeg;
}
