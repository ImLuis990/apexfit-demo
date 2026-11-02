package com.apexfit.backend;

import org.junit.jupiter.api.Test;

/**
 * Prueba de sanidad básica — no levanta el contexto de Spring
 * para evitar requerir conexión a BD en entorno local de desarrollo.
 */
class ApexFitApplicationTests {

	@Test
	void appModuleLoads() {
		// Sanity check: el módulo compila y los tests corren correctamente
	}

}
