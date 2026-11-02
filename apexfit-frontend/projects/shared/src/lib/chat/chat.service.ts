import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { API_URL } from '../auth/auth.tokens';
import { ChatRequest, ChatResponse, MensajeChat } from './chat.models';

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(API_URL, { optional: true }) ?? '/api/v1';

  /** Historial en memoria durante la sesión activa */
  readonly historial = signal<MensajeChat[]>([
    {
      role: 'assistant',
      content: '¡Hola! Soy el asistente virtual de ApexFit 🤖💪. ¿En qué te puedo ayudar hoy con tus rutinas, membresía o dudas del gimnasio?',
      hora: this.horaActual(),
    },
  ]);

  readonly cargando = signal(false);

  enviarMensaje(texto: string): Observable<ChatResponse> {
    const textoLimpio = texto.trim();
    if (!textoLimpio) {
      throw new Error('El mensaje no puede estar vacío');
    }

    const nuevoMensajeUsuario: MensajeChat = {
      role: 'user',
      content: textoLimpio,
      hora: this.horaActual(),
    };

    // Tomamos el historial previo para enviarlo al modelo
    const historialParaEnviar = this.historial().map(({ role, content }) => ({ role, content }));

    // Agregamos inmediatamente el mensaje del usuario a la vista
    this.historial.update((prev) => [...prev, nuevoMensajeUsuario]);
    this.cargando.set(true);

    const endpoint = `${this.apiUrl}/chat`;
    const body: ChatRequest = {
      message: textoLimpio,
      history: historialParaEnviar,
    };

    return this.http.post<ChatResponse>(endpoint, body).pipe(
      tap({
        next: (res) => {
          this.cargando.set(false);
          this.historial.update((prev) => [
            ...prev,
            {
              role: 'assistant',
              content: res.response,
              hora: this.horaActual(),
            },
          ]);
        },
        error: () => {
          this.cargando.set(false);
          this.historial.update((prev) => [
            ...prev,
            {
              role: 'assistant',
              content: 'No pude responder en este momento. Por favor verifica tu conexión o intenta más tarde.',
              hora: this.horaActual(),
            },
          ]);
        },
      })
    );
  }

  limpiarConversacion(): void {
    this.historial.set([
      {
        role: 'assistant',
        content: 'Conversación reiniciada. ¿En qué puedo colaborarte?',
        hora: this.horaActual(),
      },
    ]);
  }

  private horaActual(): string {
    const ahora = new Date();
    return ahora.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}
