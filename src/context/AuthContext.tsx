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

const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000;
const LAST_ACTIVITY_KEY = 'ticketsphere_last_activity';
const ACTIVITY_THROTTLE_MS = 1000;

function recordActivityTimestamp(now = Date.now()): void {
  localStorage.setItem(LAST_ACTIVITY_KEY, String(now));
}

function getLastActivityTimestamp(): number | null {
  const raw = localStorage.getItem(LAST_ACTIVITY_KEY);
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    setStoredToken(null);
    localStorage.removeItem(LAST_ACTIVITY_KEY);
    setUser(null);
  }, []);

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
    recordActivityTimestamp();
    setUser(res.data.data.user);
  };

  const registerInitialAdmin = async (email: string, displayName: string, password: string) => {
    const res = await api.post<{ success: boolean; data: { token: string; user: UserProfile } }>(
      '/auth/register-admin',
      { email, displayName, password }
    );
    setStoredToken(res.data.data.token);
    recordActivityTimestamp();
    setUser(res.data.data.user);
  };

  const register = async (email: string, displayName: string, password: string) => {
    const res = await api.post<{ success: boolean; data: { token: string; user: UserProfile } }>(
      '/auth/register',
      { email, displayName, password }
    );
    setStoredToken(res.data.data.token);
    recordActivityTimestamp();
    setUser(res.data.data.user);
  };

  const completeOAuthLogin = async (token: string) => {
    setStoredToken(token);
    recordActivityTimestamp();
    await refreshUser();
  };

  useEffect(() => {
    if (!user) return;

    let timeoutId: number | undefined;
    let lastHandledAt = 0;

    const scheduleLogout = (remainingMs: number) => {
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
      timeoutId = window.setTimeout(() => {
        const lastActive = getLastActivityTimestamp() ?? Date.now();
        const elapsed = Date.now() - lastActive;
        if (elapsed >= INACTIVITY_TIMEOUT_MS) {
          logout();
        } else {
          scheduleLogout(INACTIVITY_TIMEOUT_MS - elapsed);
        }
      }, Math.max(0, remainingMs));
    };

    const existingLastActive = getLastActivityTimestamp();
    if (existingLastActive !== null && Date.now() - existingLastActive >= INACTIVITY_TIMEOUT_MS) {
      logout();
      return;
    }

    if (existingLastActive === null) {
      recordActivityTimestamp();
      scheduleLogout(INACTIVITY_TIMEOUT_MS);
    } else {
      scheduleLogout(INACTIVITY_TIMEOUT_MS - (Date.now() - existingLastActive));
    }

    const handleActivity = () => {
      const now = Date.now();
      if (now - lastHandledAt < ACTIVITY_THROTTLE_MS) return;
      lastHandledAt = now;
      recordActivityTimestamp(now);
      scheduleLogout(INACTIVITY_TIMEOUT_MS);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return;
      const lastActive = getLastActivityTimestamp();
      if (lastActive !== null) {
        const elapsed = Date.now() - lastActive;
        if (elapsed >= INACTIVITY_TIMEOUT_MS) {
          logout();
          return;
        }
        scheduleLogout(INACTIVITY_TIMEOUT_MS - elapsed);
      }
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === LAST_ACTIVITY_KEY) {
        if (event.newValue === null) {
          logout();
          return;
        }
        const parsed = Number(event.newValue);
        if (Number.isFinite(parsed)) {
          const elapsed = Date.now() - parsed;
          if (elapsed >= INACTIVITY_TIMEOUT_MS) {
            logout();
          } else {
            scheduleLogout(INACTIVITY_TIMEOUT_MS - elapsed);
          }
        }
      }
    };

    const activityEvents: Array<keyof WindowEventMap> = [
      'mousemove',
      'mousedown',
      'keydown',
      'scroll',
      'touchstart',
    ];

    for (const eventName of activityEvents) {
      window.addEventListener(eventName, handleActivity, { passive: true });
    }
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('storage', handleStorage);

    return () => {
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
      for (const eventName of activityEvents) {
        window.removeEventListener(eventName, handleActivity);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('storage', handleStorage);
    };
  }, [user, logout]);

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
