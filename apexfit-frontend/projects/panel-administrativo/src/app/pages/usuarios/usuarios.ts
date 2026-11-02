import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  Injector,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable } from 'rxjs';
import { AuthService, ROLES, Rol } from 'shared';
import { Carga } from '../../data/carga';
import { mensajeDeError, mensajeDeGuardado } from '../../data/errores';
import { filtrar } from '../../data/usuarios.mapper';
import { CONTRASENA_INICIAL, ETIQUETA_ROL, Usuario } from '../../data/usuarios.models';
import { TAMANO_PAGINA, UsuariosService } from '../../data/usuarios.service';

interface Listado {
  usuarios: Usuario[];
  total: number;
}

interface Aviso {
  tipo: 'ok' | 'error';
  texto: string;
}

@Component({
  selector: 'app-usuarios',
  imports: [ReactiveFormsModule],
  templateUrl: './usuarios.html',
  styleUrl: './usuarios.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Usuarios {
  private readonly service = inject(UsuariosService);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly roles = ROLES.map((rol) => ({ valor: rol, etiqueta: ETIQUETA_ROL[rol] }));
  protected readonly tamanoPagina = TAMANO_PAGINA;

  protected readonly carga = signal<Carga<Listado>>({ tipo: 'cargando' });
  protected readonly aviso = signal<Aviso | null>(null);

  // filtros
  protected readonly texto = signal('');
  protected readonly filtroRol = signal('todos');
  protected readonly filtroEstado = signal('todos');

  protected readonly visibles = computed(() => {
    const c = this.carga();
    return c.tipo === 'listo'
      ? filtrar(c.datos.usuarios, {
          texto: this.texto(),
          rol: this.filtroRol(),
          estado: this.filtroEstado(),
        })
      : [];
  });

  // formulario de crear / editar
  protected readonly formAbierto = signal(false);
  protected readonly editando = signal<Usuario | null>(null);
  protected readonly guardando = signal(false);
  protected readonly errorForm = signal<string | null>(null);

  // acciones por fila
  protected readonly confirmandoId = signal<number | null>(null);
  protected readonly trabajandoId = signal<number | null>(null);

  protected readonly miId = computed(() => this.auth.session()?.id ?? null);

  protected readonly form = this.fb.group({
    nombre: ['', [Validators.required, Validators.maxLength(100)]],
    apellido: ['', [Validators.required, Validators.maxLength(100)]],
    correo: ['', [Validators.required, Validators.email, Validators.maxLength(120)]],
    telefono: ['', [Validators.pattern(/^[0-9]{7,15}$/)]],
    rol: this.fb.control<Rol>('cliente', Validators.required),
  });

  constructor() {
    this.cargar();
  }

  protected cargar(mostrarCarga = true): void {
    if (mostrarCarga) this.carga.set({ tipo: 'cargando' });
    this.service
      .listar()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (datos) => this.carga.set({ tipo: 'listo', datos }),
        error: (error: unknown) =>
          this.carga.set({ tipo: 'error', mensaje: mensajeDeError(error, 'los usuarios') }),
      });
  }

  // ── formulario ──
  protected abrirCrear(): void {
    this.editando.set(null);
    this.form.reset({ nombre: '', apellido: '', correo: '', telefono: '', rol: 'cliente' });
    this.form.controls.rol.enable();
    this.mostrarFormulario();
  }

  protected abrirEditar(usuario: Usuario): void {
    this.editando.set(usuario);
    this.form.reset({
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      correo: usuario.correo,
      telefono: usuario.telefono ?? '',
      rol: usuario.rol ?? 'cliente',
    });
    // Un administrador no puede quitarse a sí mismo el rol (se quedaría sin acceso al panel).
    if (usuario.id === this.miId()) this.form.controls.rol.disable();
    else this.form.controls.rol.enable();
    this.mostrarFormulario();
  }

  protected cerrarFormulario(): void {
    this.formAbierto.set(false);
    this.editando.set(null);
    this.errorForm.set(null);
  }

  private mostrarFormulario(): void {
    this.errorForm.set(null);
    this.aviso.set(null);
    this.confirmandoId.set(null);
    this.formAbierto.set(true);
    // Al abrir el formulario, el cursor va al primer campo. Se busca en el DOM del propio
    // componente y no con viewChild, para no leer señales si el componente ya se destruyó.
    afterNextRender(
      () => this.host.nativeElement.querySelector<HTMLInputElement>('input[formcontrolname="nombre"]')?.focus(),
      { injector: this.injector },
    );
  }

  protected guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();
    const datos = {
      nombre: v.nombre,
      apellido: v.apellido,
      correo: v.correo,
      telefono: v.telefono.trim() ? v.telefono : null,
      rol: v.rol,
    };
    const original = this.editando();

    this.guardando.set(true);
    this.errorForm.set(null);

    const peticion = original
      ? this.service.actualizar(original, datos)
      : this.service.crear(datos);

    peticion.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (usuario) => {
        this.guardando.set(false);
        this.cerrarFormulario();
        this.aviso.set({
          tipo: 'ok',
          texto: original
            ? `Cambios guardados en ${usuario.nombreCompleto}.`
            : `Usuario ${usuario.nombreCompleto} creado. Su contraseña inicial es ${CONTRASENA_INICIAL}: pídele que la cambie al entrar.`,
        });
        this.cargar(false);
      },
      error: (error: unknown) => {
        this.guardando.set(false);
        this.errorForm.set(mensajeDeGuardado(error));
      },
    });
  }

  // ── desactivar / activar ──
  protected pedirConfirmacion(usuario: Usuario): void {
    this.aviso.set(null);
    this.confirmandoId.set(usuario.id);
  }

  protected cancelarConfirmacion(): void {
    this.confirmandoId.set(null);
  }

  protected desactivar(usuario: Usuario): void {
    this.trabajar(
      usuario,
      this.service.desactivar(usuario.id),
      `${usuario.nombreCompleto} quedó desactivado y ya no puede iniciar sesión.`,
    );
  }

  protected activar(usuario: Usuario): void {
    this.aviso.set(null);
    this.trabajar(usuario, this.service.activar(usuario), `${usuario.nombreCompleto} quedó activo de nuevo.`);
  }

  private trabajar(usuario: Usuario, peticion: Observable<unknown>, exito: string): void {
    this.confirmandoId.set(null);
    this.trabajandoId.set(usuario.id);
    peticion.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.trabajandoId.set(null);
        this.aviso.set({ tipo: 'ok', texto: exito });
        this.cargar(false);
      },
      error: (error: unknown) => {
        this.trabajandoId.set(null);
        this.aviso.set({ tipo: 'error', texto: mensajeDeGuardado(error) });
      },
    });
  }
}
