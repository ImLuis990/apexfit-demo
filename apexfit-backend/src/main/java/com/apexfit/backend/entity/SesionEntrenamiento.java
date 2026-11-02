package com.apexfit.backend.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "sesion_entrenamiento",
       uniqueConstraints = @UniqueConstraint(columnNames = {"id_usuario", "fecha"}))
@Getter @Setter @NoArgsConstructor
public class SesionEntrenamiento {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_sesion")
    private Long idSesion;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_usuario", nullable = false)
    private Usuario usuario;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_rutina", nullable = false)
    private Rutina rutina;

    @Column(nullable = false)
    private LocalDate fecha;

    @Column(nullable = false)
    private Boolean terminada = false;

    @OneToMany(mappedBy = "sesion", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<SesionEjercicio> ejercicios = new ArrayList<>();
}
