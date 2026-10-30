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

function normalizeUser(user: UserResponseDto): UserResponseDto {
  return {
    ...user,
    features: Array.isArray(user.features) ? user.features : [],
  };
}

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
      return normalizeUser(JSON.parse(stored) as UserResponseDto);
    }
  } catch {
    localStorage.removeItem(USER_STORAGE_KEY);
  }
  return null;
}

async function fetchCurrentUser(): Promise<UserResponseDto> {
  const currentUser = normalizeUser(await getCurrentUser());
  saveUserToStorage(currentUser);
  return currentUser;
}

interface AuthContextValue extends AuthState {
  login: (data: LoginDTO) => Promise<void>;
  register: (data: RegisterDTO) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
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
  refreshUser: async () => undefined,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserResponseDto | null>(getStoredUser);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const currentUser = await fetchCurrentUser();
        setUser(currentUser);
        setIsAuthenticated(true);
      } catch {
        clearUserFromStorage();
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, []);

  const refreshUser = useCallback(async () => {
    const currentUser = await fetchCurrentUser();
    setUser(currentUser);
    setIsAuthenticated(true);
  }, []);

  const handleLogin = useCallback(
    async (data: LoginDTO) => {
      setIsLoading(true);
      setError(null);

      try {
        const loginUser = normalizeUser(await login(data));
        let currentUser = loginUser;

        try {
          currentUser = await fetchCurrentUser();
        } catch {
          saveUserToStorage(loginUser);
        }

        setUser(currentUser);
        setIsAuthenticated(true);
        navigate('/');
      } catch (err: any) {
        const message =
          err?.response?.data?.error ||
          err?.response?.data?.message ||
          (!err?.response ? 'Unable to connect to server. Please check your internet and try again.' : 'Invalid credentials');
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
        const registeredUser = normalizeUser(await register(data));
        let currentUser = registeredUser;

        try {
          currentUser = await fetchCurrentUser();
        } catch {
          saveUserToStorage(registeredUser);
        }

        setUser(currentUser);
        setIsAuthenticated(true);
        navigate('/');
      } catch (err: any) {
        const message =
          err?.response?.data?.error ||
          err?.response?.data?.message ||
          (!err?.response ? 'Unable to connect to server. Please check your internet and try again.' : 'Unable to create account');
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
      isAuthenticated,
      isLoading,
      error,
      login: handleLogin,
      register: handleRegister,
      logout: handleLogout,
      refreshUser,
    }),
    [error, handleLogin, handleLogout, handleRegister, isAuthenticated, isLoading, refreshUser, user],
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
