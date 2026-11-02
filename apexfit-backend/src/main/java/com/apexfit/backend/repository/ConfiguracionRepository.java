package com.apexfit.backend.repository;

import com.apexfit.backend.entity.Configuracion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ConfiguracionRepository extends JpaRepository<Configuracion, String> {
}

