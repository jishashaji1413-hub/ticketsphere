import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useLocation } from 'react-router-dom';
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
  const location = useLocation();
  const canManage = hasPermission('jira.manage');

  const section: 'issues' | 'projects' | 'sync' = location.pathname.endsWith('/projects')
    ? 'projects'
    : location.pathname.endsWith('/sync')
      ? 'sync'
      : 'issues';

  const sectionMeta = {
    issues: {
      title: 'Linked & Jira Issues',
      subtitle: 'Browse Jira issues by space, search live issues, and manage issues linked to TicketSphere tickets.',
    },
    projects: {
      title: 'Jira Projects & Spaces',
      subtitle: 'View your connected Jira Cloud projects/spaces and inspect issues per space.',
    },
    sync: {
      title: 'Jira Synchronization & Connection',
      subtitle: 'Configure Jira Cloud REST API credentials, test connectivity, and sync linked issues.',
    },
  }[section];

  const [status, setStatus] = useState<JiraStatus | null>(null);
  const [linkedIssues, setLinkedIssues] = useState<LinkedJiraIssue[]>([]);
  const [projects, setProjects] = useState<
    Array<{ id: string; key: string; name: string; projectTypeKey?: string }>
  >([]);
  const [loading, setLoading] = useState(true);

  const [baseUrl, setBaseUrl] = useState('');
  const [email, setEmail] = useState('');
  const [apiToken, setApiToken] = useState('');
  const [savingConfig, setSavingConfig] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProjectKey, setSelectedProjectKey] = useState('');
  const [searchResults, setSearchResults] = useState<
    Array<{ jiraKey: string; projectKey?: string; summary: string; statusName: string; issueUrl: string }>
  >([]);
  const [searching, setSearching] = useState(false);
  const [editingIssueId, setEditingIssueId] = useState<string | null>(null);
  const [transitions, setTransitions] = useState<
    Array<{ id: string; name: string; toStatus: string }>
  >([]);
  const [editSummary, setEditSummary] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editTransitionId, setEditTransitionId] = useState('');
  const [savingIssue, setSavingIssue] = useState(false);

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
          const [projRes, issuesRes] = await Promise.all([
            api.get<{
              success: boolean;
              data: Array<{ id: string; key: string; name: string }>;
            }>('/jira/projects'),
            api.get<{
              success: boolean;
              data: Array<{ jiraKey: string; summary: string; statusName: string; issueUrl: string }>;
            }>('/jira/search', { params: { q: '' } }),
          ]);
          setProjects(projRes.data.data);
          setSearchResults(issuesRes.data.data);
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

  const runJiraSearch = async (query: string, projectKey: string) => {
    setSearching(true);
    setError(null);
    try {
      const res = await api.get<{
        success: boolean;
        data: Array<{
          jiraKey: string;
          projectKey?: string;
          summary: string;
          statusName: string;
          issueUrl: string;
        }>;
      }>('/jira/search', {
        params: {
          q: query,
          projectKey: projectKey || undefined,
        },
      });
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

  const handleSearchJira = async (e: FormEvent) => {
    e.preventDefault();
    await runJiraSearch(searchQuery, selectedProjectKey);
  };

  const handleSelectProject = async (projectKey: string) => {
    setSelectedProjectKey(projectKey);
    await runJiraSearch(searchQuery, projectKey);
  };

  const handleSyncIssue = async (id: string) => {
    await api.post(`/jira/issues/${id}/sync`);
    await loadData();
  };

  const handleStartEditIssue = async (issue: LinkedJiraIssue) => {
    if (editingIssueId === issue.id) {
      setEditingIssueId(null);
      return;
    }
    setError(null);
    setMessage(null);
    setEditingIssueId(issue.id);
    setEditSummary(issue.summary);
    setEditDescription('');
    setEditTransitionId('');
    try {
      const res = await api.get<{
        success: boolean;
        data: Array<{ id: string; name: string; toStatus: string }>;
      }>(`/jira/issues/${issue.id}/transitions`);
      setTransitions(res.data.data);
    } catch {
      setTransitions([]);
    }
  };

  const handleSaveIssueUpdate = async (issueId: string) => {
    setSavingIssue(true);
    setError(null);
    setMessage(null);
    try {
      await api.patch(`/jira/issues/${issueId}`, {
        summary: editSummary.trim() || undefined,
        description: editDescription.trim() ? editDescription : undefined,
        transitionId: editTransitionId || undefined,
      });
      setEditingIssueId(null);
      setMessage('Jira issue updated directly from TicketSphere.');
      await loadData();
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Failed to update Jira issue'
      );
    } finally {
      setSavingIssue(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-zinc-200/80 dark:border-zinc-800/80 pb-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
          Jira Integration
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white mt-1">
          {sectionMeta.title}
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          {sectionMeta.subtitle}
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
        <div className={section === 'sync' ? 'grid grid-cols-1 lg:grid-cols-3 gap-6' : 'space-y-6'}>
          {/* Connection Config (shown on Synchronization tab) */}
          {section === 'sync' && canManage && (
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
                    {projects.map((p) => {
                      const active = selectedProjectKey === p.key;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => void handleSelectProject(active ? '' : p.key)}
                          className={`rounded-md px-2 py-0.5 text-[11px] font-mono transition ${
                            active
                              ? 'bg-blue-600 text-white'
                              : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
                          }`}
                        >
                          {p.key} — {p.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Projects Grid (shown on Jira Projects tab) */}
          {section === 'projects' && (
            <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-[#181A1F] p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
                  Connected Jira Spaces ({projects.length})
                </h2>
                {selectedProjectKey && (
                  <button
                    type="button"
                    onClick={() => void handleSelectProject('')}
                    className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
                  >
                    Show all spaces
                  </button>
                )}
              </div>
              {projects.length === 0 ? (
                <p className="text-xs text-zinc-400">
                  No Jira projects found. Verify your Jira connection under Synchronization.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {projects.map((p) => {
                    const active = selectedProjectKey === p.key;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => void handleSelectProject(active ? '' : p.key)}
                        className={`text-left rounded-xl border p-4 transition ${
                          active
                            ? 'border-blue-500 bg-blue-50/60 dark:border-blue-500/60 dark:bg-blue-500/10'
                            : 'border-zinc-200 bg-zinc-50/50 hover:border-zinc-300 dark:border-zinc-800 dark:bg-[#111215] dark:hover:border-zinc-700'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                            {p.key}
                          </span>
                          {p.projectTypeKey && (
                            <span className="rounded bg-zinc-200/70 dark:bg-zinc-800 px-2 py-0.5 text-[10px] uppercase text-zinc-600 dark:text-zinc-400">
                              {p.projectTypeKey}
                            </span>
                          )}
                        </div>
                        <p className="mt-1.5 text-sm font-semibold text-zinc-900 dark:text-white truncate">
                          {p.name}
                        </p>
                        <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                          {active ? 'Filtering issues below (click to clear)' : 'Click to filter issues'}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Linked Issues & Search */}
          <div className={section === 'sync' ? 'lg:col-span-2 space-y-6' : 'space-y-6'}>
            {section !== 'sync' && (
              <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-[#181A1F] p-6 space-y-4">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
                Jira Issues ({searchResults.length})
              </h2>
              <form onSubmit={handleSearchJira} className="flex flex-col sm:flex-row gap-2">
                {projects.length > 0 && (
                  <select
                    value={selectedProjectKey}
                    onChange={(e) => void handleSelectProject(e.target.value)}
                    className="rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-900 dark:border-zinc-800 dark:bg-[#111215] px-3 py-2 text-xs dark:text-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">All Spaces ({projects.length})</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.key}>
                        {p.key} — {p.name}
                      </option>
                    ))}
                  </select>
                )}
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
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
                      <div className="min-w-0 flex items-center gap-2 flex-wrap">
                        {r.projectKey && (
                          <span className="rounded bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300 px-1.5 py-0.5 text-[10px] font-mono font-semibold">
                            {r.projectKey}
                          </span>
                        )}
                        <span className="font-mono font-semibold text-blue-500">{r.jiraKey}</span>
                        <span className="text-zinc-800 dark:text-zinc-200">{r.summary}</span>
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
            )}

            {section !== 'projects' && (
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
                    <div key={issue.id} className="p-4 space-y-3 text-xs">
                      <div className="flex flex-wrap items-center justify-between gap-3">
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
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => void handleStartEditIssue(issue)}
                              className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300 px-2.5 py-1.5 text-xs font-medium hover:bg-blue-100 dark:hover:bg-blue-500/20"
                            >
                              {editingIssueId === issue.id ? 'Close' : 'Update in Jira'}
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleSyncIssue(issue.id)}
                              className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 dark:border-zinc-700 px-2.5 py-1.5 text-xs font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800"
                            >
                              <RefreshCw className="h-3.5 w-3.5" />
                              Sync
                            </button>
                          </div>
                        )}
                      </div>

                      {canManage && editingIssueId === issue.id && (
                        <div className="rounded-lg border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-[#111215] p-3 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                          <div>
                            <label className="block text-[10px] font-semibold uppercase text-zinc-400 mb-1">
                              Status
                            </label>
                            <select
                              value={editTransitionId}
                              onChange={(e) => setEditTransitionId(e.target.value)}
                              className="w-full rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-[#181A1F] px-2.5 py-1.5 text-xs dark:text-white"
                            >
                              <option value="">Keep ({issue.statusName})</option>
                              {transitions.map((tr) => (
                                <option key={tr.id} value={tr.id}>
                                  {tr.toStatus}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="sm:col-span-2">
                            <label className="block text-[10px] font-semibold uppercase text-zinc-400 mb-1">
                              Summary
                            </label>
                            <input
                              type="text"
                              value={editSummary}
                              onChange={(e) => setEditSummary(e.target.value)}
                              className="w-full rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-[#181A1F] px-2.5 py-1.5 text-xs dark:text-white"
                            />
                          </div>
                          <div className="sm:col-span-3">
                            <label className="block text-[10px] font-semibold uppercase text-zinc-400 mb-1">
                              Description (optional)
                            </label>
                            <textarea
                              rows={2}
                              value={editDescription}
                              onChange={(e) => setEditDescription(e.target.value)}
                              placeholder="Leave blank to keep existing description"
                              className="w-full rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-[#181A1F] px-2.5 py-1.5 text-xs dark:text-white"
                            />
                          </div>
                          <div className="sm:col-span-3 flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setEditingIssueId(null)}
                              className="rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 py-1 text-xs font-medium text-zinc-600 dark:text-zinc-300"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              disabled={savingIssue}
                              onClick={() => void handleSaveIssueUpdate(issue.id)}
                              className="rounded-lg bg-blue-600 hover:bg-blue-500 px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
                            >
                              {savingIssue ? 'Saving...' : 'Save to Jira'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
