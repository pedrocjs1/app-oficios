import { create } from 'zustand';
import { Session } from '@supabase/supabase-js';

type User = {
  id: string;
  email: string | null;
  name: string;
  phone: string | null;
  avatar_url: string | null;
  role: 'client' | 'professional' | 'both' | 'admin';
  push_token: string | null;
};

type AuthState = {
  session: Session | null;
  user: User | null;
  token: string | null;
  setSession: (session: Session | null) => void;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  isAuthenticated: () => boolean;
  isProfessional: () => boolean;
  isAdmin: () => boolean;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  token: null,
  setSession: (session) => set({ session }),
  setUser: (user) => set({ user }),
  setToken: (token) => set({ token }),
  isAuthenticated: () => !!get().token,
  isProfessional: () => {
    const role = get().user?.role;
    return role === 'professional' || role === 'both';
  },
  isAdmin: () => get().user?.role === 'admin',
}));
