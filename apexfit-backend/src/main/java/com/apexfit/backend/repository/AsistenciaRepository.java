package com.apexfit.backend.repository;

import com.apexfit.backend.entity.Asistencia;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface AsistenciaRepository extends JpaRepository<Asistencia, Long> {
    List<Asistencia> findByUsuario_IdUsuario(Integer idUsuario);
    long countByFecha(LocalDate fecha);

    @Query("SELECT MAX(a.fecha) FROM Asistencia a WHERE a.usuario.idUsuario = :idUsuario")
    LocalDate findUltimaFechaAsistencia(@Param("idUsuario") Integer idUsuario);

    boolean existsByUsuario_IdUsuarioAndFechaAndHoraSalidaIsNull(Integer idUsuario, LocalDate fecha);
}
