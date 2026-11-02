package com.apexfit.backend.service;

import com.apexfit.backend.dto.EntrenadorClienteDto;
import com.apexfit.backend.entity.EntrenadorCliente;
import com.apexfit.backend.entity.Usuario;
import com.apexfit.backend.exception.ResourceNotFoundException;
import com.apexfit.backend.repository.EntrenadorClienteRepository;
import com.apexfit.backend.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class EntrenadorClienteService {

    private final EntrenadorClienteRepository repo;
    private final UsuarioRepository usuarioRepository;
    private final NotificacionService notificacionService;

    public List<EntrenadorClienteDto> getAll() {
        return repo.findAll().stream().map(this::toDto).collect(Collectors.toList());
    }

    public List<EntrenadorClienteDto> getByEntrenador(Integer idEntrenador) {
        return repo.findByEntrenador_IdUsuario(idEntrenador).stream().map(this::toDto).collect(Collectors.toList());
    }

    public List<EntrenadorClienteDto> getByCliente(Integer idCliente) {
        return repo.findByCliente_IdUsuario(idCliente).stream().map(this::toDto).collect(Collectors.toList());
    }

    public EntrenadorClienteDto getById(Integer id) {
        return toDto(repo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Asignación no encontrada con id: " + id)));
    }

    @Transactional
    public EntrenadorClienteDto create(EntrenadorClienteDto dto) {
        EntrenadorCliente ec = new EntrenadorCliente();
        Usuario entrenador = usuarioRepository.findById(dto.getIdEntrenador())
                .orElseThrow(() -> new ResourceNotFoundException("Entrenador no encontrado: " + dto.getIdEntrenador()));
        Usuario cliente = usuarioRepository.findById(dto.getIdCliente())
                .orElseThrow(() -> new ResourceNotFoundException("Cliente no encontrado: " + dto.getIdCliente()));
        ec.setEntrenador(entrenador);
        ec.setCliente(cliente);
        if (dto.getEstado() != null) ec.setEstado(dto.getEstado());

        EntrenadorCliente saved = repo.save(ec);
        if (saved.getEstado() == null || "activa".equalsIgnoreCase(saved.getEstado())) {
            notificarAsignacion(entrenador, cliente);
        }

        return toDto(saved);
    }

    @Transactional
    public EntrenadorClienteDto update(Integer id, EntrenadorClienteDto dto) {
        EntrenadorCliente ec = repo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Asignación no encontrada con id: " + id));
        if (dto.getEstado() != null) ec.setEstado(dto.getEstado());

        EntrenadorCliente saved = repo.save(ec);
        if (dto.getEstado() != null && "activa".equalsIgnoreCase(dto.getEstado())) {
            notificarAsignacion(saved.getEntrenador(), saved.getCliente());
        }

        return toDto(saved);
    }

    @Transactional
    public void delete(Integer id) {
        if (!repo.existsById(id))
            throw new ResourceNotFoundException("Asignación no encontrada con id: " + id);
        repo.deleteById(id);
    }

    private void notificarAsignacion(Usuario entrenador, Usuario cliente) {
        LocalDate hoy = LocalDate.now();
        // ENTRENADOR_ASIGNADO para el cliente (referencia: idEntrenador)
        notificacionService.crear(
                cliente.getIdUsuario(),
                "ENTRENADOR_ASIGNADO",
                "Entrenador asignado",
                "Se te ha asignado al entrenador " + entrenador.getNombre() + " " + entrenador.getApellido() + ".",
                entrenador.getIdUsuario(),
                hoy
        );
        // CLIENTE_ASIGNADO para el entrenador (referencia: idCliente)
        notificacionService.crear(
                entrenador.getIdUsuario(),
                "CLIENTE_ASIGNADO",
                "Nuevo cliente asignado",
                "Se te ha asignado al cliente " + cliente.getNombre() + " " + cliente.getApellido() + ".",
                cliente.getIdUsuario(),
                hoy
        );
    }

    private EntrenadorClienteDto toDto(EntrenadorCliente ec) {
        EntrenadorClienteDto dto = new EntrenadorClienteDto();
        dto.setIdAsignacion(ec.getIdAsignacion());
        dto.setIdEntrenador(ec.getEntrenador().getIdUsuario());
        dto.setIdCliente(ec.getCliente().getIdUsuario());
        dto.setFechaAsignacion(ec.getFechaAsignacion());
        dto.setEstado(ec.getEstado());
        return dto;
    }
}
