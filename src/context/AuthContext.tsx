import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, getStoredToken, setStoredToken } from '../lib/api';
import type { UserProfile } from '../types/auth';

interface AuthContextValue {
  user: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, displayName: string, password: string) => Promise<void>;
  registerInitialAdmin: (email: string, displayName: string, password: string) => Promise<void>;
  completeOAuthLogin: (token: string) => Promise<void>;
  refreshUser: () => Promise<void>;
  logout: () => void;
  hasPermission: (code: string) => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const token = getStoredToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const res = await api.get<{ success: boolean; data: UserProfile }>('/auth/me');
      setUser(res.data.data);
    } catch {
      setStoredToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  const login = async (email: string, password: string) => {
    const res = await api.post<{ success: boolean; data: { token: string; user: UserProfile } }>(
      '/auth/login',
      { email, password }
    );
    setStoredToken(res.data.data.token);
    setUser(res.data.data.user);
  };

  const registerInitialAdmin = async (email: string, displayName: string, password: string) => {
    const res = await api.post<{ success: boolean; data: { token: string; user: UserProfile } }>(
      '/auth/register-admin',
      { email, displayName, password }
    );
    setStoredToken(res.data.data.token);
    setUser(res.data.data.user);
  };

  const register = async (email: string, displayName: string, password: string) => {
    const res = await api.post<{ success: boolean; data: { token: string; user: UserProfile } }>(
      '/auth/register',
      { email, displayName, password }
    );
    setStoredToken(res.data.data.token);
    setUser(res.data.data.user);
  };

  const completeOAuthLogin = async (token: string) => {
    setStoredToken(token);
    await refreshUser();
  };

  const logout = () => {
    setStoredToken(null);
    setUser(null);
  };

  const hasPermission = useCallback(
    (code: string) => {
      if (!user) return false;
      if (user.roles.some((r) => r.name === 'Admin')) return true;
      return user.permissions.includes(code);
    },
    [user]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        registerInitialAdmin,
        completeOAuthLogin,
        refreshUser,
        logout,
        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
