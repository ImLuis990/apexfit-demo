package com.apexfit.backend.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Entity
@Table(name = "progreso_medida")
@Getter @Setter @NoArgsConstructor
public class ProgresoMedida {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_medida")
    private Integer idMedida;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_progreso", nullable = false)
    private Progreso progreso;

    @Column(name = "tipo_medida", nullable = false, length = 30)
    private String tipoMedida;

    @Column(name = "valor_cm", nullable = false, precision = 5, scale = 2)
    private BigDecimal valorCm;
}
