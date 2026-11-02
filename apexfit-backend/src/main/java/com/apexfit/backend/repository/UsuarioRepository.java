package com.apexfit.backend.repository;

import com.apexfit.backend.entity.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UsuarioRepository extends JpaRepository<Usuario, Integer> {
    Optional<Usuario> findByCorreo(String correo);
    long countByEstado(String estado);
    long countByRol_NombreRol(String nombreRol);
    List<Usuario> findByRol_NombreRolIgnoreCaseAndEstadoIgnoreCase(String nombreRol, String estado);
}
