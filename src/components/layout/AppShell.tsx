import { useEffect, useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Command,
  Layers,
  Loader2,
  LogOut,
  Menu,
  Search,
  User as UserIcon,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '../../context/NavigationContext';
import { DynamicIcon } from '../../utils/iconMap';
import { ThemeToggle } from '../ThemeToggle';

export function AppShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const { modules, loadingNav } = useNavigation();
  const location = useLocation();
  const navigate = useNavigate();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [expandedModuleIds, setExpandedModuleIds] = useState<Record<string, boolean>>({});

  // Auto-expand the module matching the current route
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
    <div className="flex h-full flex-col bg-white dark:bg-[#0D1321] border-r border-slate-200/90 dark:border-slate-800/80 transition-colors">
      <div className="flex h-16 items-center justify-between px-4 border-b border-slate-200/80 dark:border-slate-800/80">
        <Link to="/dashboard" className="flex items-center gap-2.5 overflow-hidden">
          <div className="h-8 w-8 shrink-0 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-950/20 dark:shadow-indigo-950/60 ring-1 ring-white/15">
            <Layers className="h-4 w-4" />
          </div>
          {!collapsed && (
            <div className="truncate flex items-center gap-2">
              <span className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">
                TicketSphere
              </span>
              <span className="rounded-md bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200 dark:bg-indigo-500/15 px-1.5 py-0.5 text-[10px] font-semibold dark:text-indigo-300 dark:ring-indigo-400/20">
                ITSM
              </span>
            </div>
          )}
        </Link>
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="hidden lg:flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/[0.06] dark:hover:text-white transition"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="lg:hidden p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5">
        {loadingNav && modules.length === 0 ? (
          <div className="flex items-center gap-2 px-3 py-4 text-xs text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
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
                  className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition ${
                    isModuleActive
                      ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200 dark:bg-gradient-to-r dark:from-indigo-600/20 dark:to-violet-600/10 dark:text-white dark:ring-indigo-500/30 shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/[0.04] dark:hover:text-slate-100'
                  }`}
                  title={collapsed ? mod.name : undefined}
                >
                  {isModuleActive && (
                    <span className="absolute left-0 top-2 bottom-2 w-0.5 rounded-r bg-indigo-600 dark:bg-indigo-400" />
                  )}
                  <DynamicIcon
                    name={mod.icon}
                    className={`h-4 w-4 shrink-0 ${
                      isModuleActive
                        ? 'text-indigo-600 dark:text-indigo-400'
                        : 'text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300'
                    }`}
                  />
                  {!collapsed && <span className="truncate">{mod.name}</span>}
                </Link>
              );
            }

            return (
              <div key={mod.id} className="space-y-1">
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
                  className={`group relative flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-[13px] font-medium transition ${
                    isModuleActive
                      ? 'bg-slate-100 text-slate-900 dark:bg-white/[0.05] dark:text-white'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/[0.04] dark:hover:text-slate-100'
                  }`}
                  title={collapsed ? mod.name : undefined}
                >
                  <span className="flex items-center gap-3 min-w-0">
                    <DynamicIcon
                      name={mod.icon}
                      className={`h-4 w-4 shrink-0 ${
                        isModuleActive
                          ? 'text-indigo-600 dark:text-indigo-400'
                          : 'text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300'
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
                  <div className="ml-4 pl-3 border-l border-slate-200 dark:border-slate-800 space-y-0.5">
                    {mod.submodules.map((sub) => {
                      const subActive = location.pathname === sub.route;
                      return (
                        <Link
                          key={sub.id}
                          to={sub.route}
                          onClick={() => setMobileOpen(false)}
                          className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium transition ${
                            subActive
                              ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200 dark:bg-indigo-500/15 dark:text-indigo-300 dark:ring-indigo-500/30'
                              : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/[0.04] dark:hover:text-slate-200'
                          }`}
                        >
                          <DynamicIcon
                            name={sub.icon}
                            className={`h-3.5 w-3.5 shrink-0 ${
                              subActive
                                ? 'text-indigo-600 dark:text-indigo-400'
                                : 'text-slate-400 dark:text-slate-500'
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

      <div className="border-t border-slate-200/80 dark:border-slate-800/80 p-3">
        <Link
          to="/profile"
          onClick={() => setMobileOpen(false)}
          className="flex items-center gap-2.5 rounded-xl p-2 hover:bg-slate-100 dark:hover:bg-white/[0.04] transition"
        >
          <div className="h-8 w-8 shrink-0 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-xs font-bold text-white">
            {initials}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-slate-900 dark:text-slate-100">
                {user?.displayName}
              </p>
              <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                {user?.roles.map((r) => r.name).join(', ') || 'User'}
              </p>
            </div>
          )}
        </Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-[#F4F6FA] text-slate-900 dark:bg-[#090D16] dark:text-slate-100 transition-colors">
      <aside
        className={`hidden lg:block shrink-0 transition-all duration-200 ${
          collapsed ? 'w-[72px]' : 'w-64'
        }`}
      >
        <div className="sticky top-0 h-screen">{SidebarContent}</div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-xs"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative w-64 max-w-xs h-full z-10">{SidebarContent}</div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0 relative">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-indigo-500/[0.04] dark:from-indigo-950/20 to-transparent" />

        <header className="sticky top-0 z-30 h-16 bg-white/85 dark:bg-[#0D1321]/85 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 px-4 sm:px-6 flex items-center justify-between gap-4 transition-colors">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/[0.06] dark:hover:text-white"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500 truncate">
              <span>TicketSphere</span>
              <span>/</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                {activeLabel}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5">
            <div className="relative hidden md:block w-64 lg:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                placeholder="Search tickets, users, Jira..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-12 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white dark:focus:bg-[#0B101B] dark:border-slate-800 dark:bg-[#090D16] dark:text-slate-200 dark:placeholder:text-slate-500 dark:focus:border-indigo-500/70 focus:outline-none transition"
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center gap-0.5 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-mono text-slate-400 dark:border-slate-700 dark:bg-slate-800/80">
                <Command className="h-2.5 w-2.5" />K
              </span>
            </div>

            <ThemeToggle />

            <button
              type="button"
              className="relative h-8 w-8 flex items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-800 dark:border-slate-800 dark:bg-[#111827] dark:text-slate-400 dark:hover:border-slate-700 dark:hover:text-white transition"
              title="Notifications"
            >
              <Bell className="h-4 w-4" />
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={() => setProfileMenuOpen((o) => !o)}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white pl-1.5 pr-2.5 py-1 text-xs hover:bg-slate-50 dark:border-slate-800 dark:bg-[#111827] dark:hover:border-slate-700 transition"
              >
                <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-[11px] font-bold text-white">
                  {initials}
                </div>
                <span className="hidden sm:inline font-medium text-slate-700 dark:text-slate-200">
                  {user?.displayName}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
              </button>

              {profileMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-200 bg-white py-1.5 shadow-xl dark:border-slate-800 dark:bg-[#111827] dark:shadow-2xl z-40">
                  <div className="px-3.5 py-2 border-b border-slate-100 dark:border-slate-800">
                    <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                      {user?.displayName}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {user?.email}
                    </p>
                  </div>
                  <Link
                    to="/profile"
                    onClick={() => setProfileMenuOpen(false)}
                    className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/[0.05] dark:hover:text-white"
                  >
                    <UserIcon className="h-3.5 w-3.5 text-slate-400" />
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

        <main className="relative z-10 flex-1 p-4 sm:p-6 lg:p-8 max-w-[1440px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
