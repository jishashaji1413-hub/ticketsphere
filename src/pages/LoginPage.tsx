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
    <div className="min-h-screen grid lg:grid-cols-12 bg-[#F6F7F9] text-zinc-900 dark:bg-[#111215] dark:text-zinc-100 transition-colors">
      {/* Left Architectural Editorial Panel */}
      <div className="hidden lg:flex lg:col-span-5 relative flex-col justify-between bg-gradient-to-br from-[#16181D] via-[#151A26] to-[#111318] text-zinc-100 p-10 xl:p-12 border-r border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-fintech-grid opacity-80" />
        <div className="relative z-10 flex items-center gap-2.5 animate-fade-up">
          <div className="h-8 w-8 rounded-md bg-gradient-to-br from-blue-600 to-sky-500 flex items-center justify-center text-white shadow-xs">
            <Layers className="h-4 w-4" />
          </div>
          <span className="text-base font-semibold tracking-tight text-white">TicketSphere</span>
        </div>

        <div className="relative z-10 max-w-md space-y-6 animate-fade-up" style={{ animationDelay: '70ms' }}>
          <div className="space-y-3">
            <p className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-blue-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              IT Service Management
            </p>
            <h1 className="text-2xl xl:text-3xl font-semibold tracking-tight leading-snug text-white">
              Structured incident tracking, Outlook mail sync, and Jira escalation.
            </h1>

          </div>

          <div className="space-y-2.5 pt-2 border-t border-zinc-800/80">
            <div className="ts-card-hover flex items-start gap-3 rounded-lg p-2.5 border border-transparent hover:border-zinc-800 hover:bg-white/[0.02]">
              <Mail className="h-4 w-4 text-blue-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-zinc-200">Microsoft Graph Outlook</p>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Sync mailbox threads and convert selected emails into tickets.
                </p>
              </div>
            </div>
            <div className="ts-card-hover flex items-start gap-3 rounded-lg p-2.5 border border-transparent hover:border-zinc-800 hover:bg-white/[0.02]">
              <GitBranch className="h-4 w-4 text-blue-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-zinc-200">Jira Cloud Integration</p>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Link or escalate engineering issues with independent status sync.
                </p>
              </div>
            </div>
            <div className="ts-card-hover flex items-start gap-3 rounded-lg p-2.5 border border-transparent hover:border-zinc-800 hover:bg-white/[0.02]">
              <ShieldCheck className="h-4 w-4 text-blue-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-zinc-200">Dynamic RBAC &amp; Modules</p>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Database-driven menus, project hierarchies, and audit logs.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-xs text-zinc-500 border-t border-zinc-800 pt-5">
          TicketSphere Platform
        </div>
      </div>

      {/* Right Authentication Form Panel */}
      <div className="lg:col-span-7 flex items-center justify-center p-6 sm:p-10 relative">
        <div className="absolute top-5 right-5">
          <ThemeToggle />
        </div>

        <div className="w-full max-w-[400px]">
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="h-8 w-8 rounded-md bg-blue-600 flex items-center justify-center text-white">
              <Layers className="h-4 w-4" />
            </div>
            <span className="text-base font-semibold text-zinc-900 dark:text-white">
              TicketSphere
            </span>
          </div>

          <div className="animate-fade-up rounded-lg bg-white border border-zinc-200 shadow-xs dark:bg-[#181A1F] dark:border-zinc-800 p-7">
            <div className="mb-6">
              <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-white">
                {needsInitialAdmin
                  ? 'Initialize Workspace'
                  : mode === 'register'
                    ? 'Create account'
                    : 'Sign in'}
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                {needsInitialAdmin
                  ? 'Set up the primary Administrator account.'
                  : mode === 'register'
                    ? 'Register with your work email to submit and track tickets.'
                    : 'Enter your credentials or sign in with Microsoft.'}
              </p>
            </div>

            {loadingConfig ? (
              <div className="flex items-center justify-center py-10 text-zinc-500 dark:text-zinc-400 gap-2 text-xs">
                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                <span>Loading...</span>
              </div>
            ) : (
              <>
                {needsInitialAdmin ? (
                  <div className="mb-5 rounded-md border border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-500/30 dark:bg-blue-500/10 p-3 text-xs dark:text-blue-200 flex gap-2.5">
                    <ShieldCheck className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                    <span>First-time setup: this account receives Administrator access.</span>
                  </div>
                ) : (
                  <div className="mb-5 grid grid-cols-2 rounded-md bg-zinc-100 border border-zinc-200 dark:bg-[#111215] p-0.5 dark:border-zinc-800 text-xs font-medium">
                    <button
                      type="button"
                      onClick={() => {
                        setMode('login');
                        setError(null);
                      }}
                      className={`rounded py-1.5 transition ${mode === 'login'
                          ? 'bg-white text-zinc-900 shadow-2xs dark:bg-zinc-800 dark:text-white'
                          : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
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
                      className={`rounded py-1.5 transition ${mode === 'register'
                          ? 'bg-white text-zinc-900 shadow-2xs dark:bg-zinc-800 dark:text-white'
                          : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
                        }`}
                    >
                      Create Account
                    </button>
                  </div>
                )}

                {error && (
                  <div className="mb-4 rounded-md border border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 p-3 text-xs dark:text-rose-300 flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-3.5">
                  {(needsInitialAdmin || mode === 'register') && (
                    <div>
                      <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                        Full Name
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                        <input
                          type="text"
                          required
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          placeholder="Alex Morgan"
                          className="w-full rounded-md border border-zinc-200 bg-white pl-9 pr-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 dark:border-zinc-700 dark:bg-[#111215] dark:text-white dark:placeholder:text-zinc-500 focus:border-blue-600 focus:outline-none transition"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Work Email
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@company.com"
                        className="w-full rounded-md border border-zinc-200 bg-white pl-9 pr-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 dark:border-zinc-700 dark:bg-[#111215] dark:text-white dark:placeholder:text-zinc-500 focus:border-blue-600 focus:outline-none transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
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
                        className="w-full rounded-md border border-zinc-200 bg-white pl-9 pr-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 dark:border-zinc-700 dark:bg-[#111215] dark:text-white dark:placeholder:text-zinc-500 focus:border-blue-600 focus:outline-none transition"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full rounded-md bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-500 hover:to-sky-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 transition flex items-center justify-center gap-2 shadow-xs"
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
                    <div className="my-5 flex items-center gap-3">
                      <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
                      <span className="text-[11px] uppercase tracking-wider text-zinc-400">or</span>
                      <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
                    </div>

                    <button
                      type="button"
                      onClick={handleMicrosoftSignIn}
                      className="w-full rounded-md border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-[#111215] px-4 py-2 text-sm font-medium dark:text-zinc-200 dark:hover:bg-zinc-800 transition flex items-center justify-center gap-2.5"
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
                      <p className="mt-2.5 text-center text-[11px] text-zinc-400">
                        Configure <code className="font-mono">AZURE_*</code> in{' '}
                        <code className="font-mono">backend/.env</code> for Entra ID
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
