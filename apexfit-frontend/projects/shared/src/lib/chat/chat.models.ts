export interface MensajeChat {
  role: 'user' | 'assistant';
  content: string;
  hora?: string;
}

export interface ChatRequest {
  message: string;
  history: MensajeChat[];
}

export interface ChatResponse {
  response: string;
}
