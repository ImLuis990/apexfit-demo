package com.apexfit.backend.security.jwt;

import com.apexfit.backend.security.services.UserDetailsImpl;
import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

import java.security.Key;
import java.util.Date;

@Component
public class JwtUtils {

    @Value("${apexfit.app.jwtSecret:ApexFitSecretKeyWhichMustBeAtLeast32BytesLongForHS256Encryption}")
    private String jwtSecret;

    @Value("${apexfit.app.jwtExpirationMs:86400000}")
    private int jwtExpirationMs;

    @Value("${apexfit.app.jwtResetExpirationMs:900000}")
    private int jwtResetExpirationMs; // 15 minutos por defecto

    private Key getSigningKey() {
        return Keys.hmacShaKeyFor(jwtSecret.getBytes());
    }

    public String generateJwtToken(Authentication authentication) {
        UserDetailsImpl userPrincipal = (UserDetailsImpl) authentication.getPrincipal();

        return Jwts.builder()
                .setSubject((userPrincipal.getUsername()))
                .claim("purpose", "AUTH")
                .setIssuedAt(new Date())
                .setExpiration(new Date((new Date()).getTime() + jwtExpirationMs))
                .signWith(getSigningKey(), SignatureAlgorithm.HS256)
                .compact();
    }

    public String getUserNameFromJwtToken(String token) {
        return Jwts.parserBuilder().setSigningKey(getSigningKey()).build()
                .parseClaimsJws(token).getBody().getSubject();
    }

    public boolean validateJwtToken(String authToken) {
        try {
            Claims claims = Jwts.parserBuilder().setSigningKey(getSigningKey()).build().parseClaimsJws(authToken).getBody();
            // Los tokens de recuperación no deben ser aceptados como tokens de sesión regular
            if ("PASSWORD_RESET".equals(claims.get("purpose"))) {
                return false;
            }
            return true;
        } catch (JwtException e) {
            System.err.println("Invalid JWT token: " + e.getMessage());
        }
        return false;
    }

    public String generatePasswordResetToken(String correo) {
        return Jwts.builder()
                .setSubject(correo)
                .claim("purpose", "PASSWORD_RESET")
                .setIssuedAt(new Date())
                .setExpiration(new Date((new Date()).getTime() + jwtResetExpirationMs))
                .signWith(getSigningKey(), SignatureAlgorithm.HS256)
                .compact();
    }

    public boolean validatePasswordResetToken(String token) {
        try {
            Claims claims = Jwts.parserBuilder()
                    .setSigningKey(getSigningKey())
                    .build()
                    .parseClaimsJws(token)
                    .getBody();

            return "PASSWORD_RESET".equals(claims.get("purpose"));
        } catch (JwtException | IllegalArgumentException e) {
            System.err.println("Invalid password reset token: " + e.getMessage());
        }
        return false;
    }

    public String getCorreoFromResetToken(String token) {
        return Jwts.parserBuilder().setSigningKey(getSigningKey()).build()
                .parseClaimsJws(token).getBody().getSubject();
    }
}
