package com.apexfit.backend.repository;

import com.apexfit.backend.entity.Notificacion;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface NotificacionRepository extends JpaRepository<Notificacion, Long> {

    Page<Notificacion> findByUsuario_IdUsuarioOrderByCreadaEnDesc(Integer idUsuario, Pageable pageable);

    Page<Notificacion> findByUsuario_IdUsuarioAndLeidaEnIsNullOrderByCreadaEnDesc(Integer idUsuario, Pageable pageable);

    long countByUsuario_IdUsuarioAndLeidaEnIsNull(Integer idUsuario);

    Optional<Notificacion> findByIdNotificacionAndUsuario_IdUsuario(Long idNotificacion, Integer idUsuario);

    boolean existsByUsuario_IdUsuarioAndTipoAndReferenciaIdAndFechaClave(
            Integer idUsuario, String tipo, Integer referenciaId, LocalDate fechaClave);

    @Modifying
    @Query("UPDATE Notificacion n SET n.leidaEn = :ahora WHERE n.usuario.idUsuario = :idUsuario AND n.leidaEn IS NULL")
    int marcarTodasComoLeidas(@Param("idUsuario") Integer idUsuario, @Param("ahora") LocalDateTime ahora);

    @Modifying
    @Query(value = "INSERT IGNORE INTO notificacion (id_usuario, tipo, titulo, mensaje, referencia_id, fecha_clave, creada_en) " +
                   "VALUES (:idUsuario, :tipo, :titulo, :mensaje, :referenciaId, :fechaClave, :creadaEn)",
           nativeQuery = true)
    int insertIgnore(@Param("idUsuario") Integer idUsuario,
                     @Param("tipo") String tipo,
                     @Param("titulo") String titulo,
                     @Param("mensaje") String mensaje,
                     @Param("referenciaId") Integer referenciaId,
                     @Param("fechaClave") LocalDate fechaClave,
                     @Param("creadaEn") LocalDateTime creadaEn);
}

