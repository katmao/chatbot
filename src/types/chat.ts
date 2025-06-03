export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface ChatState {
  messages: ChatMessage[];
  isVoiceMode: boolean;
  isListening: boolean;
  isProcessing: boolean;
  isSpeaking: boolean;
} 