package com.apexfit.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "configuracion")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Configuracion {

    @Id
    @Column(name = "clave", length = 50)
    private String clave;

    @Column(name = "valor", nullable = false, length = 255)
    private String valor;
}

