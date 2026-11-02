package com.apexfit.backend.service;

import com.apexfit.backend.dto.NotificacionResponseDto;
import com.apexfit.backend.entity.Notificacion;
import com.apexfit.backend.entity.Usuario;
import com.apexfit.backend.exception.ResourceNotFoundException;
import com.apexfit.backend.repository.NotificacionRepository;
import com.apexfit.backend.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class NotificacionService {

    private final NotificacionRepository notificacionRepository;
    private final UsuarioRepository usuarioRepository;

    @Transactional
    public boolean crear(Integer idUsuario, String tipo, String titulo, String mensaje, Integer referenciaId, LocalDate fechaClave) {
        if (idUsuario == null || tipo == null) {
            return false;
        }
        int refId = (referenciaId != null) ? referenciaId : 0;
        LocalDate fecha = (fechaClave != null) ? fechaClave : LocalDate.now();
        LocalDateTime ahora = LocalDateTime.now();

        try {
            int filas = notificacionRepository.insertIgnore(idUsuario, tipo, titulo, mensaje, refId, fecha, ahora);
            return filas > 0;
        } catch (Exception e) {
            log.debug("insertIgnore fallo o no compatible, usando fallback para notificacion: {}", e.getMessage());
            try {
                if (notificacionRepository.existsByUsuario_IdUsuarioAndTipoAndReferenciaIdAndFechaClave(idUsuario, tipo, refId, fecha)) {
                    return false;
                }
                Usuario usuario = usuarioRepository.findById(idUsuario).orElse(null);
                if (usuario == null) {
                    return false;
                }
                Notificacion notif = new Notificacion();
                notif.setUsuario(usuario);
                notif.setTipo(tipo);
                notif.setTitulo(titulo);
                notif.setMensaje(mensaje);
                notif.setReferenciaId(refId);
                notif.setFechaClave(fecha);
                notif.setCreadaEn(ahora);
                notificacionRepository.save(notif);
                return true;
            } catch (DataIntegrityViolationException dive) {
                // Duplicado ignorado por violación del UNIQUE
                return false;
            } catch (Exception ex) {
                log.warn("No se pudo crear la notificación para el usuario {}: {}", idUsuario, ex.getMessage());
                return false;
            }
        }
    }

    public Page<NotificacionResponseDto> obtenerNotificaciones(Integer idUsuario, boolean soloNoLeidas, int page, int size) {
        int pagina = Math.max(0, page);
        int limite = Math.min(50, Math.max(1, size));
        Pageable pageable = PageRequest.of(pagina, limite, Sort.by(Sort.Direction.DESC, "creadaEn", "idNotificacion"));

        Page<Notificacion> resultado = soloNoLeidas
                ? notificacionRepository.findByUsuario_IdUsuarioAndLeidaEnIsNullOrderByCreadaEnDesc(idUsuario, pageable)
                : notificacionRepository.findByUsuario_IdUsuarioOrderByCreadaEnDesc(idUsuario, pageable);

        return resultado.map(this::toResponseDto);
    }

    public long contarNoLeidas(Integer idUsuario) {
        return notificacionRepository.countByUsuario_IdUsuarioAndLeidaEnIsNull(idUsuario);
    }

    @Transactional
    public void marcarComoLeida(Long idNotificacion, Integer idUsuario) {
        Notificacion notificacion = notificacionRepository.findByIdNotificacionAndUsuario_IdUsuario(idNotificacion, idUsuario)
                .orElseThrow(() -> new ResourceNotFoundException("Notificación no encontrada con id: " + idNotificacion));

        if (notificacion.getLeidaEn() == null) {
            notificacion.setLeidaEn(LocalDateTime.now());
            notificacionRepository.save(notificacion);
        }
    }

    @Transactional
    public int marcarTodasComoLeidas(Integer idUsuario) {
        return notificacionRepository.marcarTodasComoLeidas(idUsuario, LocalDateTime.now());
    }

    @Transactional
    public void eliminar(Long idNotificacion, Integer idUsuario) {
        Notificacion notificacion = notificacionRepository.findByIdNotificacionAndUsuario_IdUsuario(idNotificacion, idUsuario)
                .orElseThrow(() -> new ResourceNotFoundException("Notificación no encontrada con id: " + idNotificacion));

        notificacionRepository.delete(notificacion);
    }

    private NotificacionResponseDto toResponseDto(Notificacion n) {
        return NotificacionResponseDto.builder()
                .idNotificacion(n.getIdNotificacion())
                .tipo(n.getTipo())
                .titulo(n.getTitulo())
                .mensaje(n.getMensaje())
                .referenciaId(n.getReferenciaId())
                .creadaEn(n.getCreadaEn())
                .leida(n.getLeidaEn() != null)
                .build();
    }
}

