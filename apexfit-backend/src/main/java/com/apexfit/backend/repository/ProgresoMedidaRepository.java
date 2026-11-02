package com.apexfit.backend.repository;

import com.apexfit.backend.entity.ProgresoMedida;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ProgresoMedidaRepository extends JpaRepository<ProgresoMedida, Integer> {
    List<ProgresoMedida> findByProgreso_IdProgreso(Integer idProgreso);
}
