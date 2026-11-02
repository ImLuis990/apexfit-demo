package com.apexfit.backend.service;

import com.apexfit.backend.entity.Configuracion;
import com.apexfit.backend.repository.ConfiguracionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ConfiguracionService {

    public static final String CLAVE_DIAS_INACTIVIDAD = "dias_inactividad";
    public static final int DIAS_INACTIVIDAD_DEFAULT = 10;

    private final ConfiguracionRepository configuracionRepository;

    public int getDiasInactividad() {
        return configuracionRepository.findById(CLAVE_DIAS_INACTIVIDAD)
                .map(conf -> {
                    try {
                        return Integer.parseInt(conf.getValor().trim());
                    } catch (NumberFormatException e) {
                        return DIAS_INACTIVIDAD_DEFAULT;
                    }
                })
                .orElse(DIAS_INACTIVIDAD_DEFAULT);
    }

    @Transactional
    public int setDiasInactividad(int dias) {
        if (dias < 1 || dias > 365) {
            throw new IllegalArgumentException("Los días de inactividad deben estar entre 1 y 365");
        }
        Configuracion conf = configuracionRepository.findById(CLAVE_DIAS_INACTIVIDAD)
                .orElseGet(() -> new Configuracion(CLAVE_DIAS_INACTIVIDAD, String.valueOf(DIAS_INACTIVIDAD_DEFAULT)));
        conf.setValor(String.valueOf(dias));
        configuracionRepository.save(conf);
        return dias;
    }
}

