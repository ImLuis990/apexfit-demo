package com.apexfit.backend.service;

import com.apexfit.backend.dto.UsuarioDto;
import com.apexfit.backend.entity.Rol;
import com.apexfit.backend.entity.Usuario;
import com.apexfit.backend.repository.RolRepository;
import com.apexfit.backend.repository.UsuarioRepository;
import com.apexfit.backend.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UsuarioService {

    private final UsuarioRepository usuarioRepository;
    private final RolRepository rolRepository;
    private final PasswordEncoder passwordEncoder;

    public Page<UsuarioDto> getAllUsuarios(Pageable pageable) {
        return usuarioRepository.findAll(pageable).map(this::mapToDto);
    }

    public UsuarioDto getUsuarioById(Integer id) {
        Usuario usuario = usuarioRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado con id: " + id));
        return mapToDto(usuario);
    }

    public UsuarioDto getUsuarioByCorreo(String correo) {
        Usuario usuario = usuarioRepository.findByCorreo(correo)
            .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado con correo: " + correo));
        return mapToDto(usuario);
    }

    @Transactional
    public UsuarioDto createUsuario(UsuarioDto dto) {
        if (usuarioRepository.findByCorreo(dto.getCorreo()).isPresent()) {
            throw new RuntimeException("El correo ya está en uso");
        }
        Usuario usuario = new Usuario();
        mapToEntity(dto, usuario);
        // Default encoded password for users created via Admin endpoint
        usuario.setContrasenaHash(passwordEncoder.encode("123456"));
        
        Usuario savedUsuario = usuarioRepository.save(usuario);
        return mapToDto(savedUsuario);
    }

    @Transactional
    public UsuarioDto updateUsuario(Integer id, UsuarioDto dto) {
        Usuario usuario = usuarioRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado con id: " + id));
                
        if (!usuario.getCorreo().equals(dto.getCorreo()) && 
            usuarioRepository.findByCorreo(dto.getCorreo()).isPresent()) {
            throw new RuntimeException("El correo ya está en uso");
        }

        mapToEntity(dto, usuario);
        Usuario updatedUsuario = usuarioRepository.save(usuario);
        return mapToDto(updatedUsuario);
    }

    @Transactional
    public void deleteUsuario(Integer id) {
        Usuario usuario = usuarioRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado con id: " + id));
        // Soft delete
        usuario.setEstado("inactivo");
        usuarioRepository.save(usuario);
    }

    @Transactional
    public void changePassword(String correo, String contrasenaActual, String nuevaContrasena) {
        Usuario usuario = usuarioRepository.findByCorreo(correo)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado con correo: " + correo));
        if (!passwordEncoder.matches(contrasenaActual, usuario.getContrasenaHash())) {
            throw new IllegalArgumentException("La contraseña actual es incorrecta");
        }
        usuario.setContrasenaHash(passwordEncoder.encode(nuevaContrasena));
        usuarioRepository.save(usuario);
    }

    private UsuarioDto mapToDto(Usuario usuario) {
        UsuarioDto dto = new UsuarioDto();
        dto.setIdUsuario(usuario.getIdUsuario());
        dto.setNombre(usuario.getNombre());
        dto.setApellido(usuario.getApellido());
        dto.setCorreo(usuario.getCorreo());
        dto.setIdRol(usuario.getRol().getIdRol());
        dto.setTelefono(usuario.getTelefono());
        dto.setFechaNacimiento(usuario.getFechaNacimiento());
        dto.setEstado(usuario.getEstado());
        return dto;
    }

    private void mapToEntity(UsuarioDto dto, Usuario usuario) {
        usuario.setNombre(dto.getNombre());
        usuario.setApellido(dto.getApellido());
        usuario.setCorreo(dto.getCorreo());
        usuario.setTelefono(dto.getTelefono());
        usuario.setFechaNacimiento(dto.getFechaNacimiento());
        
        if (dto.getEstado() != null) {
            usuario.setEstado(dto.getEstado());
        }

        Rol rol = rolRepository.findById(dto.getIdRol())
                .orElseThrow(() -> new ResourceNotFoundException("Rol no encontrado con id: " + dto.getIdRol()));
        usuario.setRol(rol);
    }
}
