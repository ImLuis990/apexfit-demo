package com.apexfit.backend.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Entity
@Table(name = "progreso")
@Getter @Setter @NoArgsConstructor
public class Progreso {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_progreso")
    private Integer idProgreso;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_usuario", nullable = false)
    private Usuario usuario;

    @Column(nullable = false)
    private LocalDate fecha;

    @Column(nullable = false, precision = 5, scale = 2)
    private BigDecimal peso;

    @Column(precision = 5, scale = 2)
    private BigDecimal altura;

    @Column(precision = 5, scale = 2)
    private BigDecimal imc;

    @Column(columnDefinition = "TEXT")
    private String observaciones;

    @OneToMany(mappedBy = "progreso", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ProgresoMedida> medidas;
}
