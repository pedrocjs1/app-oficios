import { create } from 'zustand';

type Message = {
  id: string;
  job_id: string;
  sender_id: string;
  content: string;
  original_content: string | null;
  flagged: boolean;
  flag_reason: string | null;
  created_at: string;
};

type ChatState = {
  activeJobId: string | null;
  messages: Message[];
  isConnected: boolean;
  setActiveJobId: (jobId: string | null) => void;
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  clearChat: () => void;
  setConnected: (connected: boolean) => void;
};

export const useChatStore = create<ChatState>((set) => ({
  activeJobId: null,
  messages: [],
  isConnected: false,
  setActiveJobId: (activeJobId) => set({ activeJobId }),
  setMessages: (messages) => set({ messages }),
  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),
  clearChat: () => set({ messages: [], activeJobId: null }),
  setConnected: (isConnected) => set({ isConnected }),
}));
