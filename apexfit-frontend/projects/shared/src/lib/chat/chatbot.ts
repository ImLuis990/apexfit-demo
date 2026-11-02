import {
  AfterViewChecked,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  signal,
  ViewChild,
} from '@angular/core';
import { ChatService } from './chat.service';

@Component({
  selector: 'lib-chatbot',
  templateUrl: './chatbot.html',
  styleUrl: './chatbot.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatBotComponent implements AfterViewChecked {
  protected readonly chatService = inject(ChatService);
  protected readonly abierto = signal(false);

  @ViewChild('mensajesContainer') private mensajesContainer?: ElementRef<HTMLDivElement>;
  @ViewChild('inputMensaje') private inputMensaje?: ElementRef<HTMLInputElement>;

  private debeHacerScroll = false;

  ngAfterViewChecked(): void {
    if (this.debeHacerScroll && this.mensajesContainer) {
      const el = this.mensajesContainer.nativeElement;
      el.scrollTop = el.scrollHeight;
      this.debeHacerScroll = false;
    }
  }

  alternarChat(): void {
    this.abierto.update((val) => !val);
    if (this.abierto()) {
      this.debeHacerScroll = true;
      setTimeout(() => this.inputMensaje?.nativeElement.focus(), 150);
    }
  }

  cerrar(): void {
    this.abierto.set(false);
  }

  limpiar(): void {
    this.chatService.limpiarConversacion();
  }

  enviar(event: Event): void {
    event.preventDefault();
    if (!this.inputMensaje) return;
    const input = this.inputMensaje.nativeElement;
    const texto = input.value.trim();
    if (!texto || this.chatService.cargando()) return;

    input.value = '';
    this.debeHacerScroll = true;

    this.chatService.enviarMensaje(texto).subscribe({
      next: () => {
        this.debeHacerScroll = true;
      },
      error: () => {
        this.debeHacerScroll = true;
      },
    });
  }
}
