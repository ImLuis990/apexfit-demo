package com.apexfit.backend.security.services;

import com.apexfit.backend.entity.Usuario;
import com.fasterxml.jackson.annotation.JsonIgnore;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;
import java.util.Objects;

public class UserDetailsImpl implements UserDetails {
    private static final long serialVersionUID = 1L;

    private Integer idUsuario;
    private String correo;

    @JsonIgnore
    private String contrasena;

    private Collection<? extends GrantedAuthority> authorities;
    private boolean enabled;

    public UserDetailsImpl(Integer idUsuario, String correo, String contrasena,
                           Collection<? extends GrantedAuthority> authorities, boolean enabled) {
        this.idUsuario = idUsuario;
        this.correo = correo;
        this.contrasena = contrasena;
        this.authorities = authorities;
        this.enabled = enabled;
    }

    public static UserDetailsImpl build(Usuario usuario) {
        List<GrantedAuthority> authorities = List.of(
                new SimpleGrantedAuthority("ROLE_" + usuario.getRol().getNombreRol().toUpperCase())
        );

        boolean isActivo = usuario.getEstado() == null || "activo".equalsIgnoreCase(usuario.getEstado());

        return new UserDetailsImpl(
                usuario.getIdUsuario(),
                usuario.getCorreo(),
                usuario.getContrasenaHash(),
                authorities,
                isActivo);
    }

    public Integer getIdUsuario() {
        return idUsuario;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return authorities;
    }

    @Override
    public String getPassword() {
        return contrasena;
    }

    @Override
    public String getUsername() {
        return correo;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return enabled;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        UserDetailsImpl user = (UserDetailsImpl) o;
        return Objects.equals(idUsuario, user.idUsuario);
    }
}
