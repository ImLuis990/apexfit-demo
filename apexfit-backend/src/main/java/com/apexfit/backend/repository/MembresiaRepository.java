package com.apexfit.backend.repository;

import com.apexfit.backend.entity.Membresia;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface MembresiaRepository extends JpaRepository<Membresia, Integer> {
    List<Membresia> findByUsuario_IdUsuario(Integer idUsuario);
    List<Membresia> findByUsuario_IdUsuarioAndEstado(Integer idUsuario, String estado);
    List<Membresia> findByEstado(String estado);
    List<Membresia> findByEstadoAndFechaFin(String estado, LocalDate fechaFin);
    List<Membresia> findByEstadoAndFechaFinLessThan(String estado, LocalDate fechaFin);
    long countByEstado(String estado);
    long countByEstadoAndFechaFin(String estado, LocalDate fechaFin);
}
