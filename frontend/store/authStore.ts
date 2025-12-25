/**
 * Zustand store для аутентификации
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authAPI, TokenResponse } from '@/services/api/auth';
import { usersAPI, UserProfileResponse } from '@/services/api/users';
import { apiClient } from '@/services/api/client';

interface AuthState {
  user: UserProfileResponse | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  setTokens: (tokens: TokenResponse) => void;
  setUser: (user: UserProfileResponse) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchUser: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      setTokens: (tokens: TokenResponse) => {
        apiClient.setToken(tokens.access_token);
        apiClient.setRefreshToken(tokens.refresh_token);
        set({
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          isAuthenticated: true,
        });
      },

      setUser: (user: UserProfileResponse) => {
        set({ user });
      },

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const tokens = await authAPI.login({ email, password });
          get().setTokens(tokens);
          await get().fetchUser();
        } catch (error: any) {
          // Обработка ошибок валидации FastAPI/Pydantic
          let errorMessage = 'Ошибка входа';
          
          if (error.response?.data?.detail) {
            const detail = error.response.data.detail;
            
            // Если это массив ошибок валидации (Pydantic format)
            if (Array.isArray(detail)) {
              errorMessage = detail.map((item: any) => {
                if (typeof item === 'string') return item;
                if (item.msg) return item.msg;
                return 'Ошибка валидации';
              }).filter(Boolean).join('. ');
            } 
            // Если это строка
            else if (typeof detail === 'string') {
              errorMessage = detail;
            }
            // Если это объект с сообщением
            else if (detail && typeof detail === 'object' && detail.message) {
              errorMessage = detail.message;
            }
          }
          
          set({
            error: errorMessage,
            isLoading: false,
          });
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      register: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const tokens = await authAPI.register({ email, password });
          get().setTokens(tokens);
          await get().fetchUser();
        } catch (error: any) {
          // Обработка ошибок валидации FastAPI/Pydantic
          let errorMessage = 'Ошибка регистрации';
          
          if (error?.response?.data?.detail) {
            const detail = error.response.data.detail;
            
            // Если это массив ошибок валидации (Pydantic format)
            if (Array.isArray(detail)) {
              errorMessage = detail.map((item: any) => {
                if (typeof item === 'string') return item;
                if (item && typeof item === 'object' && item.msg) return item.msg;
                return 'Ошибка валидации';
              }).filter(Boolean).join('. ');
            } 
            // Если это строка
            else if (typeof detail === 'string') {
              errorMessage = detail;
            }
            // Если это объект с сообщением
            else if (detail && typeof detail === 'object' && detail.message) {
              errorMessage = detail.message;
            }
          } else if (error?.message) {
            errorMessage = error.message;
          }
          
          set({
            error: errorMessage,
            isLoading: false,
          });
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      logout: async () => {
        try {
          await authAPI.logout();
        } catch (error) {
          console.error('Logout error:', error);
        } finally {
          if (typeof window !== 'undefined') {
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
          }
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
          });
        }
      },

      fetchUser: async () => {
        try {
          const user = await usersAPI.getProfile();
          set({ user, isAuthenticated: true });
        } catch (error) {
          set({ isAuthenticated: false, user: null });
        }
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
    }
  )
);

