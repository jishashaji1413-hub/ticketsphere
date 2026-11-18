import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  GitBranch,
  Layers,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
  User,
} from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { ThemeToggle } from '../components/ThemeToggle';

export default function LoginPage() {
  const { user, login, register, registerInitialAdmin } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [needsInitialAdmin, setNeedsInitialAdmin] = useState(false);
  const [microsoftEnabled, setMicrosoftEnabled] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [mode, setMode] = useState<'login' | 'register'>('login');

  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(searchParams.get('error'));

  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await api.get<{
          success: boolean;
          data: { needsInitialAdmin: boolean; microsoftEnabled: boolean };
        }>('/auth/config');
        setNeedsInitialAdmin(res.data.data.needsInitialAdmin);
        setMicrosoftEnabled(res.data.data.microsoftEnabled);
      } catch {
        setError('Unable to connect to TicketSphere API');
      } finally {
        setLoadingConfig(false);
      }
    };
    void fetchConfig();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (needsInitialAdmin) {
        await registerInitialAdmin(email, displayName, password);
      } else if (mode === 'register') {
        await register(email, displayName, password);
      } else {
        await login(email, password);
      }
      navigate('/dashboard', { replace: true });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Authentication failed';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleMicrosoftSignIn = async () => {
    setError(null);
    try {
      const res = await api.get<{ success: boolean; data: { url: string } }>('/auth/microsoft/url');
      window.location.href = res.data.data.url;
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Microsoft Entra ID is not configured yet';
      setError(msg);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-12 bg-[#F4F6FA] text-slate-900 dark:bg-[#090D16] dark:text-slate-100 transition-colors">
      {/* Left Architectural Showcase Panel */}
      <div className="hidden lg:flex lg:col-span-6 relative flex-col justify-between bg-[#0B1120] text-white p-10 xl:p-14 border-r border-slate-200 dark:border-slate-800/80 overflow-hidden">
        <div className="absolute inset-0 bg-arch-grid opacity-70 pointer-events-none" />
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-indigo-600/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-24 h-96 w-96 rounded-full bg-cyan-500/15 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-950/60 ring-1 ring-white/15">
            <Layers className="h-5 w-5 text-white" />
          </div>
          <div>
            <span className="text-lg font-bold tracking-tight text-white">TicketSphere</span>
            <span className="ml-2 rounded-full bg-indigo-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-indigo-300 ring-1 ring-indigo-400/25">
              Enterprise
            </span>
          </div>
        </div>

        <div className="relative z-10 max-w-lg space-y-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-300 ring-1 ring-indigo-400/20">
              <Sparkles className="h-3.5 w-3.5" />
              IT Service Management &amp; Support Operations
            </div>
            <h1 className="text-3xl xl:text-4xl font-bold tracking-tight leading-[1.15] text-white">
              Resolve incidents faster with Outlook &amp; Jira in one command center.
            </h1>
            <p className="text-sm xl:text-base text-slate-400 leading-relaxed">
              Built for modern IT teams. Turn incoming Outlook threads into tracked tickets,
              escalate to Jira Cloud engineering, and govern access with dynamic RBAC.
            </p>
          </div>

          <div className="grid gap-3.5">
            <div className="flex items-start gap-3.5 rounded-xl bg-white/[0.04] p-4 ring-1 ring-white/10">
              <div className="h-8 w-8 rounded-lg bg-sky-500/15 text-sky-400 flex items-center justify-center shrink-0">
                <Mail className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Microsoft Graph Outlook Sync</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Ingest mailbox threads, prevent duplicates, and reply directly from ticket timelines.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 rounded-xl bg-white/[0.04] p-4 ring-1 ring-white/10">
              <div className="h-8 w-8 rounded-lg bg-indigo-500/15 text-indigo-400 flex items-center justify-center shrink-0">
                <GitBranch className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Jira Cloud Issue Linking</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Link or create Jira issues with live sync status and independent workflow rules.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 rounded-xl bg-white/[0.04] p-4 ring-1 ring-white/10">
              <div className="h-8 w-8 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Dynamic Modules &amp; RBAC</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Database-driven navigation, granular role permissions, and full audit trails.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between text-xs text-slate-500 border-t border-white/10 pt-6">
          <span>TicketSphere ITSM Platform</span>
          {/* <span className="font-mono">PostgreSQL • Prisma • Microsoft Graph</span> */}
        </div>
      </div>

      {/* Right Authentication Form Panel */}
      <div className="lg:col-span-6 flex items-center justify-center p-6 sm:p-10 relative overflow-hidden">
        <div className="absolute top-5 right-5 z-20">
          <ThemeToggle />
        </div>
        <div className="hidden dark:block absolute top-1/4 right-1/4 h-72 w-72 rounded-full bg-indigo-600/10 blur-3xl pointer-events-none" />

        <div className="w-full max-w-[430px] relative z-10">
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white">
              <Layers className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold text-slate-900 dark:text-white">TicketSphere</span>
          </div>

          <div className="rounded-2xl bg-white border border-slate-200/90 shadow-lg dark:bg-[#111827]/90 dark:backdrop-blur-xl dark:border-slate-800 dark:shadow-2xl p-7 sm:p-8">
            <div className="mb-6">
              <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                {needsInitialAdmin
                  ? 'Initialize Workspace'
                  : mode === 'register'
                    ? 'Create your account'
                    : 'Sign in to workspace'}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {needsInitialAdmin
                  ? 'Set up the primary Administrator account to get started.'
                  : mode === 'register'
                    ? 'Register with your work email to submit and track tickets.'
                    : 'Enter your credentials or continue with Microsoft Entra ID.'}
              </p>
            </div>

            {loadingConfig ? (
              <div className="flex items-center justify-center py-12 text-slate-500 dark:text-slate-400 gap-2 text-sm">
                <Loader2 className="h-4 w-4 animate-spin text-indigo-600 dark:text-indigo-400" />
                <span>Checking workspace configuration...</span>
              </div>
            ) : (
              <>
                {needsInitialAdmin ? (
                  <div className="mb-5 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-950 dark:border-indigo-500/30 dark:bg-indigo-500/10 p-3.5 text-xs dark:text-indigo-200 flex gap-2.5">
                    <ShieldCheck className="h-5 w-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <div>
                      <p className="font-semibold text-indigo-950 dark:text-white">
                        First-Time Bootstrap
                      </p>
                      <p className="text-indigo-700 dark:text-indigo-300 mt-0.5">
                        This one-time account receives full Administrator permissions.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="mb-6 grid grid-cols-2 rounded-xl bg-slate-100 border border-slate-200 dark:bg-[#090D16] p-1 dark:border-slate-800 text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => {
                        setMode('login');
                        setError(null);
                      }}
                      className={`rounded-lg py-2 transition ${
                        mode === 'login'
                          ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-white'
                          : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                      }`}
                    >
                      Sign In
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMode('register');
                        setError(null);
                      }}
                      className={`rounded-lg py-2 transition ${
                        mode === 'register'
                          ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-white'
                          : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                      }`}
                    >
                      Create Account
                    </button>
                  </div>
                )}

                {error && (
                  <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 p-3.5 text-xs dark:text-rose-300 flex items-start gap-2.5">
                    <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  {(needsInitialAdmin || mode === 'register') && (
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                        Full Name
                      </label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
                        <input
                          type="text"
                          required
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          placeholder="Alex Morgan"
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white dark:focus:bg-[#0B101B] dark:border-slate-800 dark:bg-[#090D16] dark:text-white dark:placeholder:text-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                      Work Email
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@company.com"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white dark:focus:bg-[#0B101B] dark:border-slate-800 dark:bg-[#090D16] dark:text-white dark:placeholder:text-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
                      <input
                        type="password"
                        required
                        minLength={needsInitialAdmin || mode === 'register' ? 8 : 1}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={
                          needsInitialAdmin || mode === 'register'
                            ? 'Minimum 8 characters'
                            : 'Enter your password'
                        }
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white dark:focus:bg-[#0B101B] dark:border-slate-800 dark:bg-[#090D16] dark:text-white dark:placeholder:text-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:from-indigo-500 hover:to-violet-500 disabled:opacity-60 transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-950/20 dark:shadow-indigo-950/50"
                  >
                    {submitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <span>
                          {needsInitialAdmin
                            ? 'Create Admin & Continue'
                            : mode === 'register'
                              ? 'Create Account'
                              : 'Sign In'}
                        </span>
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </form>

                {!needsInitialAdmin && (
                  <>
                    <div className="my-6 flex items-center gap-3">
                      <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                      <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        Single Sign-On
                      </span>
                      <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                    </div>

                    <button
                      type="button"
                      onClick={handleMicrosoftSignIn}
                      className="w-full rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 dark:border-slate-700/80 dark:bg-[#090D16] px-4 py-2.5 text-sm font-medium dark:text-slate-200 dark:hover:bg-slate-800/70 dark:hover:border-slate-600 transition flex items-center justify-center gap-2.5"
                    >
                      <svg className="h-4 w-4" viewBox="0 0 21 21" fill="none">
                        <rect x="1" y="1" width="9" height="9" fill="#F25022" />
                        <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
                        <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
                        <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
                      </svg>
                      Continue with Microsoft Outlook
                    </button>
                    {!microsoftEnabled && (
                      <p className="mt-2.5 text-center text-[11px] text-slate-400 dark:text-slate-500">
                        Add <code className="font-mono text-slate-500 dark:text-slate-400">AZURE_*</code>{' '}
                        keys in{' '}
                        <code className="font-mono text-slate-500 dark:text-slate-400">backend/.env</code>{' '}
                        to enable Entra ID
                      </p>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
