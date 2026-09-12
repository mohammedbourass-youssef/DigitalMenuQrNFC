import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';

import { getCurrentUser, login, logout, register } from '@/services/authService';
import type { AuthState, LoginDTO, RegisterDTO, UserResponseDto } from '@/types';

const USER_STORAGE_KEY = 'smartmenu-user';

function saveUserToStorage(user: UserResponseDto) {
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
}

function clearUserFromStorage() {
  localStorage.removeItem(USER_STORAGE_KEY);
}

function getStoredUser(): UserResponseDto | null {
  try {
    const stored = localStorage.getItem(USER_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as UserResponseDto;
    }
  } catch {
    localStorage.removeItem(USER_STORAGE_KEY);
  }
  return null;
}

interface AuthContextValue extends AuthState {
  login: (data: LoginDTO) => Promise<void>;
  register: (data: RegisterDTO) => Promise<void>;
  logout: () => Promise<void>;
}

const defaultState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
};

const AuthContext = createContext<AuthContextValue>({
  ...defaultState,
  login: async () => undefined,
  register: async () => undefined,
  logout: async () => undefined,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserResponseDto | null>(getStoredUser);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const getUserSession = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      saveUserToStorage(currentUser);
    } catch {
      setUser(null);
      clearUserFromStorage();
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void getUserSession();
  }, [getUserSession]);

  const handleLogin = useCallback(
    async (data: LoginDTO) => {
      setIsLoading(true);
      setError(null);

      try {
        const currentUser = await login(data);
        setUser(currentUser);
        saveUserToStorage(currentUser);
        navigate('/');
      } catch (err: any) {
        const message = err?.response?.data?.error || 'Invalid credentials';
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [navigate],
  );

  const handleRegister = useCallback(
    async (data: RegisterDTO) => {
      setIsLoading(true);
      setError(null);

      try {
        const currentUser = await register(data);
        setUser(currentUser);
        saveUserToStorage(currentUser);
        navigate('/');
      } catch (err: any) {
        const message = err?.response?.data?.error || 'Unable to create account';
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [navigate],
  );

  const handleLogout = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      await logout();
    } catch {
      // Continue cleanup even if the logout API fails
    } finally {
      setUser(null);
      clearUserFromStorage();
      setIsLoading(false);
      navigate('/login');
    }
  }, [navigate]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: !!user,
      isLoading,
      error,
      login: handleLogin,
      register: handleRegister,
      logout: handleLogout,
    }),
    [error, handleLogin, handleLogout, handleRegister, isLoading, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
