import { create } from 'zustand';

import { SEED_CHAT } from '@/constants/dummy';
import { ChatMessage } from '@/constants/moods';

type ChatMode = NonNullable<ChatMessage['mode']>;

interface ChatStore {
  messages: ChatMessage[];
  mode: ChatMode;
  isThinking: boolean;
  sendMessage: (text: string) => Promise<void>;
  setMode: (mode: ChatMode) => void;
  clearChat: () => void;
}

const responseForMode: Record<ChatMode, string> = {
  listen: 'Aku dengar kamu. Dari pola minggu ini, mood berat sering muncul bareng belanja malam. Kita pelan-pelan cari sinyalnya ya.',
  humor: 'Boney mencium aroma checkout impulsif 🐶 Kalau keranjang belanja bisa menggonggong, dia sudah bilang: tidur dulu 10 menit!',
  solution: 'Coba pasang aturan 24 jam untuk kategori Shopping saat mood anxious/sad. Kalau besok masih terasa penting, baru beli dengan tenang.',
};

export const useChatStore = create<ChatStore>((set, get) => ({
  messages: SEED_CHAT,
  mode: 'listen',
  isThinking: false,
  setMode: (mode) => set({ mode }),
  clearChat: () => set({ messages: SEED_CHAT, mode: 'listen', isThinking: false }),
  sendMessage: async (text) => {
    const trimmed = text.trim();
    if (!trimmed || get().isThinking) {
      return;
    }

    const mode = get().mode;
    const userMessage: ChatMessage = {
      id: `${Date.now()}-user`,
      role: 'user',
      text: trimmed,
      timestamp: new Date(),
    };

    set((state) => ({ messages: [...state.messages, userMessage], isThinking: true }));

    await new Promise((resolve) => setTimeout(resolve, 1100));

    const assistantMessage: ChatMessage = {
      id: `${Date.now()}-assistant`,
      role: 'assistant',
      text: responseForMode[mode],
      mode,
      timestamp: new Date(),
    };

    set((state) => ({ messages: [...state.messages, assistantMessage], isThinking: false }));
  },
}));
