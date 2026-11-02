package com.apexfit.backend.repository;

import com.apexfit.backend.entity.Alerta;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface AlertaRepository extends JpaRepository<Alerta, Integer> {
    List<Alerta> findByUsuario_IdUsuario(Integer idUsuario);
}
