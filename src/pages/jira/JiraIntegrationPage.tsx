import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  GitBranch,
  Loader2,
  RefreshCw,
  Search,
} from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';

interface JiraStatus {
  configured: boolean;
  integration: {
    id: string;
    name: string;
    baseUrl: string;
    email: string;
    lastSyncAt: string | null;
    lastError: string | null;
  } | null;
}

interface LinkedJiraIssue {
  id: string;
  jiraKey: string;
  projectKey: string;
  summary: string;
  statusName: string;
  issueType: string;
  issueUrl: string;
  syncStatus: 'SYNCED' | 'PENDING' | 'FAILED';
  lastSyncedAt: string;
  syncError: string | null;
  tickets: Array<{ id: string; ticketNumber: string; title: string; status: string }>;
}

export default function JiraIntegrationPage() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission('jira.manage');

  const [status, setStatus] = useState<JiraStatus | null>(null);
  const [linkedIssues, setLinkedIssues] = useState<LinkedJiraIssue[]>([]);
  const [projects, setProjects] = useState<Array<{ id: string; key: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);

  const [baseUrl, setBaseUrl] = useState('');
  const [email, setEmail] = useState('');
  const [apiToken, setApiToken] = useState('');
  const [savingConfig, setSavingConfig] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<
    Array<{ jiraKey: string; summary: string; statusName: string; issueUrl: string }>
  >([]);
  const [searching, setSearching] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [statusRes, linkedRes] = await Promise.all([
        api.get<{ success: boolean; data: JiraStatus }>('/jira/status'),
        api.get<{ success: boolean; data: LinkedJiraIssue[] }>('/jira/linked'),
      ]);
      setStatus(statusRes.data.data);
      setLinkedIssues(linkedRes.data.data);
      if (statusRes.data.data.integration) {
        setBaseUrl(statusRes.data.data.integration.baseUrl);
        setEmail(statusRes.data.data.integration.email);
        try {
          const projRes = await api.get<{
            success: boolean;
            data: Array<{ id: string; key: string; name: string }>;
          }>('/jira/projects');
          setProjects(projRes.data.data);
        } catch {
          // ignore if credentials aren't verified yet
        }
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleSaveConfig = async (e: FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    setMessage(null);
    setError(null);
    try {
      await api.post('/jira/config', { baseUrl, email, apiToken });
      setApiToken('');
      setMessage('Jira credentials saved securely.');
      await loadData();
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Failed to save Jira configuration'
      );
    } finally {
      setSavingConfig(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setMessage(null);
    setError(null);
    try {
      const res = await api.post<{
        success: boolean;
        data: { account: { displayName: string } };
      }>('/jira/test');
      setMessage(`Connected to Jira as ${res.data.data.account.displayName}`);
      await loadData();
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Jira connection test failed'
      );
    } finally {
      setTesting(false);
    }
  };

  const handleSearchJira = async (e: FormEvent) => {
    e.preventDefault();
    setSearching(true);
    setError(null);
    try {
      const res = await api.get<{
        success: boolean;
        data: Array<{ jiraKey: string; summary: string; statusName: string; issueUrl: string }>;
      }>('/jira/search', { params: { q: searchQuery } });
      setSearchResults(res.data.data);
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Jira search failed'
      );
    } finally {
      setSearching(false);
    }
  };

  const handleSyncIssue = async (id: string) => {
    await api.post(`/jira/issues/${id}/sync`);
    await loadData();
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-zinc-200/80 dark:border-zinc-800/80 pb-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
          Integrations
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white mt-1">
          Jira Cloud Integration
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Configure Jira Cloud REST API credentials, browse projects, and monitor linked issue sync.
        </p>
      </div>

      {message && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 p-3.5 text-xs dark:text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 p-3.5 text-xs dark:text-rose-300 flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-[#181A1F] p-12 text-center text-zinc-400">
          <Loader2 className="h-5 w-5 animate-spin inline mr-2 text-blue-500" />
          Loading Jira integration...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Connection Config */}
          {canManage && (
            <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-[#181A1F] p-6 space-y-4 h-fit">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
                  <GitBranch className="h-4 w-4 text-blue-500" />
                  Jira Connection
                </h2>
                {status?.configured && (
                  <span className="rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300 px-2 py-0.5 text-[10px] font-semibold">
                    Configured
                  </span>
                )}
              </div>

              <form onSubmit={handleSaveConfig} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-1">
                    Jira Base URL
                  </label>
                  <input
                    type="url"
                    required
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    placeholder="https://your-domain.atlassian.net"
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-900 dark:border-zinc-800 dark:bg-[#111215] px-3 py-2 text-xs dark:text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-1">
                    Atlassian Email
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-900 dark:border-zinc-800 dark:bg-[#111215] px-3 py-2 text-xs dark:text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-1">
                    API Token
                  </label>
                  <input
                    type="password"
                    required
                    value={apiToken}
                    onChange={(e) => setApiToken(e.target.value)}
                    placeholder="Atlassian API token"
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-900 dark:border-zinc-800 dark:bg-[#111215] px-3 py-2 text-xs dark:text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={savingConfig}
                    className="flex-1 rounded-xl bg-blue-600 hover:bg-blue-500 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
                  >
                    {savingConfig ? 'Saving...' : 'Save Config'}
                  </button>
                  <button
                    type="button"
                    disabled={testing || !status?.configured}
                    onClick={() => void handleTestConnection()}
                    className="rounded-xl border border-zinc-200 dark:border-zinc-700 px-3 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50"
                  >
                    {testing ? 'Testing...' : 'Test'}
                  </button>
                </div>
              </form>

              {projects.length > 0 && (
                <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                    Jira Projects ({projects.length})
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {projects.map((p) => (
                      <span
                        key={p.id}
                        className="rounded-md bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-[11px] font-mono text-zinc-700 dark:text-zinc-300"
                      >
                        {p.key} — {p.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Linked Issues & Search */}
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-[#181A1F] p-6 space-y-4">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
                Search Jira Issues
              </h2>
              <form onSubmit={handleSearchJira} className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -tranzinc-y-1/2 h-4 w-4 text-zinc-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by Jira key (e.g. PROJ-245) or summary..."
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-900 dark:border-zinc-800 dark:bg-[#111215] pl-9 pr-3 py-2 text-xs dark:text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={searching}
                  className="rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 px-4 py-2 text-xs font-semibold"
                >
                  {searching ? 'Searching...' : 'Search'}
                </button>
              </form>

              {searchResults.length > 0 && (
                <div className="divide-y divide-zinc-200 dark:divide-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-xl">
                  {searchResults.map((r) => (
                    <div key={r.jiraKey} className="p-3 flex items-center justify-between gap-3 text-xs">
                      <div className="min-w-0">
                        <span className="font-mono font-semibold text-blue-500">{r.jiraKey}</span>
                        <span className="ml-2 text-zinc-800 dark:text-zinc-200">{r.summary}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="rounded bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-[10px]">
                          {r.statusName}
                        </span>
                        <a
                          href={r.issueUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-500 hover:underline inline-flex items-center gap-1"
                        >
                          Open <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-[#181A1F] overflow-hidden">
              <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800">
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
                  Linked Jira Issues ({linkedIssues.length})
                </h2>
              </div>
              <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {linkedIssues.length === 0 ? (
                  <p className="p-6 text-center text-xs text-zinc-400">
                    No Jira issues linked to tickets yet. Link or create one from any ticket details page.
                  </p>
                ) : (
                  linkedIssues.map((issue) => (
                    <div key={issue.id} className="p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <a
                            href={issue.issueUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="font-mono font-bold text-blue-500 hover:underline inline-flex items-center gap-1"
                          >
                            {issue.jiraKey}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                          <span className="rounded bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-[10px]">
                            {issue.statusName}
                          </span>
                          <span
                            className={`rounded px-2 py-0.5 text-[10px] font-semibold ${
                              issue.syncStatus === 'SYNCED'
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                                : 'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300'
                            }`}
                          >
                            {issue.syncStatus}
                          </span>
                        </div>
                        <p className="text-zinc-700 dark:text-zinc-300">{issue.summary}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {issue.tickets.map((t) => (
                            <Link
                              key={t.id}
                              to={`/tickets/${t.id}`}
                              className="font-mono text-[10px] text-blue-500 hover:underline"
                            >
                              {t.ticketNumber}
                            </Link>
                          ))}
                        </div>
                      </div>

                      {canManage && (
                        <button
                          type="button"
                          onClick={() => void handleSyncIssue(issue.id)}
                          className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 dark:border-zinc-700 px-2.5 py-1.5 text-xs font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800"
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                          Sync
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
