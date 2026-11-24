import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Download,
  Edit2,
  ExternalLink,
  History,
  Loader2,
  Lock,
  Mail,
  MessageSquare,
  Paperclip,
  RotateCcw,
  Send,
  Trash2,
  User as UserIcon,
  X,
} from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { getApiErrorMessage, useToast } from '../../context/ToastContext';
import {
  ALL_PRIORITIES,
  ALL_STATUSES,
  PRIORITY_LABELS,
  PriorityBadge,
  STATUS_LABELS,
  StatusBadge,
} from '../../components/tickets/TicketBadges';
import type { TicketDetail, TicketPriority, TicketStatus } from '../../types/ticket';
import type { UserProfile } from '../../types/auth';

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, hasPermission } = useAuth();
  const toast = useToast();

  const canUpdate = hasPermission('tickets.update');
  const canAssign = hasPermission('tickets.assign');
  const canDelete = hasPermission('tickets.delete');
  const canInternalNote = hasPermission('tickets.internal_notes');
  const canSendEmail = hasPermission('emails.send');
  const canManageJira = hasPermission('jira.manage');

  const [jiraKeyInput, setJiraKeyInput] = useState('');
  const [linkingJira, setLinkingJira] = useState(false);
  const [jiraProjectKey, setJiraProjectKey] = useState('');
  const [creatingJira, setCreatingJira] = useState(false);
  const [jiraError, setJiraError] = useState<string | null>(null);
  const [editingJira, setEditingJira] = useState(false);
  const [jiraTransitions, setJiraTransitions] = useState<
    Array<{ id: string; name: string; toStatus: string }>
  >([]);
  const [jiraEditSummary, setJiraEditSummary] = useState('');
  const [jiraEditDescription, setJiraEditDescription] = useState('');
  const [jiraTransitionId, setJiraTransitionId] = useState('');
  const [savingJiraUpdate, setSavingJiraUpdate] = useState(false);

  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [emailThreads, setEmailThreads] = useState<
    Array<{
      id: string;
      subject: string;
      messages: Array<{
        id: string;
        direction: 'INBOUND' | 'OUTBOUND';
        fromEmail: string;
        fromName: string | null;
        bodyPreview: string | null;
        receivedAt: string | null;
        sentAt: string | null;
        createdAt: string;
      }>;
    }>
  >([]);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);
  const [emailTemplates, setEmailTemplates] = useState<
    Array<{ id: string; name: string; category: string; body: string }>
  >([]);

  const [editOpen, setEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const [commentText, setCommentText] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [postingComment, setPostingComment] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);

  const loadTicket = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [ticketRes, usersRes, emailsRes, templatesRes] = await Promise.all([
        api.get<{ success: boolean; data: TicketDetail }>(`/tickets/${id}`),
        canAssign
          ? api.get<{ success: boolean; data: UserProfile[] }>('/users', {
            params: { activeOnly: 'true' },
          })
          : Promise.resolve(null),
        api.get<{ success: boolean; data: typeof emailThreads }>(`/emails/ticket/${id}`).catch(() => null),
        canSendEmail
          ? api.get<{ success: boolean; data: typeof emailTemplates }>('/emails/templates').catch(() => null)
          : Promise.resolve(null),
      ]);
      setTicket(ticketRes.data.data);
      if (usersRes) setUsers(usersRes.data.data);
      if (emailsRes) setEmailThreads(emailsRes.data.data);
      if (templatesRes) setEmailTemplates(templatesRes.data.data);
    } finally {
      setLoading(false);
    }
  }, [id, canAssign, canSendEmail]);

  useEffect(() => {
    void loadTicket();
  }, [loadTicket]);

  const handleStatusChange = async (status: TicketStatus) => {
    if (!ticket) return;
    if (status === 'COMPLETED' && !ticket.assignee) {
      toast.error('Unassigned tickets cannot be marked as Completed. Please assign the ticket first.');
      return;
    }
    const isAdmin = user?.roles.some((r) => r.name === 'Admin');
    if (ticket.assignee && ticket.assignee.id !== user?.id && !isAdmin) {
      toast.error(
        `Only ${ticket.assignee.displayName} (the assigned user) or an Admin can change the status of this ticket.`
      );
      return;
    }
    try {
      const res = await api.patch<{ success: boolean; data: TicketDetail }>(`/tickets/${ticket.id}`, {
        status,
      });
      setTicket(res.data.data);
      toast.success(`Status updated to ${STATUS_LABELS[status]}.`);
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to update ticket status'));
    }
  };

  const handlePriorityChange = async (priority: TicketPriority) => {
    if (!ticket) return;
    try {
      const res = await api.patch<{ success: boolean; data: TicketDetail }>(`/tickets/${ticket.id}`, {
        priority,
      });
      setTicket(res.data.data);
      toast.success(`Priority updated to ${PRIORITY_LABELS[priority]}.`);
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to update ticket priority'));
    }
  };

  const handleAssigneeChange = async (assigneeId: string) => {
    if (!ticket) return;
    try {
      const res = await api.patch<{ success: boolean; data: TicketDetail }>(
        `/tickets/${ticket.id}/assign`,
        { assigneeId: assigneeId || null }
      );
      setTicket(res.data.data);
      toast.success(
        res.data.data.assignee
          ? `Assigned to ${res.data.data.assignee.displayName}.`
          : 'Ticket unassigned.'
      );
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to update assignee'));
    }
  };

  const handleDelete = async () => {
    if (!ticket || !window.confirm(`Delete ticket ${ticket.ticketNumber}?`)) return;
    await api.delete(`/tickets/${ticket.id}`);
    navigate('/tickets');
  };

  const handleAddComment = async (e: FormEvent) => {
    e.preventDefault();
    if (!ticket || !commentText.trim()) return;
    setPostingComment(true);
    try {
      await api.post(`/tickets/${ticket.id}/comments`, {
        content: commentText.trim(),
        isInternal: canInternalNote ? isInternal : false,
      });
      setCommentText('');
      setIsInternal(false);
      await loadTicket();
    } finally {
      setPostingComment(false);
    }
  };

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !ticket) return;
    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      await api.post(`/tickets/${ticket.id}/attachments`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await loadTicket();
    } finally {
      setUploadingFile(false);
      e.target.value = '';
    }
  };

  const handleSendOutlookReply = async (e: FormEvent) => {
    e.preventDefault();
    if (!ticket || !replyText.trim()) return;
    setSendingReply(true);
    setReplyError(null);
    try {
      await api.post(`/emails/ticket/${ticket.id}/reply`, { body: replyText.trim() });
      setReplyText('');
      await loadTicket();
    } catch (err: unknown) {
      setReplyError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to send Outlook reply'
      );
    } finally {
      setSendingReply(false);
    }
  };

  const handleLinkJira = async (e: FormEvent) => {
    e.preventDefault();
    if (!ticket || !jiraKeyInput.trim()) return;
    setLinkingJira(true);
    setJiraError(null);
    try {
      await api.post(`/jira/tickets/${ticket.id}/link`, { jiraKey: jiraKeyInput.trim() });
      setJiraKeyInput('');
      await loadTicket();
    } catch (err: unknown) {
      setJiraError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to link Jira issue'
      );
    } finally {
      setLinkingJira(false);
    }
  };

  const handleCreateJira = async () => {
    if (!ticket || !jiraProjectKey.trim()) return;
    setCreatingJira(true);
    setJiraError(null);
    try {
      await api.post(`/jira/tickets/${ticket.id}/create`, {
        projectKey: jiraProjectKey.trim().toUpperCase(),
        issueType: 'Task',
      });
      setJiraProjectKey('');
      await loadTicket();
    } catch (err: unknown) {
      setJiraError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to create Jira issue'
      );
    } finally {
      setCreatingJira(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-[#181A1F] p-12 text-center text-zinc-400">
        <Loader2 className="h-5 w-5 animate-spin inline mr-2 text-blue-500" />
        Loading ticket details...
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-[#181A1F] p-8 text-center">
        <p className="text-sm text-zinc-500">Ticket not found.</p>
        <Link to="/tickets" className="text-xs text-blue-500 hover:underline mt-2 inline-block">
          Back to tickets
        </Link>
      </div>
    );
  }

  const canEditThisTicket =
    canUpdate || ticket.assignee?.id === user?.id || ticket.reporter.id === user?.id;

  const openEditModal = () => {
    setEditTitle(ticket.title);
    setEditDescription(ticket.description);
    setEditCategory(ticket.category);
    setEditDueDate(ticket.dueDate ? ticket.dueDate.slice(0, 10) : '');
    setEditOpen(true);
  };

  const handleSaveEdit = async (e: FormEvent) => {
    e.preventDefault();
    setSavingEdit(true);
    try {
      const res = await api.patch<{ success: boolean; data: TicketDetail }>(
        `/tickets/${ticket.id}`,
        {
          title: editTitle,
          description: editDescription,
          category: editCategory,
          dueDate: editDueDate ? new Date(editDueDate).toISOString() : null,
        }
      );
      setTicket(res.data.data);
      setEditOpen(false);
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-zinc-200/80 dark:border-zinc-800/80 pb-5">
        <div className="space-y-2">
          <Link
            to="/tickets"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-blue-600 dark:text-zinc-400 dark:hover:text-blue-400"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Tickets
          </Link>
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="font-mono text-xs font-bold rounded-lg bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/30 px-2.5 py-1">
              {ticket.ticketNumber}
            </span>
            <StatusBadge status={ticket.status} />
            <PriorityBadge priority={ticket.priority} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
            {ticket.title}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {canEditThisTicket && ticket.status === 'COMPLETED' && (
            <button
              type="button"
              onClick={() => void handleStatusChange('IN_PROGRESS')}
              className="rounded-xl border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300 dark:hover:bg-amber-500/20 px-3 py-2 text-xs font-semibold inline-flex items-center gap-1.5"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reopen Ticket
            </button>
          )}
          {canEditThisTicket && (
            <button
              type="button"
              onClick={openEditModal}
              className="rounded-xl border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/70 dark:text-zinc-200 dark:hover:bg-zinc-800 px-3 py-2 text-xs font-semibold inline-flex items-center gap-1.5"
            >
              <Edit2 className="h-3.5 w-3.5" />
              Edit
            </button>
          )}
          {canEditThisTicket && ticket.status !== 'COMPLETED' && (
            <button
              type="button"
              onClick={() => void handleStatusChange('COMPLETED')}
              className="rounded-xl bg-emerald-600 hover:bg-emerald-500 px-3.5 py-2 text-xs font-semibold text-white transition"
            >
              Mark Completed
            </button>
          )}
          {canDelete && (
            <button
              type="button"
              onClick={() => void handleDelete()}
              className="rounded-xl border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-400 px-3 py-2 text-xs font-semibold inline-flex items-center gap-1.5"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Column */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-[#181A1F] p-6">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-3">
              Description
            </h2>
            <p className="text-sm text-zinc-700 dark:text-zinc-200 whitespace-pre-wrap leading-relaxed">
              {ticket.description}
            </p>
          </div>

          {/* Attachments */}
          <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-[#181A1F] p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
                <Paperclip className="h-4 w-4 text-blue-500" />
                Attachments ({ticket.attachments.length})
              </h2>
              {canEditThisTicket && (
                <label className="cursor-pointer rounded-xl border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-[#111215] dark:hover:bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-200">
                  {uploadingFile ? 'Uploading...' : '+ Upload File'}
                  <input type="file" className="hidden" onChange={handleFileUpload} />
                </label>
              )}
            </div>
            {ticket.attachments.length === 0 ? (
              <p className="text-xs text-zinc-400">No attachments uploaded yet.</p>
            ) : (
              <div className="space-y-2">
                {ticket.attachments.map((att) => (
                  <div
                    key={att.id}
                    className="flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-[#111215] px-3.5 py-2.5 text-xs"
                  >
                    <div>
                      <p className="font-medium text-zinc-800 dark:text-zinc-200">
                        {att.fileName}
                      </p>
                      <p className="text-zinc-400">
                        {(att.fileSize / 1024).toFixed(1)} KB • {att.uploadedBy.displayName}
                      </p>
                    </div>
                    <a
                      href={`/api/tickets/${ticket.id}/attachments/${att.id}/download`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline font-medium"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Comments & Internal Notes */}
          <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-[#181A1F] p-6 space-y-5">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-blue-500" />
              Comments &amp; Notes ({ticket.comments.length})
            </h2>

            <div className="space-y-3">
              {ticket.comments.length === 0 ? (
                <p className="text-xs text-zinc-400">No comments yet.</p>
              ) : (
                ticket.comments.map((c) => (
                  <div
                    key={c.id}
                    className={`rounded-xl border p-4 text-sm ${c.isInternal
                      ? 'border-amber-200 bg-amber-50/70 dark:border-amber-500/30 dark:bg-amber-500/10'
                      : 'border-zinc-200 bg-zinc-50/70 dark:border-zinc-800 dark:bg-[#111215]'
                      }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-xs font-semibold text-zinc-900 dark:text-white">
                        {c.author.displayName}
                      </span>
                      <div className="flex items-center gap-2">
                        {c.isInternal && (
                          <span className="inline-flex items-center gap-1 rounded bg-amber-200/60 dark:bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 dark:text-amber-300">
                            <Lock className="h-2.5 w-2.5" />
                            Internal Note
                          </span>
                        )}
                        <span className="text-[11px] text-zinc-400">
                          {new Date(c.createdAt).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">
                      {c.content}
                    </p>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleAddComment} className="space-y-3 pt-2 border-t border-zinc-200 dark:border-zinc-800">
              <textarea
                rows={3}
                required
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder={isInternal ? 'Write an internal team note...' : 'Write a comment...'}
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-900 focus:bg-white dark:focus:bg-[#111215] dark:border-zinc-800 dark:bg-[#111215] px-3.5 py-2 text-sm dark:text-white focus:border-blue-500 focus:outline-none"
              />
              <div className="flex items-center justify-between gap-3">
                {canInternalNote ? (
                  <label className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isInternal}
                      onChange={(e) => setIsInternal(e.target.checked)}
                      className="rounded border-zinc-300 dark:border-zinc-700 text-amber-500"
                    />
                    Internal note (hidden from end users)
                  </label>
                ) : (
                  <span />
                )}
                <button
                  type="submit"
                  disabled={postingComment}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
                >
                  {postingComment ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                  Post {isInternal ? 'Note' : 'Comment'}
                </button>
              </div>
            </form>
          </div>

          {/* Linked Outlook Email Conversation */}
          {emailThreads.length > 0 && (
            <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-[#181A1F] p-6 space-y-4">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
                <Mail className="h-4 w-4 text-sky-500" />
                Outlook Email Conversation
              </h2>
              {emailThreads.map((thread) => (
                <div key={thread.id} className="space-y-3">
                  {thread.messages.map((m) => (
                    <div
                      key={m.id}
                      className={`rounded-xl border p-3.5 text-xs ${m.direction === 'OUTBOUND'
                        ? 'border-blue-200 bg-blue-50/60 dark:border-blue-500/30 dark:bg-blue-500/10'
                        : 'border-zinc-200 bg-zinc-50/70 dark:border-zinc-800 dark:bg-[#111215]'
                        }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-semibold text-zinc-900 dark:text-white">
                          {m.direction === 'OUTBOUND' ? 'Sent by ' : 'From '}
                          {m.fromName || m.fromEmail}
                        </span>
                        <span className="text-[11px] text-zinc-400">
                          {new Date(m.receivedAt || m.sentAt || m.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">
                        {m.bodyPreview}
                      </p>
                    </div>
                  ))}
                </div>
              ))}

              {canSendEmail && (
                <form
                  onSubmit={handleSendOutlookReply}
                  className="space-y-2.5 pt-3 border-t border-zinc-200 dark:border-zinc-800"
                >
                  {replyError && (
                    <p className="text-xs text-rose-500">{replyError}</p>
                  )}
                  {emailTemplates.length > 0 && (
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                        Use Template
                      </label>
                      <select
                        defaultValue=""
                        onChange={(e) => {
                          const tpl = emailTemplates.find((t) => t.id === e.target.value);
                          if (!tpl || !ticket) return;
                          const filled = tpl.body
                            .replace(/\{\{ticketNumber\}\}/g, ticket.ticketNumber)
                            .replace(/\{\{ticketTitle\}\}/g, ticket.title)
                            .replace(/\{\{status\}\}/g, STATUS_LABELS[ticket.status] || ticket.status)
                            .replace(
                              /\{\{assigneeName\}\}/g,
                              ticket.assignee?.displayName || 'TicketSphere Support'
                            );
                          setReplyText(filled);
                          e.target.value = '';
                        }}
                        className="rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-800 dark:bg-[#111215] px-3 py-1.5 text-xs font-medium dark:text-zinc-200 focus:border-blue-500 focus:outline-none"
                      >
                        <option value="">Insert a template...</option>
                        {emailTemplates.map((tpl) => (
                          <option key={tpl.id} value={tpl.id}>
                            [{tpl.category}] {tpl.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <textarea
                    rows={3}
                    required
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Reply to this Outlook thread directly from TicketSphere..."
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-900 focus:bg-white dark:focus:bg-[#111215] dark:border-zinc-800 dark:bg-[#111215] px-3.5 py-2 text-sm dark:text-white focus:border-blue-500 focus:outline-none"
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={sendingReply}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
                    >
                      {sendingReply ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Mail className="h-3.5 w-3.5" />
                      )}
                      Send Outlook Reply
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Right Metadata & History Sidebar */}
        <div className="space-y-6">
          <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-[#181A1F] p-5 space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Ticket Properties
            </h2>

            <div>
              <label className="block text-[11px] font-medium text-zinc-400 mb-1">Status</label>
              <select
                disabled={!canEditThisTicket}
                value={ticket.status}
                onChange={(e) => void handleStatusChange(e.target.value as TicketStatus)}
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-900 disabled:opacity-60 dark:border-zinc-800 dark:bg-[#111215] px-3 py-2 text-xs font-medium dark:text-white focus:border-blue-500 focus:outline-none"
              >
                {ALL_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-zinc-400 mb-1">Priority</label>
              <select
                disabled={!canEditThisTicket}
                value={ticket.priority}
                onChange={(e) => void handlePriorityChange(e.target.value as TicketPriority)}
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-900 disabled:opacity-60 dark:border-zinc-800 dark:bg-[#111215] px-3 py-2 text-xs font-medium dark:text-white focus:border-blue-500 focus:outline-none"
              >
                {ALL_PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {PRIORITY_LABELS[p]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-zinc-400 mb-1">Assignee</label>
              {canAssign ? (
                <select
                  value={ticket.assignee?.id ?? ''}
                  onChange={(e) => void handleAssigneeChange(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-900 dark:border-zinc-800 dark:bg-[#111215] px-3 py-2 text-xs font-medium dark:text-white focus:border-blue-500 focus:outline-none"
                >
                  <option value="">Unassigned</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.displayName}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-xs font-medium text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                  <UserIcon className="h-3.5 w-3.5 text-zinc-400" />
                  {ticket.assignee ? ticket.assignee.displayName : 'Unassigned'}
                </p>
              )}
            </div>

            <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-400">Reporter</span>
                <span className="font-medium text-zinc-800 dark:text-zinc-200">
                  {ticket.reporter.displayName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Module</span>
                <span className="font-medium text-zinc-800 dark:text-zinc-200">
                  {ticket.module?.name || '—'}
                  {ticket.submodule ? ` / ${ticket.submodule.name}` : ''}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400 flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" /> Due Date
                </span>
                <span className="font-medium text-zinc-800 dark:text-zinc-200">
                  {ticket.dueDate ? new Date(ticket.dueDate).toLocaleDateString() : '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400 flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" /> Created
                </span>
                <span className="text-zinc-600 dark:text-zinc-300">
                  {new Date(ticket.createdAt).toLocaleString()}
                </span>
              </div>
            </div>

            {/* External References */}
            <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 space-y-2 text-xs">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                Integrations
              </p>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Jira Issue</span>
                {ticket.jiraIssue ? (
                  <div className="flex items-center gap-2">
                    <a
                      href={ticket.jiraIssue.issueUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 font-mono text-blue-500 hover:underline"
                    >
                      {ticket.jiraIssue.jiraKey} ({ticket.jiraIssue.statusName})
                      <ExternalLink className="h-3 w-3" />
                    </a>
                    {canManageJira && (
                      <button
                        type="button"
                        onClick={async () => {
                          if (!editingJira && ticket.jiraIssue) {
                            setJiraError(null);
                            setJiraEditSummary(
                              (ticket.jiraIssue as { summary?: string }).summary || ticket.title
                            );
                            setJiraEditDescription('');
                            setJiraTransitionId('');
                            try {
                              const res = await api.get<{
                                success: boolean;
                                data: Array<{ id: string; name: string; toStatus: string }>;
                              }>(`/jira/issues/${ticket.jiraIssue.id}/transitions`);
                              setJiraTransitions(res.data.data);
                            } catch {
                              setJiraTransitions([]);
                            }
                          }
                          setEditingJira((v) => !v);
                        }}
                        className="text-[11px] font-medium text-blue-600 hover:underline dark:text-blue-400"
                      >
                        {editingJira ? 'Close' : 'Update'}
                      </button>
                    )}
                  </div>
                ) : (
                  <span className="text-zinc-500">Not linked</span>
                )}
              </div>
              {canManageJira && ticket.jiraIssue && editingJira && (
                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 space-y-2 dark:border-zinc-800 dark:bg-[#111215]">
                  {jiraError && <p className="text-[11px] text-rose-500">{jiraError}</p>}
                  <div>
                    <label className="block text-[10px] font-semibold uppercase text-zinc-400 mb-1">
                      Jira Status
                    </label>
                    <select
                      value={jiraTransitionId}
                      disabled={ticket.jiraIssue.statusName.trim().toLowerCase() === 'done'}
                      onChange={(e) => setJiraTransitionId(e.target.value)}
                      className="w-full rounded-lg border border-zinc-200 bg-white text-zinc-900 dark:border-zinc-800 dark:bg-[#181A1F] px-2.5 py-1 text-xs dark:text-white focus:border-blue-500 focus:outline-none disabled:opacity-60"
                    >
                      <option value="">
                        {ticket.jiraIssue.statusName.trim().toLowerCase() === 'done'
                          ? 'Done (Locked — cannot revert)'
                          : `Keep (${ticket.jiraIssue.statusName})`}
                      </option>
                      {jiraTransitions.map((tr) => (
                        <option key={tr.id} value={tr.id}>
                          {tr.toStatus}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold uppercase text-zinc-400 mb-1">
                      Jira Summary
                    </label>
                    <input
                      type="text"
                      value={jiraEditSummary}
                      onChange={(e) => setJiraEditSummary(e.target.value)}
                      className="w-full rounded-lg border border-zinc-200 bg-white text-zinc-900 dark:border-zinc-800 dark:bg-[#181A1F] px-2.5 py-1 text-xs dark:text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold uppercase text-zinc-400 mb-1">
                      Jira Description (optional)
                    </label>
                    <textarea
                      rows={2}
                      value={jiraEditDescription}
                      onChange={(e) => setJiraEditDescription(e.target.value)}
                      placeholder="Leave blank to keep existing description"
                      className="w-full rounded-lg border border-zinc-200 bg-white text-zinc-900 dark:border-zinc-800 dark:bg-[#181A1F] px-2.5 py-1 text-xs dark:text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingJira(false)}
                      className="rounded-lg border border-zinc-200 dark:border-zinc-700 px-2.5 py-1 text-[11px] font-medium text-zinc-600 dark:text-zinc-300"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={savingJiraUpdate}
                      onClick={async () => {
                        if (!ticket.jiraIssue) return;
                        setSavingJiraUpdate(true);
                        setJiraError(null);
                        try {
                          await api.patch(`/jira/issues/${ticket.jiraIssue.id}`, {
                            summary: jiraEditSummary.trim() || undefined,
                            description: jiraEditDescription.trim()
                              ? jiraEditDescription
                              : undefined,
                            transitionId: jiraTransitionId || undefined,
                          });
                          setEditingJira(false);
                          await loadTicket();
                        } catch (err: unknown) {
                          setJiraError(
                            (err as { response?: { data?: { message?: string } } })?.response?.data
                              ?.message || 'Failed to update Jira issue'
                          );
                        } finally {
                          setSavingJiraUpdate(false);
                        }
                      }}
                      className="rounded-lg bg-blue-600 hover:bg-blue-500 px-2.5 py-1 text-[11px] font-semibold text-white disabled:opacity-50"
                    >
                      {savingJiraUpdate ? 'Updating...' : 'Save to Jira'}
                    </button>
                  </div>
                </div>
              )}
              {canManageJira && !ticket.jiraIssue && (
                <div className="space-y-2 pt-1">
                  {jiraError && <p className="text-[11px] text-rose-500">{jiraError}</p>}
                  <form onSubmit={handleLinkJira} className="flex gap-1.5">
                    <input
                      type="text"
                      value={jiraKeyInput}
                      onChange={(e) => setJiraKeyInput(e.target.value)}
                      placeholder="Link key (e.g. PROJ-245)"
                      className="flex-1 rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-900 dark:border-zinc-800 dark:bg-[#111215] px-2.5 py-1 text-xs font-mono dark:text-white focus:border-blue-500 focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={linkingJira}
                      className="rounded-lg bg-blue-600 hover:bg-blue-500 px-2.5 py-1 text-[11px] font-semibold text-white disabled:opacity-50"
                    >
                      {linkingJira ? '...' : 'Link'}
                    </button>
                  </form>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={jiraProjectKey}
                      onChange={(e) => setJiraProjectKey(e.target.value)}
                      placeholder="Create in project (e.g. PROJ)"
                      className="flex-1 rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-900 dark:border-zinc-800 dark:bg-[#111215] px-2.5 py-1 text-xs font-mono dark:text-white focus:border-blue-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      disabled={creatingJira || !jiraProjectKey.trim()}
                      onClick={() => void handleCreateJira()}
                      className="rounded-lg border border-zinc-200 dark:border-zinc-700 px-2.5 py-1 text-[11px] font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50"
                    >
                      {creatingJira ? '...' : 'Create'}
                    </button>
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-zinc-400 flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5" /> Outlook Ref
                </span>
                <span className="text-zinc-500 font-mono">
                  {ticket.outlookEmailId ? 'Linked' : 'None'}
                </span>
              </div>
            </div>
          </div>

          {/* Activity History */}
          <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-[#181A1F] p-5">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5 mb-4">
              <History className="h-3.5 w-3.5" />
              Activity History
            </h2>
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {ticket.history.map((h) => (
                <div
                  key={h.id}
                  className="border-l-2 border-blue-500/40 pl-3 py-0.5 text-xs space-y-0.5"
                >
                  <p className="font-medium text-zinc-800 dark:text-zinc-200">
                    {h.action.replace(/_/g, ' ')}
                    {h.field ? ` (${h.field})` : ''}
                  </p>
                  {(h.oldValue || h.newValue) && (
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                      {h.oldValue ? `${h.oldValue} → ` : ''}
                      {h.newValue}
                    </p>
                  )}
                  <p className="text-[10px] text-zinc-400">
                    {h.actor?.displayName ?? 'System'} • {new Date(h.createdAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/75 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-lg bg-white border border-zinc-200 dark:bg-[#181A1F] dark:border-zinc-800 shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
                Edit {ticket.ticketNumber}
              </h2>
              <button
                type="button"
                onClick={() => setEditOpen(false)}
                className="text-zinc-400 hover:text-zinc-700 dark:hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  required
                  minLength={3}
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-900 focus:bg-white dark:focus:bg-[#111215] dark:border-zinc-800 dark:bg-[#111215] px-3 py-2 text-sm dark:text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1">
                  Description
                </label>
                <textarea
                  rows={4}
                  required
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-900 focus:bg-white dark:focus:bg-[#111215] dark:border-zinc-800 dark:bg-[#111215] px-3 py-2 text-sm dark:text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1">
                    Category
                  </label>
                  <input
                    type="text"
                    required
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-900 focus:bg-white dark:focus:bg-[#111215] dark:border-zinc-800 dark:bg-[#111215] px-3 py-2 text-sm dark:text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={editDueDate}
                    onChange={(e) => setEditDueDate(e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-900 dark:border-zinc-800 dark:bg-[#111215] px-3 py-2 text-sm dark:text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditOpen(false)}
                  className="rounded-xl border border-zinc-200 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 px-4 py-2 text-sm font-medium dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 inline-flex items-center gap-2"
                >
                  {savingEdit && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
