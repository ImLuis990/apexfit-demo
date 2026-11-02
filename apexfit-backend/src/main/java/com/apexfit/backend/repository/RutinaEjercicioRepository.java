package com.apexfit.backend.repository;

import com.apexfit.backend.entity.RutinaEjercicio;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface RutinaEjercicioRepository extends JpaRepository<RutinaEjercicio, Integer> {
    List<RutinaEjercicio> findByRutina_IdRutina(Integer idRutina);
}
