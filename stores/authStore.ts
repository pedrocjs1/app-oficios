import { create } from 'zustand';
import { Session } from '@supabase/supabase-js';

type User = {
  id: string;
  email: string | null;
  name: string;
  phone: string | null;
  avatar_url: string | null;
  role: 'client' | 'professional' | 'both';
  push_token: string | null;
};

type AuthState = {
  session: Session | null;
  user: User | null;
  setSession: (session: Session | null) => void;
  setUser: (user: User | null) => void;
  isAuthenticated: () => boolean;
  isProfessional: () => boolean;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  setSession: (session) => set({ session }),
  setUser: (user) => set({ user }),
  isAuthenticated: () => !!get().session,
  isProfessional: () => {
    const role = get().user?.role;
    return role === 'professional' || role === 'both';
  },
}));
