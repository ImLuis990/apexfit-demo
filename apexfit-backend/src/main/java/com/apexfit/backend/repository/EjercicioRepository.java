package com.apexfit.backend.repository;

import com.apexfit.backend.entity.Ejercicio;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface EjercicioRepository extends JpaRepository<Ejercicio, Integer> {
    
    Optional<Ejercicio> findByNombre(String nombre);
    
    // ✅ AGREGAR ESTO:
    Page<Ejercicio> findByGrupoMuscularContainingIgnoreCase(String grupoMuscular, Pageable pageable);

    Page<Ejercicio> findByNivelDificultadIgnoreCase(String nivelDificultad, Pageable pageable);
}
