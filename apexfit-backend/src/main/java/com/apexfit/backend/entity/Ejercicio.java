package com.apexfit.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "ejercicio")
@Getter
@Setter
@NoArgsConstructor
public class Ejercicio {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_ejercicio")
    private Integer idEjercicio;

    @Column(name = "descripcion", columnDefinition = "TEXT")
    private String descripcion;

    @Column(unique = true, nullable = false, length = 100)
    private String nombre;

    @Column(name = "grupo_muscular", length = 50)
    private String grupoMuscular;

    @Column(name = "video_url", length = 255)
    private String videoUrl;

    @Column(name = "nivel_dificultad")
    private String nivelDificultad;
}
