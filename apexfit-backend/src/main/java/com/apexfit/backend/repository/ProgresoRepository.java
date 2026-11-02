package com.apexfit.backend.repository;

import com.apexfit.backend.entity.Progreso;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProgresoRepository extends JpaRepository<Progreso, Integer> {

    @EntityGraph(attributePaths = {"medidas"})
    List<Progreso> findByUsuario_IdUsuarioOrderByFechaDesc(Integer idUsuario);

    @Override
    @EntityGraph(attributePaths = {"medidas"})
    Optional<Progreso> findById(Integer id);
}
