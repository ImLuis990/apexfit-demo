import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, Observable } from 'rxjs';
import { Carga } from '../../data/carga';
import { mensajeDeError, mensajeDeGuardado } from '../../data/errores';
import { codigoDe, deDia, estaAdentro, leerCodigo } from '../../data/asistencias.mapper';
import { Asistencia } from '../../data/asistencias.models';
import { AsistenciasService } from '../../data/asistencias.service';
import { fechaCompleta, hoyIso, horaCorta } from '../../data/formato';
import { mejorMembresia } from '../../data/membresias.mapper';
import { Membresia } from '../../data/membresias.models';
import { MembresiasService } from '../../data/membresias.service';
import { Usuario } from '../../data/usuarios.models';
import { UsuariosService } from '../../data/usuarios.service';

interface Datos {
  asistencias: Asistencia[];
  usuarios: Usuario[];
  membresias: Membresia[];
}

interface Fila {
  a: Asistencia;
  nombre: string;
  correo: string;
  adentro: boolean;
}

type Via = 'qr' | 'manual';

@Component({
  selector: 'app-asistencia',
  templateUrl: './asistencia.html',
  styleUrl: './asistencia.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AsistenciaPagina {
  private readonly asistencias = inject(AsistenciasService);
  private readonly usuarios = inject(UsuariosService);
  private readonly membresias = inject(MembresiasService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly hoy = hoyIso();
  protected readonly fecha = fechaCompleta;
  protected readonly hora = horaCorta;

  protected readonly carga = signal<Carga<Datos>>({ tipo: 'cargando' });
  protected readonly clienteManual = signal('');
  protected readonly trabajando = signal(false);
  protected readonly aviso = signal<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  protected readonly filas = computed<Fila[]>(() => {
    const c = this.carga();
    if (c.tipo !== 'listo') return [];
    const porId = new Map(c.datos.usuarios.map((u) => [u.id, u]));
    return deDia(c.datos.asistencias, this.hoy).map((a) => ({
      a,
      nombre: porId.get(a.idUsuario)?.nombreCompleto ?? `Usuario #${a.idUsuario}`,
      correo: porId.get(a.idUsuario)?.correo ?? '',
      adentro: estaAdentro(a),
    }));
  });

  protected readonly dentro = computed(() => this.filas().filter((f) => f.adentro).length);

  protected readonly clientes = computed(() => {
    const c = this.carga();
    return c.tipo === 'listo' ? c.datos.usuarios.filter((u) => u.rol === 'cliente' && u.activo) : [];
  });

  constructor() {
    this.cargar();
  }

  protected cargar(mostrarCarga = true): void {
    if (mostrarCarga) this.carga.set({ tipo: 'cargando' });
    forkJoin({
      asistencias: this.asistencias.listar(),
      usuarios: this.usuarios.listar(),
      membresias: this.membresias.listar(),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ asistencias, usuarios, membresias }) =>
          this.carga.set({ tipo: 'listo', datos: { asistencias, usuarios: usuarios.usuarios, membresias } }),
        error: (error: unknown) => this.carga.set({ tipo: 'error', mensaje: mensajeDeError(error, 'la asistencia') }),
      });
  }

  // ── entradas del formulario ──
  protected elegirCliente(evento: Event): void {
    this.clienteManual.set((evento.target as HTMLSelectElement).value);
  }

  /** Recibe el texto tal como está en el campo (la plantilla lo vacía enseguida, para el siguiente código). */
  protected registrarCodigo(texto: string): void {
    const leido = leerCodigo(texto);
    if (!leido) {
      this.aviso.set({ tipo: 'error', texto: 'Escribe o escanea un código válido.' });
      return;
    }
    const c = this.carga();
    if (c.tipo !== 'listo') return;

    const usuario = c.datos.usuarios.find((u) =>
      leido.tipo === 'id' ? u.id === leido.id : u.correo.toLowerCase() === leido.correo,
    );
    if (!usuario) {
      this.aviso.set({ tipo: 'error', texto: 'Código no reconocido: no hay un usuario con ese dato.' });
      return;
    }
    this.procesar(usuario, 'qr');
  }

  protected registrarManual(): void {
    const id = Number(this.clienteManual());
    const usuario = this.clientes().find((u) => u.id === id);
    if (!usuario) {
      this.aviso.set({ tipo: 'error', texto: 'Elige un cliente.' });
      return;
    }
    this.procesar(usuario, 'manual');
  }

  protected registrarSalida(fila: Fila): void {
    this.salida(fila.a, fila.nombre);
  }

  // ── lógica de registro ──
  /**
   * Un mismo gesto sirve para entrar y salir: si el cliente ya está dentro, se registra su salida;
   * si no, su entrada (solo si pasa las validaciones que el backend todavía no hace).
   */
  private procesar(usuario: Usuario, via: Via): void {
    const abierta = this.filas().find((f) => f.a.idUsuario === usuario.id && f.adentro)?.a;
    if (abierta) {
      this.salida(abierta, usuario.nombreCompleto);
      return;
    }

    const problema = this.validar(usuario);
    if (problema) {
      this.aviso.set({ tipo: 'error', texto: problema });
      return;
    }

    const nota = this.notaDeVencimiento(usuario);
    const peticion =
      via === 'qr'
        ? this.asistencias.registrarQr(codigoDe(usuario))
        : this.asistencias.registrarManual(usuario.id);

    this.ejecutar(peticion, (a) => `Entrada registrada: ${usuario.nombreCompleto} · ${horaCorta(a.horaEntrada)}${nota}`);
  }

  private salida(a: Asistencia, nombre: string): void {
    this.ejecutar(
      this.asistencias.registrarSalida(a),
      (res) => `Salida registrada: ${nombre} · ${horaCorta(res.horaSalida ?? '')}`,
    );
  }

  private ejecutar(peticion: Observable<Asistencia>, mensaje: (a: Asistencia) => string): void {
    this.trabajando.set(true);
    this.aviso.set(null);
    peticion.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (a) => {
        this.trabajando.set(false);
        this.aviso.set({ tipo: 'ok', texto: mensaje(a) });
        this.cargar(false);
      },
      error: (error: unknown) => {
        this.trabajando.set(false);
        this.aviso.set({ tipo: 'error', texto: mensajeDeGuardado(error) });
      },
    });
  }

  /** RF-07: se valida la membresía aquí porque el backend registra la entrada a cualquiera. */
  private validar(u: Usuario): string | null {
    if (u.rol !== 'cliente') return 'Solo se registra la asistencia de clientes.';
    if (!u.activo) return `${u.nombreCompleto} está inactivo.`;

    const c = this.carga();
    const delUsuario = c.tipo === 'listo' ? c.datos.membresias.filter((m) => m.idUsuario === u.id) : [];
    const mejor = mejorMembresia(delUsuario, this.hoy);

    if (!mejor) return `${u.nombreCompleto} no tiene una membresía.`;
    if (mejor.estado === 'cancelada') return `La membresía de ${u.nombreCompleto} está cancelada.`;
    if (mejor.estado === 'vencida') {
      return `La membresía de ${u.nombreCompleto} venció el ${fechaCompleta(mejor.m.fechaFin)}.`;
    }
    return null;
  }

  private notaDeVencimiento(u: Usuario): string {
    const c = this.carga();
    const delUsuario = c.tipo === 'listo' ? c.datos.membresias.filter((m) => m.idUsuario === u.id) : [];
    const mejor = mejorMembresia(delUsuario, this.hoy);
    if (mejor?.estado !== 'por-vencer') return '';
    return mejor.diasRestantes === 0
      ? ' · Su membresía vence hoy'
      : ` · Su membresía vence en ${mejor.diasRestantes} ${mejor.diasRestantes === 1 ? 'día' : 'días'}`;
  }
}
