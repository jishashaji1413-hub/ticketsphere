import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from '../lib/api';
import { useAuth } from './AuthContext';
import type { NavigationModule } from '../types/module';

interface NavigationContextValue {
  modules: NavigationModule[];
  loadingNav: boolean;
  refreshNavigation: () => Promise<void>;
}

const NavigationContext = createContext<NavigationContextValue | undefined>(undefined);

export function NavigationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [modules, setModules] = useState<NavigationModule[]>([]);
  const [loadingNav, setLoadingNav] = useState(false);

  const refreshNavigation = useCallback(async () => {
    if (!user) {
      setModules([]);
      return;
    }

    setLoadingNav(true);
    try {
      const res = await api.get<{ success: boolean; data: NavigationModule[] }>(
        '/modules/navigation'
      );
      setModules(res.data.data);
    } catch {
      setModules([]);
    } finally {
      setLoadingNav(false);
    }
  }, [user]);

  useEffect(() => {
    void refreshNavigation();
  }, [refreshNavigation]);

  return (
    <NavigationContext.Provider value={{ modules, loadingNav, refreshNavigation }}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation(): NavigationContextValue {
  const ctx = useContext(NavigationContext);
  if (!ctx) {
    throw new Error('useNavigation must be used within NavigationProvider');
  }
  return ctx;
}
