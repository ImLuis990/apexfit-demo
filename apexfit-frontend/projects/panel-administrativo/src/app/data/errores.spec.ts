import { HttpErrorResponse } from '@angular/common/http';
import { mensajeDeError, mensajeDeGuardado } from './errores';

const http = (status: number, error?: unknown) => new HttpErrorResponse({ status, error });

describe('mensajeDeError', () => {
  it('sin conexión', () => {
    expect(mensajeDeError(http(0), 'los usuarios')).toContain('No se pudo conectar');
  });
  it('sin permiso', () => {
    expect(mensajeDeError(http(403), 'los usuarios')).toContain('No tienes permiso');
  });
  it('otro error dice qué no se pudo cargar', () => {
    expect(mensajeDeError(http(500), 'los usuarios')).toBe('No pudimos cargar los usuarios. Intenta de nuevo.');
  });
});

describe('mensajeDeGuardado', () => {
  it('sin conexión, sin permiso y usuario inexistente', () => {
    expect(mensajeDeGuardado(http(0))).toContain('No se pudo conectar');
    expect(mensajeDeGuardado(http(403))).toContain('No tienes permiso');
    expect(mensajeDeGuardado(http(404))).toContain('ya no existe');
  });

  it('400 con errores de validación: los lista', () => {
    const m = mensajeDeGuardado(http(400, { validationErrors: { telefono: 'El teléfono debe tener entre 7 y 15 dígitos' } }));
    expect(m).toBe('Revisa los datos: El teléfono debe tener entre 7 y 15 dígitos.');
  });

  it('400 por correo repetido', () => {
    expect(mensajeDeGuardado(http(400, { message: 'El correo ya está en uso' }))).toBe('Ese correo ya está registrado con otro usuario.');
  });

  it('un 400 cualquiera NO se presenta como error de datos', () => {
    const m = mensajeDeGuardado(http(400, { message: 'failed to lazily initialize a collection' }));
    expect(m).toBe('No pudimos guardar los cambios. Intenta de nuevo.');
  });
});
