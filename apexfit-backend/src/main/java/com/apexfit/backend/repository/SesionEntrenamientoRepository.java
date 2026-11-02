package com.apexfit.backend.repository;

import com.apexfit.backend.entity.SesionEntrenamiento;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface SesionEntrenamientoRepository extends JpaRepository<SesionEntrenamiento, Long> {

    Optional<SesionEntrenamiento> findByUsuario_IdUsuarioAndFecha(Integer idUsuario, LocalDate fecha);

    List<SesionEntrenamiento> findByUsuario_IdUsuarioAndFechaBetweenOrderByFechaDesc(
            Integer idUsuario, LocalDate desde, LocalDate hasta);
}
