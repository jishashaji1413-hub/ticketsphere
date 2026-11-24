import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Command,
  Loader2,
  LogOut,
  Menu,
  Search,
  User as UserIcon,
  X,
} from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '../../context/NavigationContext';
import { DynamicIcon } from '../../utils/iconMap';
import { ThemeToggle } from '../ThemeToggle';
import { TicketSphereLogo } from '../TicketSphereLogo';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
}

export function AppShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const { modules, loadingNav } = useNavigation();
  const location = useLocation();
  const navigate = useNavigate();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [globalSearch, setGlobalSearch] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [expandedModuleIds, setExpandedModuleIds] = useState<Record<string, boolean>>({});

  const loadNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const res = await api.get<{
        success: boolean;
        data: { items: NotificationItem[]; unreadCount: number };
      }>('/notifications');
      setNotifications(res.data.data.items);
      setUnreadCount(res.data.data.unreadCount);
    } catch {
      // ignore transient errors
    }
  }, [user]);

  useEffect(() => {
    void loadNotifications();
    const timer = setInterval(() => void loadNotifications(), 30000);
    return () => clearInterval(timer);
  }, [loadNotifications]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const handleGlobalSearch = (e: FormEvent) => {
    e.preventDefault();
    const q = globalSearch.trim();
    if (q) {
      navigate(`/tickets?search=${encodeURIComponent(q)}`);
    } else {
      navigate('/tickets');
    }
  };

  const handleMarkRead = async (n: NotificationItem) => {
    if (!n.isRead) {
      await api.patch(`/notifications/${n.id}/read`);
      await loadNotifications();
    }
    setNotifOpen(false);
    if (n.link) navigate(n.link);
  };

  const handleMarkAllRead = async () => {
    await api.patch('/notifications/read-all');
    await loadNotifications();
  };

  useEffect(() => {
    for (const mod of modules) {
      const matchesSub = mod.submodules.some((s) => location.pathname === s.route);
      if (matchesSub || location.pathname === mod.route) {
        setExpandedModuleIds((prev) => ({ ...prev, [mod.id]: true }));
      }
    }
  }, [location.pathname, modules]);

  const toggleModuleExpand = (id: string) => {
    setExpandedModuleIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initials =
    user?.displayName
      ?.split(' ')
      .map((p) => p[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'TS';

  const activeLabel = (() => {
    if (location.pathname === '/profile') return 'Account Settings';
    for (const mod of modules) {
      const sub = mod.submodules.find((s) => s.route === location.pathname);
      if (sub) return `${mod.name} / ${sub.name}`;
      if (mod.route === location.pathname) return mod.name;
    }
    return 'Workspace';
  })();

  const SidebarContent = (
    <div className="flex h-full flex-col bg-gradient-to-b from-[#0F172A] via-[#111B33] to-[#0B1120] border-r border-slate-800/90 text-slate-200">
      <div className="flex h-16 items-center justify-between px-4 border-b border-slate-800/90">
        <Link to="/dashboard" className="flex items-center gap-2.5 overflow-hidden group">
          <TicketSphereLogo className="group-hover:scale-105 group-hover:rotate-6 transition-transform duration-200 ring-1 ring-white/15" />
          {!collapsed && (
            <span className="text-sm font-bold tracking-tight text-white truncate">
              TicketSphere
            </span>
          )}
        </Link>
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="hidden lg:flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:bg-white/10 hover:text-white transition"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
        </button>
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="lg:hidden p-1 text-slate-400 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-2.5 py-3 space-y-0.5">
        {loadingNav && modules.length === 0 ? (
          <div className="flex items-center gap-2 px-3 py-4 text-xs text-slate-400">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-400" />
            {!collapsed && <span>Loading menu...</span>}
          </div>
        ) : (
          modules.map((mod) => {
            const hasSubs = mod.submodules.length > 0;
            const isExpanded = Boolean(expandedModuleIds[mod.id]);
            const isModuleActive =
              location.pathname === mod.route ||
              mod.submodules.some((s) => s.route === location.pathname);

            if (!hasSubs) {
              return (
                <Link
                  key={mod.id}
                  to={mod.route}
                  onClick={() => setMobileOpen(false)}
                  className={`ts-nav-item flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13px] font-medium ${
                    isModuleActive
                      ? 'bg-gradient-to-r from-blue-600/30 via-indigo-500/20 to-cyan-500/10 text-white border-l-2 border-cyan-400 shadow-2xs'
                      : 'text-slate-300 hover:bg-white/[0.06] hover:text-white'
                  }`}
                  title={collapsed ? mod.name : undefined}
                >
                  <DynamicIcon
                    name={mod.icon}
                    className={`h-4 w-4 shrink-0 ${
                      isModuleActive ? 'text-cyan-300' : 'text-slate-400'
                    }`}
                  />
                  {!collapsed && <span className="truncate">{mod.name}</span>}
                </Link>
              );
            }

            return (
              <div key={mod.id} className="space-y-0.5">
                <button
                  type="button"
                  onClick={() => {
                    if (collapsed) {
                      navigate(mod.submodules[0]?.route || mod.route);
                      setMobileOpen(false);
                    } else {
                      toggleModuleExpand(mod.id);
                    }
                  }}
                  className={`ts-nav-item flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-[13px] font-medium ${
                    isModuleActive
                      ? 'text-white bg-white/[0.08]'
                      : 'text-slate-300 hover:bg-white/[0.06] hover:text-white'
                  }`}
                  title={collapsed ? mod.name : undefined}
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <DynamicIcon
                      name={mod.icon}
                      className={`h-4 w-4 shrink-0 ${
                        isModuleActive ? 'text-cyan-300' : 'text-slate-400'
                      }`}
                    />
                    {!collapsed && <span className="truncate">{mod.name}</span>}
                  </span>
                  {!collapsed && (
                    <ChevronDown
                      className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform ${
                        isExpanded ? 'rotate-180' : ''
                      }`}
                    />
                  )}
                </button>

                {!collapsed && isExpanded && (
                  <div className="ml-3.5 pl-2.5 border-l border-slate-800 space-y-0.5 py-0.5">
                    {mod.submodules.map((sub) => {
                      const subActive = location.pathname === sub.route;
                      return (
                        <Link
                          key={sub.id}
                          to={sub.route}
                          onClick={() => setMobileOpen(false)}
                          className={`flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium transition ${
                            subActive
                              ? 'bg-blue-500/20 text-cyan-300'
                              : 'text-slate-400 hover:bg-white/[0.06] hover:text-slate-100'
                          }`}
                        >
                          <DynamicIcon
                            name={sub.icon}
                            className={`h-3.5 w-3.5 shrink-0 ${
                              subActive ? 'text-cyan-300' : 'text-slate-500'
                            }`}
                          />
                          <span className="truncate">{sub.name}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </nav>

      <div className="border-t border-slate-800/90 p-2.5">
        <Link
          to="/profile"
          onClick={() => setMobileOpen(false)}
          className="flex items-center gap-2.5 rounded-lg p-2 hover:bg-white/[0.06] transition"
        >
          <div className="h-7 w-7 shrink-0 rounded-md bg-blue-600/30 border border-blue-400/30 flex items-center justify-center text-[11px] font-semibold text-white">
            {initials}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-white">
                {user?.displayName}
              </p>
              <p className="truncate text-[11px] text-slate-400">
                {user?.roles.map((r) => r.name).join(', ') || 'User'}
              </p>
            </div>
          )}
        </Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-[#D9E4F5] via-[#E2EAF7] to-[#D4E0F2] text-zinc-900 dark:bg-none dark:bg-[#0D1017] dark:text-zinc-100 transition-colors">
      <aside
        className={`hidden lg:block shrink-0 transition-all duration-150 ${
          collapsed ? 'w-[64px]' : 'w-60'
        }`}
      >
        <div className="sticky top-0 h-screen">{SidebarContent}</div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="relative w-60 max-w-xs h-full z-10">{SidebarContent}</div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0 relative">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-gradient-to-b from-blue-600/[0.05] via-cyan-500/[0.02] dark:from-blue-500/[0.07] dark:via-cyan-500/[0.02] to-transparent" />
        <header className="sticky top-0 z-30 h-16 bg-white/85 dark:bg-[#141821]/85 backdrop-blur-md border-b border-zinc-200/80 dark:border-zinc-800/80 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4 transition-colors">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-1.5 rounded-md text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="sm:hidden text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate">
              {activeLabel}
            </div>
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-zinc-400 dark:text-zinc-500 truncate">
              <span>TicketSphere</span>
              <span>/</span>
              <span className="font-medium text-zinc-800 dark:text-zinc-200 truncate">
                {activeLabel}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => setMobileSearchOpen((s) => !s)}
              className="md:hidden h-8 w-8 flex items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-500 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-[#181A1F] dark:text-zinc-400"
              title="Search"
            >
              <Search className="h-4 w-4" />
            </button>
            <form onSubmit={handleGlobalSearch} className="relative hidden md:block w-64 lg:w-72">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                placeholder="Search tickets, TS-001..."
                className="w-full rounded-md border border-zinc-200 bg-zinc-50 pl-8 pr-12 py-1.5 text-xs text-zinc-800 placeholder:text-zinc-400 focus:border-blue-500 focus:bg-white dark:border-zinc-800 dark:bg-[#111215] dark:text-zinc-200 dark:placeholder:text-zinc-500 dark:focus:bg-[#111215] dark:focus:border-blue-500 focus:outline-none transition"
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center gap-0.5 rounded border border-zinc-200 bg-white px-1 py-0.5 text-[10px] font-mono text-zinc-400 dark:border-zinc-700 dark:bg-zinc-800">
                <Command className="h-2.5 w-2.5" />K
              </span>
            </form>

            <ThemeToggle />

            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setNotifOpen((o) => !o);
                  setProfileMenuOpen(false);
                  void loadNotifications();
                }}
                className="relative h-8 w-8 flex items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-800 dark:bg-[#181A1F] dark:text-zinc-400 dark:hover:border-zinc-700 dark:hover:text-white transition"
                title="Notifications"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-rose-600 text-[10px] font-semibold text-white flex items-center justify-center tabular-nums">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="animate-fade-in fixed sm:absolute right-4 sm:right-0 left-4 sm:left-auto mt-2 sm:w-80 rounded-lg border border-zinc-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-[#181A1F] z-40 overflow-hidden">
                  <div className="px-3.5 py-2.5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                      Notifications ({unreadCount} unread)
                    </span>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={() => void handleMarkAllRead()}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        <CheckCheck className="h-3 w-3" />
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800">
                    {notifications.length === 0 ? (
                      <p className="p-6 text-center text-xs text-zinc-400">
                        You are all caught up.
                      </p>
                    ) : (
                      notifications.map((n) => (
                        <button
                          key={n.id}
                          type="button"
                          onClick={() => void handleMarkRead(n)}
                          className={`w-full text-left px-3.5 py-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition ${
                            !n.isRead ? 'bg-blue-50/50 dark:bg-blue-500/5' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-medium text-zinc-900 dark:text-zinc-100 truncate">
                              {n.title}
                            </span>
                            {!n.isRead && (
                              <span className="h-1.5 w-1.5 rounded-full bg-blue-600 shrink-0" />
                            )}
                          </div>
                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 line-clamp-2">
                            {n.message}
                          </p>
                          <p className="text-[10px] text-zinc-400 mt-1">
                            {new Date(n.createdAt).toLocaleString()}
                          </p>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setProfileMenuOpen((o) => !o);
                  setNotifOpen(false);
                }}
                className="flex items-center gap-2 rounded-md border border-zinc-200 bg-white pl-1.5 pr-2 py-1 text-xs hover:bg-zinc-50 dark:border-zinc-800 dark:bg-[#181A1F] dark:hover:border-zinc-700 transition"
              >
                <div className="h-5 w-5 rounded bg-zinc-800 dark:bg-zinc-700 flex items-center justify-center text-[10px] font-semibold text-white">
                  {initials}
                </div>
                <span className="hidden sm:inline font-medium text-zinc-700 dark:text-zinc-200">
                  {user?.displayName}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />
              </button>

              {profileMenuOpen && (
                <div className="animate-fade-in absolute right-0 mt-2 w-52 rounded-lg border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-800 dark:bg-[#181A1F] z-40">
                  <div className="px-3.5 py-2 border-b border-zinc-100 dark:border-zinc-800">
                    <p className="text-xs font-semibold text-zinc-900 dark:text-white truncate">
                      {user?.displayName}
                    </p>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                      {user?.email}
                    </p>
                  </div>
                  <Link
                    to="/profile"
                    onClick={() => setProfileMenuOpen(false)}
                    className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800/70 dark:hover:text-white"
                  >
                    <UserIcon className="h-3.5 w-3.5 text-zinc-400" />
                    Account &amp; Profile
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 px-3.5 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {mobileSearchOpen && (
          <form
            onSubmit={(e) => {
              handleGlobalSearch(e);
              setMobileSearchOpen(false);
            }}
            className="md:hidden px-4 py-2.5 bg-white dark:bg-[#16181D] border-b border-zinc-200 dark:border-zinc-800"
          >
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
              <input
                type="text"
                autoFocus
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                placeholder="Search tickets, TS-001..."
                className="w-full rounded-md border border-zinc-200 bg-zinc-50 pl-8 pr-3 py-1.5 text-xs text-zinc-800 dark:border-zinc-800 dark:bg-[#111215] dark:text-zinc-200 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </form>
        )}

        <main
          key={location.pathname}
          className="animate-fade-up relative z-10 flex-1 p-4 sm:p-6 lg:p-8 max-w-[1440px] w-full mx-auto"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
