package com.apexfit.backend.repository;

import com.apexfit.backend.entity.EntrenadorCliente;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EntrenadorClienteRepository extends JpaRepository<EntrenadorCliente, Integer> {
    List<EntrenadorCliente> findByEntrenador_IdUsuario(Integer idEntrenador);
    List<EntrenadorCliente> findByCliente_IdUsuario(Integer idCliente);
    List<EntrenadorCliente> findByCliente_IdUsuarioAndEstadoIgnoreCase(Integer idCliente, String estado);
    List<EntrenadorCliente> findByEntrenador_IdUsuarioAndEstadoIgnoreCase(Integer idEntrenador, String estado);
}
