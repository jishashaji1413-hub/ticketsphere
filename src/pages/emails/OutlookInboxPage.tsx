import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  ExternalLink,
  Forward,
  Inbox,
  Loader2,
  Mail,
  Paperclip,
  RefreshCw,
  Ticket as TicketIcon,
  X,
} from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { getApiErrorMessage, useToast } from '../../context/ToastContext';
import { ALL_PRIORITIES, PRIORITY_LABELS } from '../../components/tickets/TicketBadges';
import type { ModuleOption, TicketPriority } from '../../types/ticket';

interface EmailMessageItem {
  id: string;
  conversationId: string;
  graphMessageId: string;
  fromEmail: string;
  fromName: string | null;
  toRecipients: Array<{ name?: string; address?: string }>;
  subject: string;
  bodyPreview: string | null;
  bodyHtml: string | null;
  hasAttachments: boolean;
  attachmentsMeta: Array<{ id: string; name: string; contentType: string; size: number }> | null;
  receivedAt: string | null;
  isRead: boolean;
  conversation: {
    id: string;
    ticket: { id: string; ticketNumber: string; title: string; status: string } | null;
  };
}

interface OutlookStatus {
  microsoftConfigured: boolean;
  connected: boolean;
  expiresAt: string | null;
}

export default function OutlookInboxPage() {
  const { hasPermission } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const canConvert = hasPermission('emails.convert') && hasPermission('tickets.create');
  const canSend = hasPermission('emails.send');

  const [status, setStatus] = useState<OutlookStatus | null>(null);
  const [messages, setMessages] = useState<EmailMessageItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(searchParams.get('error'));
  const [didAutoSync, setDidAutoSync] = useState(false);

  // Convert Modal State
  const [convertModalOpen, setConvertModalOpen] = useState(false);
  const [modules, setModules] = useState<ModuleOption[]>([]);
  const [convTitle, setConvTitle] = useState('');
  const [convPriority, setConvPriority] = useState<TicketPriority>('MEDIUM');
  const [convProject, setConvProject] = useState('');
  const [convModuleId, setConvModuleId] = useState('');
  const [convSubmoduleId, setConvSubmoduleId] = useState('');
  const [converting, setConverting] = useState(false);

  const [forwardOpen, setForwardOpen] = useState(false);
  const [forwardTo, setForwardTo] = useState('');
  const [forwardComment, setForwardComment] = useState('');
  const [forwarding, setForwarding] = useState(false);

  const loadInbox = useCallback(async () => {
    setLoading(true);
    try {
      const [statusRes, inboxRes] = await Promise.all([
        api.get<{ success: boolean; data: OutlookStatus }>('/emails/status'),
        api.get<{ success: boolean; data: EmailMessageItem[] }>('/emails/inbox'),
      ]);
      setStatus(statusRes.data.data);
      setMessages(inboxRes.data.data);
      if (inboxRes.data.data.length > 0 && !selectedId) {
        setSelectedId(inboxRes.data.data[0].id);
      }
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to load Outlook inbox'
      );
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  useEffect(() => {
    void loadInbox();
  }, [loadInbox]);

  const handleConnectOutlook = async () => {
    setError(null);
    try {
      const res = await api.get<{ success: boolean; data: { url: string } }>(
        '/auth/microsoft/connect-url'
      );
      window.location.href = res.data.data.url;
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Microsoft Entra ID is not configured in backend/.env'
      );
    }
  };

  const handleSync = useCallback(async () => {
    setError(null);
    setSyncNotice(null);
    setSyncing(true);
    try {
      const syncRes = await api.post<{ success: boolean; data: { syncedCount: number } }>(
        '/emails/sync'
      );
      await loadInbox();
      if (syncRes.data.data.syncedCount === 0) {
        setSyncNotice(
          'Connected to Outlook, but 0 emails were found in your Inbox folder. Check outlook.live.com to ensure the test email arrived in Inbox (not Junk).'
        );
      } else {
        setSyncNotice(`Synced ${syncRes.data.data.syncedCount} email(s) from Outlook.`);
      }
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Outlook sync failed'
      );
    } finally {
      setSyncing(false);
    }
  }, [loadInbox]);

  useEffect(() => {
    if (status?.connected && !loading && messages.length === 0 && !didAutoSync) {
      setDidAutoSync(true);
      void handleSync();
    }
  }, [status, loading, messages.length, didAutoSync, handleSync]);

  const openConvertModal = async (msg: EmailMessageItem) => {
    setConvTitle(msg.subject);
    setConvPriority('MEDIUM');
    setConvProject('');
    setConvModuleId('');
    setConvSubmoduleId('');
    setConvertModalOpen(true);
    try {
      const res = await api.get<{ success: boolean; data: ModuleOption[] }>('/modules/options');
      setModules(res.data.data);
    } catch {
      // ignore
    }
  };

  const handleConvertSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedMessage) return;
    setConverting(true);
    setError(null);
    try {
      const res = await api.post<{ success: boolean; data: { id: string } }>(
        `/emails/${selectedMessage.id}/convert`,
        {
          title: convTitle,
          priority: convPriority,
          moduleId: convModuleId || null,
          submoduleId: convSubmoduleId || null,
        }
      );
      setConvertModalOpen(false);
      navigate(`/tickets/${res.data.data.id}`);
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to convert email to ticket'
      );
    } finally {
      setConverting(false);
    }
  };

  const handleForwardSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedMessage || !forwardTo.trim()) return;
    setForwarding(true);
    try {
      await api.post(`/emails/${selectedMessage.id}/forward`, {
        to: forwardTo.trim(),
        comment: forwardComment.trim() || undefined,
      });
      setForwardOpen(false);
      setForwardTo('');
      setForwardComment('');
      toast.success(`Email forwarded to ${forwardTo.trim()}.`);
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to forward email'));
    } finally {
      setForwarding(false);
    }
  };

  const selectedMessage = messages.find((m) => m.id === selectedId) ?? null;
  const projectOptions = Array.from(
    new Set(modules.map((m) => m.projectName).filter((p): p is string => Boolean(p)))
  );
  const filteredModules = convProject
    ? modules.filter((m) => m.projectName === convProject)
    : modules;
  const submodules = filteredModules.find((m) => m.id === convModuleId)?.submodules ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-200/80 dark:border-zinc-800/80 pb-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            Email Management
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white mt-1">
            Outlook Inbox (Microsoft Graph)
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Sync incoming Outlook messages and convert selected emails into tracked tickets.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            disabled={syncing}
            onClick={() => {
              if (!status?.connected) {
                setError('Please click "Connect Microsoft Outlook" first to link your mailbox.');
                return;
              }
              void handleSync();
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-sky-600 px-4 py-2 text-xs font-semibold text-white hover:from-blue-500 hover:to-sky-500 disabled:opacity-60 transition"
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing Inbox...' : 'Sync Outlook Inbox'}
          </button>
          <button
            type="button"
            onClick={() => void handleConnectOutlook()}
            className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-[#181A1F] dark:text-zinc-200 dark:hover:bg-zinc-800 px-3.5 py-2 text-xs font-semibold transition"
          >
            <Mail className="h-4 w-4" />
            {status?.connected ? 'Switch Outlook' : 'Connect Microsoft Outlook'}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 p-3.5 text-xs dark:text-rose-300 flex items-start gap-2.5">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {syncNotice && !error && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-500/30 dark:bg-blue-500/10 p-3.5 text-xs dark:text-blue-200">
          {syncNotice}
        </div>
      )}

      {!status?.microsoftConfigured && !loading && (
        <div className="rounded-lg border border-amber-200 bg-amber-50/70 dark:border-amber-500/30 dark:bg-amber-500/10 p-4 text-xs text-amber-900 dark:text-amber-200">
          <p className="font-semibold">Microsoft Entra ID Setup Required</p>
          <p className="mt-1 opacity-90">
            To sync a personal <code className="font-mono">@outlook.com</code> or corporate mailbox,
            add <code className="font-mono">AZURE_TENANT_ID</code> (use{' '}
            <code className="font-mono">common</code> for personal Outlook accounts),{' '}
            <code className="font-mono">AZURE_CLIENT_ID</code>, and{' '}
            <code className="font-mono">AZURE_CLIENT_SECRET</code> in{' '}
            <code className="font-mono">backend/.env</code>.
          </p>
        </div>
      )}

      {loading ? (
        <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-[#181A1F] p-12 text-center text-zinc-400">
          <Loader2 className="h-5 w-5 animate-spin inline mr-2 text-blue-500" />
          Loading Outlook inbox...
        </div>
      ) : messages.length === 0 ? (
        <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-[#181A1F] p-12 text-center space-y-2">
          <Inbox className="h-8 w-8 text-zinc-400 mx-auto" />
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
            No synced emails yet
          </p>
          <p className="text-xs text-zinc-400">
            Connect your Microsoft Outlook account and click <strong>Sync Outlook Inbox</strong>.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Email List */}
          <div className="lg:col-span-5 rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-[#181A1F] divide-y divide-zinc-200 dark:divide-zinc-800 max-h-[640px] overflow-y-auto">
            {messages.map((m) => {
              const active = m.id === selectedId;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSelectedId(m.id)}
                  className={`w-full text-left p-4 transition ${active
                      ? 'bg-blue-50/80 dark:bg-blue-500/10'
                      : 'hover:bg-zinc-50 dark:hover:bg-white/[0.02]'
                    }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-zinc-900 dark:text-white truncate">
                      {m.fromName || m.fromEmail}
                    </span>
                    <span className="text-[11px] text-zinc-400 shrink-0 tabular-nums">
                      {m.receivedAt
                        ? new Date(m.receivedAt).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                        : ''}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-zinc-800 dark:text-zinc-200 truncate mt-1">
                    {m.subject}
                  </p>
                  <p className="text-[11px] text-zinc-400 line-clamp-1 mt-0.5">{m.bodyPreview}</p>
                  <div className="flex items-center gap-2 mt-2">
                    {m.conversation.ticket && (
                      <span className="inline-flex items-center gap-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/25 px-1.5 py-0.5 text-[10px] font-mono">
                        <TicketIcon className="h-2.5 w-2.5" />
                        {m.conversation.ticket.ticketNumber}
                      </span>
                    )}
                    {m.hasAttachments && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-zinc-400">
                        <Paperclip className="h-3 w-3" />
                        Attachment
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Email Reader */}
          <div className="lg:col-span-7 rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-[#181A1F] p-6">
            {selectedMessage ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-4">
                  <div className="space-y-1">
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
                      {selectedMessage.subject}
                    </h2>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      From:{' '}
                      <span className="font-medium text-zinc-700 dark:text-zinc-200">
                        {selectedMessage.fromName
                          ? `${selectedMessage.fromName} <${selectedMessage.fromEmail}>`
                          : selectedMessage.fromEmail}
                      </span>
                    </p>
                    <p className="text-[11px] text-zinc-400">
                      Received:{' '}
                      {selectedMessage.receivedAt
                        ? new Date(selectedMessage.receivedAt).toLocaleString()
                        : '—'}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {canSend && (
                      <button
                        type="button"
                        onClick={() => {
                          setForwardTo('');
                          setForwardComment('');
                          setForwardOpen(true);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-[#111215] dark:text-zinc-200 dark:hover:bg-zinc-800 px-3 py-1.5 text-xs font-semibold transition"
                      >
                        <Forward className="h-3.5 w-3.5" />
                        Forward
                      </button>
                    )}

                    {selectedMessage.conversation.ticket ? (
                      <Link
                        to={`/tickets/${selectedMessage.conversation.ticket.id}`}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30 px-3 py-1.5 text-xs font-semibold"
                      >
                        View {selectedMessage.conversation.ticket.ticketNumber}
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    ) : (
                      canConvert && (
                        <button
                          type="button"
                          onClick={() => void openConvertModal(selectedMessage)}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition"
                        >
                          <TicketIcon className="h-3.5 w-3.5" />
                          Create Ticket
                        </button>
                      )
                    )}
                  </div>
                </div>

                {selectedMessage.attachmentsMeta && selectedMessage.attachmentsMeta.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedMessage.attachmentsMeta.map((a) => (
                      <span
                        key={a.id}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-[#111215] px-2.5 py-1 text-xs text-zinc-600 dark:text-zinc-300"
                      >
                        <Paperclip className="h-3 w-3 text-blue-500" />
                        {a.name} ({Math.round(a.size / 1024)} KB)
                      </span>
                    ))}
                  </div>
                )}

                <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 dark:border-zinc-800 dark:bg-[#111215] p-4 text-sm text-zinc-700 dark:text-zinc-200 max-h-[420px] overflow-y-auto">
                  {selectedMessage.bodyHtml ? (
                    <div
                      className="prose prose-sm dark:prose-invert max-w-none"
                      dangerouslySetInnerHTML={{ __html: selectedMessage.bodyHtml }}
                    />
                  ) : (
                    <p className="whitespace-pre-wrap">{selectedMessage.bodyPreview}</p>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-zinc-400">Select an email to read.</p>
            )}
          </div>
        </div>
      )}

      {convertModalOpen && selectedMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/75 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-lg bg-white border border-zinc-200 dark:bg-[#181A1F] dark:border-zinc-800 shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
                Convert Email to Ticket
              </h2>
              <button
                type="button"
                onClick={() => setConvertModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-700 dark:hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleConvertSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1">
                  Ticket Title
                </label>
                <input
                  type="text"
                  required
                  value={convTitle}
                  onChange={(e) => setConvTitle(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-900 dark:border-zinc-800 dark:bg-[#111215] px-3 py-2 text-sm dark:text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1">
                    Project
                  </label>
                  <select
                    value={convProject}
                    onChange={(e) => {
                      setConvProject(e.target.value);
                      setConvModuleId('');
                      setConvSubmoduleId('');
                    }}
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-900 dark:border-zinc-800 dark:bg-[#111215] px-3 py-2 text-sm dark:text-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">All Projects</option>
                    {projectOptions.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1">
                    Priority
                  </label>
                  <select
                    value={convPriority}
                    onChange={(e) => setConvPriority(e.target.value as TicketPriority)}
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-900 dark:border-zinc-800 dark:bg-[#111215] px-3 py-2 text-sm dark:text-white focus:border-blue-500 focus:outline-none"
                  >
                    {ALL_PRIORITIES.map((p) => (
                      <option key={p} value={p}>
                        {PRIORITY_LABELS[p]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1">
                    Module
                  </label>
                  <select
                    value={convModuleId}
                    onChange={(e) => {
                      setConvModuleId(e.target.value);
                      setConvSubmoduleId('');
                    }}
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-900 dark:border-zinc-800 dark:bg-[#111215] px-3 py-2 text-sm dark:text-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">Optional</option>
                    {filteredModules.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1">
                    Submodule
                  </label>
                  <select
                    value={convSubmoduleId}
                    disabled={!convModuleId || submodules.length === 0}
                    onChange={(e) => setConvSubmoduleId(e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-900 disabled:opacity-50 dark:border-zinc-800 dark:bg-[#111215] px-3 py-2 text-sm dark:text-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">Optional</option>
                    {submodules.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setConvertModalOpen(false)}
                  className="rounded-xl border border-zinc-200 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 px-4 py-2 text-sm font-medium dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={converting}
                  className="rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 inline-flex items-center gap-2"
                >
                  {converting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Create Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {forwardOpen && selectedMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/75 backdrop-blur-xs p-4">
          <div className="animate-fade-in w-full max-w-lg rounded-2xl bg-white border border-zinc-200 dark:bg-[#141821] dark:border-zinc-800 shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
                <Forward className="h-4 w-4 text-blue-500" />
                Forward Email
              </h2>
              <button
                type="button"
                onClick={() => setForwardOpen(false)}
                className="text-zinc-400 hover:text-zinc-700 dark:hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3 truncate">
              Subject: <span className="font-medium text-zinc-700 dark:text-zinc-200">{selectedMessage.subject}</span>
            </p>

            <form onSubmit={handleForwardSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1">
                  To (comma-separated for multiple)
                </label>
                <input
                  type="text"
                  required
                  value={forwardTo}
                  onChange={(e) => setForwardTo(e.target.value)}
                  placeholder="colleague@company.com, team@company.com"
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-900 focus:bg-white dark:focus:bg-[#111215] dark:border-zinc-800 dark:bg-[#111215] px-3 py-2 text-sm dark:text-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1">
                  Note / Comment (optional)
                </label>
                <textarea
                  rows={4}
                  value={forwardComment}
                  onChange={(e) => setForwardComment(e.target.value)}
                  placeholder="Add an optional note above the forwarded message..."
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-900 focus:bg-white dark:focus:bg-[#111215] dark:border-zinc-800 dark:bg-[#111215] px-3 py-2 text-sm dark:text-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setForwardOpen(false)}
                  className="rounded-xl border border-zinc-200 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 px-4 py-2 text-sm font-medium dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={forwarding}
                  className="rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 inline-flex items-center gap-2"
                >
                  {forwarding && <Loader2 className="h-4 w-4 animate-spin" />}
                  Send Forward
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
