import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  CheckCircle2,
  GitBranch,
  Hash,
  Layers,
  Loader2,
  Mail,
  ShieldCheck,
  Ticket as TicketIcon,
  Trash2,
  Users,
} from 'lucide-react';
import { api } from '../../lib/api';
import { getApiErrorMessage, useToast } from '../../context/ToastContext';

interface SettingsData {
  ticketNumbering: {
    lastNumber: number;
    nextTicketNumber: string;
  };
  counts: {
    activeUsers: number;
    rolesCount: number;
    modulesCount: number;
    submodulesCount: number;
    activeTickets: number;
    deletedTickets: number;
    templatesCount: number;
    emailConversationsCount: number;
    jiraIssuesCount: number;
  };
  integrations: {
    jira: {
      configured: boolean;
      baseUrl: string | null;
      email: string | null;
      lastSyncAt: string | null;
      lastError: string | null;
    };
    outlook: {
      microsoftConfigured: boolean;
      sharedConnected: boolean;
      sharedOwner: { displayName: string; email: string } | null;
      expiresAt: string | null;
    };
  };
  recentAuditLogs: Array<{
    id: string;
    action: string;
    entityType: string;
    entityId: string | null;
    createdAt: string;
    actor: { displayName: string; email: string } | null;
  }>;
}

export default function SettingsPage() {
  const toast = useToast();
  const [data, setData] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [counterInput, setCounterInput] = useState('0');
  const [savingCounter, setSavingCounter] = useState(false);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ success: boolean; data: SettingsData }>('/settings');
      setData(res.data.data);
      setCounterInput(String(res.data.data.ticketNumbering.lastNumber));
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to load system settings'));
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const handleSaveCounter = async (e: FormEvent) => {
    e.preventDefault();
    setSavingCounter(true);
    try {
      const res = await api.patch<{
        success: boolean;
        data: { lastNumber: number; nextTicketNumber: string };
      }>('/settings/ticket-counter', { lastNumber: Number(counterInput) });
      toast.success(`Ticket counter updated. Next ticket will be ${res.data.data.nextTicketNumber}.`);
      await loadSettings();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to update ticket counter'));
    } finally {
      setSavingCounter(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-zinc-200/90 bg-white dark:border-zinc-800/90 dark:bg-[#141821] p-12 text-center text-zinc-400">
        <Loader2 className="h-5 w-5 animate-spin inline mr-2 text-blue-500" />
        Loading system settings...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-zinc-200/80 dark:border-zinc-800/80 pb-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
          Administration
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white mt-1">
          System Settings &amp; Governance
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Manage ticket numbering, monitor Outlook &amp; Jira integrations, and review system audit logs.
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          to="/admin/users"
          className="ts-card-hover rounded-xl border border-zinc-200/90 bg-white dark:border-zinc-800/90 dark:bg-[#141821] p-5 shadow-2xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
              Active Users
            </span>
            <Users className="h-4 w-4 text-blue-500" />
          </div>
          <p className="mt-2 text-2xl font-bold font-mono text-zinc-900 dark:text-white">
            {data?.counts.activeUsers ?? 0}
          </p>
          <p className="mt-1 text-xs text-zinc-500">{data?.counts.rolesCount ?? 0} roles configured</p>
        </Link>

        <Link
          to="/tickets"
          className="ts-card-hover rounded-xl border border-zinc-200/90 bg-white dark:border-zinc-800/90 dark:bg-[#141821] p-5 shadow-2xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
              Active Tickets
            </span>
            <TicketIcon className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="mt-2 text-2xl font-bold font-mono text-zinc-900 dark:text-white">
            {data?.counts.activeTickets ?? 0}
          </p>
          <p className="mt-1 text-xs text-zinc-500 flex items-center gap-1">
            <Trash2 className="h-3 w-3 text-rose-400" />
            {data?.counts.deletedTickets ?? 0} soft-deleted
          </p>
        </Link>

        <Link
          to="/admin/modules"
          className="ts-card-hover rounded-xl border border-zinc-200/90 bg-white dark:border-zinc-800/90 dark:bg-[#141821] p-5 shadow-2xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
              Modules
            </span>
            <Layers className="h-4 w-4 text-violet-500" />
          </div>
          <p className="mt-2 text-2xl font-bold font-mono text-zinc-900 dark:text-white">
            {data?.counts.modulesCount ?? 0}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            {data?.counts.submodulesCount ?? 0} submodules active
          </p>
        </Link>

        <Link
          to="/emails/templates"
          className="ts-card-hover rounded-xl border border-zinc-200/90 bg-white dark:border-zinc-800/90 dark:bg-[#141821] p-5 shadow-2xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
              Email Templates
            </span>
            <Mail className="h-4 w-4 text-sky-500" />
          </div>
          <p className="mt-2 text-2xl font-bold font-mono text-zinc-900 dark:text-white">
            {data?.counts.templatesCount ?? 0}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            {data?.counts.emailConversationsCount ?? 0} synced threads
          </p>
        </Link>
      </div>

      {/* Config & Integration Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ticket Numbering */}
        <div className="ts-card-hover rounded-xl border border-zinc-200/90 bg-white dark:border-zinc-800/90 dark:bg-[#141821] p-6 space-y-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
              <Hash className="h-4 w-4 text-blue-500" />
              Ticket Numbering
            </h2>
            <span className="rounded-full bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300 px-2.5 py-0.5 text-[11px] font-mono font-semibold">
              Next: {data?.ticketNumbering.nextTicketNumber}
            </span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Tickets auto-increment with 3-digit padding starting at <span className="font-mono">TS-001</span>.
          </p>
          <form onSubmit={handleSaveCounter} className="space-y-3">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-1">
                Last Issued Number
              </label>
              <input
                type="number"
                min={0}
                required
                value={counterInput}
                onChange={(e) => setCounterInput(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-900 dark:border-zinc-800 dark:bg-[#111215] px-3 py-2 text-sm font-mono dark:text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={savingCounter}
              className="w-full rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
            >
              {savingCounter ? 'Saving...' : 'Update Counter'}
            </button>
          </form>
        </div>

        {/* Integrations Summary */}
        <div className="ts-card-hover rounded-xl border border-zinc-200/90 bg-white dark:border-zinc-800/90 dark:bg-[#141821] p-6 space-y-4 shadow-2xs">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-blue-500" />
            Connected Integrations
          </h2>

          <div className="space-y-3 text-xs">
            <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 p-3.5 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-zinc-900 dark:text-white">Jira Cloud</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    data?.integrations.jira.configured
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                      : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
                  }`}
                >
                  {data?.integrations.jira.configured ? 'Configured' : 'Not Configured'}
                </span>
              </div>
              <p className="text-zinc-500 truncate">
                {data?.integrations.jira.baseUrl || 'No Jira URL configured'}
              </p>
              <div className="flex items-center justify-between pt-1">
                <span className="text-zinc-400">{data?.counts.jiraIssuesCount ?? 0} linked issues</span>
                <Link to="/jira/sync" className="text-blue-600 dark:text-blue-400 hover:underline">
                  Manage →
                </Link>
              </div>
            </div>

            <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 p-3.5 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-zinc-900 dark:text-white">
                  Outlook Shared Mailbox
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    data?.integrations.outlook.sharedConnected
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                      : 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'
                  }`}
                >
                  {data?.integrations.outlook.sharedConnected ? 'Connected' : 'Not Connected'}
                </span>
              </div>
              <p className="text-zinc-500 truncate">
                {data?.integrations.outlook.sharedOwner
                  ? `${data.integrations.outlook.sharedOwner.displayName} (${data.integrations.outlook.sharedOwner.email})`
                  : 'Connect an Admin Outlook account to share support mail'}
              </p>
              <div className="flex justify-end pt-1">
                <Link to="/emails/inbox" className="text-blue-600 dark:text-blue-400 hover:underline">
                  Open Inbox →
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Active Governance Rules */}
        <div className="ts-card-hover rounded-xl border border-zinc-200/90 bg-white dark:border-zinc-800/90 dark:bg-[#141821] p-6 space-y-4 shadow-2xs">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            Active Workflow Rules
          </h2>
          <ul className="space-y-2.5 text-xs text-zinc-600 dark:text-zinc-300">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>Unassigned tickets cannot be marked as Completed.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>Assigned ticket status can only be edited by the Assignee or an Admin.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>Soft-deleted tickets are preserved with <code className="font-mono">isDeleted</code> and can be restored.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>Completed (<code className="font-mono">Done</code>) Jira issues are locked from reverting.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>Admin Outlook mailbox emails are shared with Support Agents &amp; Managers.</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Recent Audit Log */}
      <div className="rounded-xl border border-zinc-200/90 bg-white dark:border-zinc-800/90 dark:bg-[#141821] overflow-hidden shadow-2xs">
        <div className="px-5 py-4 border-b border-zinc-200/80 dark:border-zinc-800/80 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
            <Activity className="h-4 w-4 text-blue-500" />
            Recent System Audit Log
          </h2>
          <span className="text-xs text-zinc-400">Latest 15 events</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 dark:bg-[#16181D] text-zinc-500 uppercase tracking-wider border-b border-zinc-200 dark:border-zinc-800">
              <tr>
                <th className="px-5 py-3">Action</th>
                <th className="px-5 py-3">Entity</th>
                <th className="px-5 py-3">Actor</th>
                <th className="px-5 py-3">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200/80 dark:divide-zinc-800/80">
              {(data?.recentAuditLogs ?? []).length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-zinc-400">
                    No audit events recorded yet.
                  </td>
                </tr>
              ) : (
                data?.recentAuditLogs.map((log) => (
                  <tr key={log.id} className="ts-row-hover">
                    <td className="px-5 py-3 align-middle font-mono font-semibold text-blue-600 dark:text-blue-400">
                      {log.action}
                    </td>
                    <td className="px-5 py-3 align-middle text-zinc-700 dark:text-zinc-300">
                      {log.entityType}
                    </td>
                    <td className="px-5 py-3 align-middle text-zinc-600 dark:text-zinc-400">
                      {log.actor ? `${log.actor.displayName} (${log.actor.email})` : 'System'}
                    </td>
                    <td className="px-5 py-3 align-middle text-zinc-500 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
