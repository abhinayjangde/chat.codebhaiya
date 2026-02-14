import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, AuthTokens } from '@/types';

interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  setAuth: (user: User, tokens: AuthTokens) => void;
  logout: () => void;
  getAccessToken: () => string | null;
  getRefreshToken: () => string | null;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      tokens: null,
      isAuthenticated: false,
      
      setAuth: (user, tokens) => {
        set({ user, tokens, isAuthenticated: true });
      },
      
      logout: () => {
        set({ user: null, tokens: null, isAuthenticated: false });
      },
      
      getAccessToken: () => {
        return get().tokens?.accessToken || null;
      },
      
      getRefreshToken: () => {
        return get().tokens?.refreshToken || null;
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);