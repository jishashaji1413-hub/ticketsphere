import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Kanban,
  Loader2,
  MessageSquare,
  Paperclip,
  Plus,
  RotateCcw,
  Search,
  Table2,
  Trash2,
  User as UserIcon,
} from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { getApiErrorMessage, useToast } from '../../context/ToastContext';
import { CreateTicketModal } from '../../components/tickets/CreateTicketModal';
import {
  ALL_PRIORITIES,
  ALL_STATUSES,
  PRIORITY_LABELS,
  PriorityBadge,
  STATUS_LABELS,
  StatusBadge,
} from '../../components/tickets/TicketBadges';
import type {
  ModuleOption,
  TicketStatus,
  TicketSummary,
} from '../../types/ticket';
import type { UserProfile } from '../../types/auth';

interface TicketsListPageProps {
  defaultView?: 'all' | 'my' | 'assigned' | 'created' | 'unassigned';
  defaultStatus?: TicketStatus | '';
  defaultOverdue?: boolean;
  title: string;
  subtitle: string;
}

export default function TicketsListPage({
  defaultView = 'all',
  defaultStatus = '',
  defaultOverdue = false,
  title,
  subtitle,
}: TicketsListPageProps) {
  const { user, hasPermission } = useAuth();
  const toast = useToast();
  const canCreate = hasPermission('tickets.create');
  const canUpdate = hasPermission('tickets.update');
  const canDelete = hasPermission('tickets.delete');

  const [showDeleted, setShowDeleted] = useState(false);

  const [displayMode, setDisplayMode] = useState<'table' | 'kanban'>('table');
  const [tickets, setTickets] = useState<TicketSummary[]>([]);
  const [modules, setModules] = useState<ModuleOption[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') ?? '');
  const [statusFilter, setStatusFilter] = useState<string>(
    defaultStatus || (searchParams.get('status') ?? '')
  );
  const [overdueFilter, setOverdueFilter] = useState<boolean>(
    Boolean(defaultOverdue || searchParams.get('overdue') === 'true')
  );

  useEffect(() => {
    setSearch(searchParams.get('search') ?? '');
    setStatusFilter(defaultStatus || (searchParams.get('status') ?? ''));
    setOverdueFilter(Boolean(defaultOverdue || searchParams.get('overdue') === 'true'));
  }, [defaultStatus, defaultOverdue, searchParams]);
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [projectFilter, setProjectFilter] = useState<string>('');
  const [moduleFilter, setModuleFilter] = useState<string>('');
  const [submoduleFilter, setSubmoduleFilter] = useState<string>('');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState<'createdAt' | 'priority' | 'status' | 'dueDate'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [createOpen, setCreateOpen] = useState(false);

  const loadTickets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{
        success: boolean;
        data: {
          items: TicketSummary[];
          pagination: { page: number; totalPages: number; total: number };
        };
      }>('/tickets', {
        params: {
          view: showDeleted ? 'deleted' : defaultView,
          search: search || undefined,
          status: statusFilter || undefined,
          overdue: overdueFilter ? 'true' : undefined,
          priority: priorityFilter || undefined,
          projectName: projectFilter || undefined,
          moduleId: moduleFilter || undefined,
          submoduleId: submoduleFilter || undefined,
          assigneeId: assigneeFilter || undefined,
          sortBy,
          sortOrder,
          page,
          limit: displayMode === 'kanban' ? 100 : 15,
        },
      });
      setTickets(res.data.data.items);
      setTotalPages(res.data.data.pagination.totalPages);
      setTotal(res.data.data.pagination.total);
    } finally {
      setLoading(false);
    }
  }, [
    defaultView,
    showDeleted,
    search,
    statusFilter,
    overdueFilter,
    priorityFilter,
    projectFilter,
    moduleFilter,
    submoduleFilter,
    assigneeFilter,
    sortBy,
    sortOrder,
    page,
    displayMode,
  ]);

  useEffect(() => {
    void loadTickets();
  }, [loadTickets]);

  useEffect(() => {
    const loadFilters = async () => {
      try {
        const [modRes, userRes] = await Promise.all([
          api.get<{ success: boolean; data: ModuleOption[] }>('/modules/options'),
          api.get<{ success: boolean; data: UserProfile[] }>('/users', {
            params: { activeOnly: 'true' },
          }),
        ]);
        setModules(modRes.data.data);
        setUsers(userRes.data.data);
      } catch {
        // ignore filter preload errors
      }
    };
    void loadFilters();
  }, []);

  const handleSort = (col: 'createdAt' | 'priority' | 'status' | 'dueDate') => {
    if (sortBy === col) {
      setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(col);
      setSortOrder('desc');
    }
  };

  const handleQuickStatusChange = async (ticketId: string, nextStatus: TicketStatus) => {
    try {
      await api.patch(`/tickets/${ticketId}`, { status: nextStatus });
      toast.success(`Ticket status updated to ${STATUS_LABELS[nextStatus]}.`);
      await loadTickets();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to update ticket status'));
    }
  };

  const handleDeleteTicket = async (t: TicketSummary) => {
    if (!window.confirm(`Delete ticket ${t.ticketNumber}?`)) return;
    try {
      await api.delete(`/tickets/${t.id}`);
      toast.success(`Ticket ${t.ticketNumber} moved to deleted.`);
      await loadTickets();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to delete ticket'));
    }
  };

  const handleRestoreTicket = async (t: TicketSummary) => {
    try {
      await api.post(`/tickets/${t.id}/restore`);
      toast.success(`Ticket ${t.ticketNumber} restored.`);
      await loadTickets();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to restore ticket'));
    }
  };

  const effectiveTitle = showDeleted
    ? 'Deleted Tickets'
    : overdueFilter
      ? 'Overdue Tickets'
      : statusFilter && STATUS_LABELS[statusFilter as TicketStatus]
        ? `${STATUS_LABELS[statusFilter as TicketStatus]} Tickets`
        : title;

  const effectiveSubtitle = showDeleted
    ? 'Soft-deleted tickets that can be reviewed or restored'
    : overdueFilter
      ? 'Open tickets past their scheduled due date'
      : statusFilter && STATUS_LABELS[statusFilter as TicketStatus]
        ? `Showing tickets currently in ${STATUS_LABELS[statusFilter as TicketStatus]} status`
        : subtitle;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-200/80 dark:border-zinc-800/80 pb-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            Ticket Management
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white mt-1">
            {effectiveTitle}
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            {effectiveSubtitle} • <span className="font-mono">{total}</span> total
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {overdueFilter && (
            <button
              type="button"
              onClick={() => {
                setOverdueFilter(false);
                const next = new URLSearchParams(searchParams);
                next.delete('overdue');
                setSearchParams(next);
                setPage(1);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/15 dark:text-rose-300 px-3 py-2 text-xs font-medium transition"
            >
              Overdue Only ×
            </button>
          )}
          {canDelete && (
            <button
              type="button"
              onClick={() => {
                setShowDeleted((d) => !d);
                setPage(1);
              }}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition ${
                showDeleted
                  ? 'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/15 dark:text-rose-300'
                  : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-[#181A1F] dark:text-zinc-300 dark:hover:bg-zinc-800'
              }`}
            >
              <Trash2 className="h-3.5 w-3.5" />
              {showDeleted ? 'Viewing Deleted' : 'Deleted'}
            </button>
          )}
          <div className="inline-flex rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-[#181A1F] p-1">
            <button
              type="button"
              onClick={() => setDisplayMode('table')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${displayMode === 'table'
                ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300'
                : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-white'
                }`}
            >
              <Table2 className="h-3.5 w-3.5" />
              Table
            </button>
            <button
              type="button"
              onClick={() => setDisplayMode('kanban')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${displayMode === 'kanban'
                ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300'
                : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-white'
                }`}
            >
              <Kanban className="h-3.5 w-3.5" />
              Status
            </button>
          </div>

          {canCreate && (
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-sky-600 px-4 py-2 text-sm font-semibold text-white hover:from-blue-500 hover:to-sky-500 transition shadow-xs"
            >
              <Plus className="h-4 w-4" />
              New Ticket
            </button>
          )}
        </div>
      </div>

      {/* Filters Bar */}
      <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-[#181A1F] p-3.5 sm:p-4 grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap items-center gap-2.5 sm:gap-3">
        <div className="relative sm:col-span-2 lg:flex-1 lg:min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search TS-001, title, description..."
            className="w-full rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-900 focus:bg-white dark:focus:bg-[#111215] dark:border-zinc-800 dark:bg-[#111215] pl-9 pr-3 py-1.5 text-sm dark:text-white placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => {
            const val = e.target.value;
            setStatusFilter(val);
            const next = new URLSearchParams(searchParams);
            if (val) {
              next.set('status', val);
            } else {
              next.delete('status');
            }
            setSearchParams(next);
            setPage(1);
          }}
          className="rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-800 dark:bg-[#111215] px-3 py-1.5 text-xs font-medium dark:text-zinc-200 focus:border-blue-500 focus:outline-none"
        >
          <option value="">All Statuses</option>
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>

        <select
          value={priorityFilter}
          onChange={(e) => {
            setPriorityFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-800 dark:bg-[#111215] px-3 py-1.5 text-xs font-medium dark:text-zinc-200 focus:border-blue-500 focus:outline-none"
        >
          <option value="">All Priorities</option>
          {ALL_PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {PRIORITY_LABELS[p]}
            </option>
          ))}
        </select>

        <select
          value={projectFilter}
          onChange={(e) => {
            setProjectFilter(e.target.value);
            setModuleFilter('');
            setSubmoduleFilter('');
            setPage(1);
          }}
          className="rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-800 dark:bg-[#111215] px-3 py-1.5 text-xs font-medium dark:text-zinc-200 focus:border-blue-500 focus:outline-none"
        >
          <option value="">All Projects</option>
          {Array.from(
            new Set(modules.map((m) => m.projectName).filter((p): p is string => Boolean(p)))
          ).map((proj) => (
            <option key={proj} value={proj}>
              {proj}
            </option>
          ))}
        </select>

        <select
          value={moduleFilter}
          onChange={(e) => {
            setModuleFilter(e.target.value);
            setSubmoduleFilter('');
            setPage(1);
          }}
          className="rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-800 dark:bg-[#111215] px-3 py-1.5 text-xs font-medium dark:text-zinc-200 focus:border-blue-500 focus:outline-none"
        >
          <option value="">All Modules</option>
          {(projectFilter ? modules.filter((m) => m.projectName === projectFilter) : modules).map(
            (m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            )
          )}
        </select>

        <select
          value={submoduleFilter}
          disabled={!moduleFilter}
          onChange={(e) => {
            setSubmoduleFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-700 disabled:opacity-50 dark:border-zinc-800 dark:bg-[#111215] px-3 py-1.5 text-xs font-medium dark:text-zinc-200 focus:border-blue-500 focus:outline-none"
        >
          <option value="">All Submodules</option>
          {(modules.find((m) => m.id === moduleFilter)?.submodules ?? []).map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        <select
          value={assigneeFilter}
          onChange={(e) => {
            setAssigneeFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-800 dark:bg-[#111215] px-3 py-1.5 text-xs font-medium dark:text-zinc-200 focus:border-blue-500 focus:outline-none"
        >
          <option value="">All Assignees</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.displayName}
            </option>
          ))}
        </select>
      </div>

      {/* Content */}
      {loading ? (
        <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-[#181A1F] p-12 text-center text-zinc-500 dark:text-zinc-400">
          <Loader2 className="h-5 w-5 animate-spin inline mr-2 text-blue-600 dark:text-blue-400" />
          Loading tickets...
        </div>
      ) : displayMode === 'table' ? (
        <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-[#181A1F] overflow-hidden shadow-2xs">
          {/* Mobile Card List */}
          <div className="sm:hidden divide-y divide-zinc-200 dark:divide-zinc-800">
            {tickets.length === 0 ? (
              <p className="px-4 py-10 text-center text-xs text-zinc-400">
                No tickets match your current filters.
              </p>
            ) : (
              tickets.map((t) => (
                <div
                  key={t.id}
                  className="p-4 space-y-2 hover:bg-zinc-50 dark:hover:bg-white/[0.02] transition"
                >
                  <div className="flex items-center justify-between gap-2">
                    <Link
                      to={`/tickets/${t.id}`}
                      className="font-mono text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400"
                    >
                      {t.ticketNumber}
                    </Link>
                    <div className="flex items-center gap-1.5">
                      <PriorityBadge priority={t.priority} />
                      <StatusBadge status={t.status} />
                      {canDelete && (
                        showDeleted ? (
                          <button
                            type="button"
                            onClick={() => void handleRestoreTicket(t)}
                            title="Restore ticket"
                            className="p-1 rounded text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-500/10"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => void handleDeleteTicket(t)}
                            title="Delete ticket"
                            className="p-1 rounded text-rose-500 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )
                      )}
                    </div>
                  </div>
                  <Link
                    to={`/tickets/${t.id}`}
                    className="block text-sm font-medium text-zinc-900 dark:text-white line-clamp-2"
                  >
                    {t.title}
                  </Link>
                  <div className="flex items-center justify-between text-[11px] text-zinc-400">
                    <span className="truncate">
                      {t.assignee ? t.assignee.displayName : 'Unassigned'}
                    </span>
                    <span>{new Date(t.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 text-zinc-500 border-b border-zinc-200 dark:bg-[#16181D] text-[11px] font-semibold uppercase tracking-wider dark:text-zinc-400 dark:border-zinc-800">
                <tr>
                  <th className="px-5 py-3.5">Key</th>
                  <th className="px-5 py-3.5">Title &amp; Module</th>
                  <th className="px-5 py-3.5">
                    <button
                      type="button"
                      onClick={() => handleSort('status')}
                      className="inline-flex items-center gap-1 hover:text-zinc-800 dark:hover:text-white"
                    >
                      Status <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="px-5 py-3.5">
                    <button
                      type="button"
                      onClick={() => handleSort('priority')}
                      className="inline-flex items-center gap-1 hover:text-zinc-800 dark:hover:text-white"
                    >
                      Priority <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="px-5 py-3.5">Assignee</th>
                  <th className="px-5 py-3.5">
                    <button
                      type="button"
                      onClick={() => handleSort('createdAt')}
                      className="inline-flex items-center gap-1 hover:text-zinc-800 dark:hover:text-white"
                    >
                      Created <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  {canDelete && <th className="px-5 py-3.5 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/80">
                {tickets.length === 0 ? (
                  <tr>
                    <td colSpan={canDelete ? 7 : 6} className="px-5 py-12 text-center text-zinc-400">
                      No tickets match your current filters.
                    </td>
                  </tr>
                ) : (
                  tickets.map((t) => (
                    <tr
                      key={t.id}
                      className="hover:bg-zinc-50/80 dark:hover:bg-white/[0.02] transition"
                    >
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <Link
                          to={`/tickets/${t.id}`}
                          className="font-mono text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400"
                        >
                          {t.ticketNumber}
                        </Link>
                      </td>
                      <td className="px-5 py-3.5 max-w-md">
                        <Link
                          to={`/tickets/${t.id}`}
                          className="font-medium text-zinc-900 hover:text-blue-600 dark:text-white dark:hover:text-blue-300 line-clamp-1"
                        >
                          {t.title}
                        </Link>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-zinc-400">
                          {t.module?.projectName && (
                            <span className="font-medium text-blue-500 dark:text-blue-400">
                              {t.module.projectName} /
                            </span>
                          )}
                          <span>{t.module?.name || t.category}</span>
                          {t.submodule && <span>• {t.submodule.name}</span>}
                          {t.jiraIssue && (
                            <span className="font-mono text-[10px] rounded bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300 px-1.5 py-0.5">
                              {t.jiraIssue.jiraKey}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <StatusBadge status={t.status} />
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <PriorityBadge priority={t.priority} />
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap text-xs">
                        {t.assignee ? (
                          <span className="inline-flex items-center gap-1.5 text-zinc-700 dark:text-zinc-200">
                            <UserIcon className="h-3.5 w-3.5 text-blue-500" />
                            {t.assignee.displayName}
                          </span>
                        ) : (
                          <span className="text-zinc-400 italic">Unassigned</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap text-xs text-zinc-500 dark:text-zinc-400">
                        {new Date(t.createdAt).toLocaleDateString()}
                      </td>
                      {canDelete && (
                        <td className="px-5 py-3.5 whitespace-nowrap text-right">
                          {showDeleted ? (
                            <button
                              type="button"
                              onClick={() => void handleRestoreTicket(t)}
                              className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
                            >
                              <RotateCcw className="h-3 w-3" />
                              Restore
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => void handleDeleteTicket(t)}
                              title="Delete ticket"
                              className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-600 hover:bg-rose-100 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300"
                            >
                              <Trash2 className="h-3 w-3" />
                              Delete
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="px-5 py-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-xs text-zinc-500">
              <span>
                Page {page} of {totalPages}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 disabled:opacity-40"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Kanban Board View */
        <div className="flex overflow-x-auto pb-3 snap-x snap-mandatory lg:grid lg:grid-cols-5 gap-4">
          {ALL_STATUSES.map((colStatus) => {
            const colTickets = tickets.filter((t) => t.status === colStatus);
            return (
              <div
                key={colStatus}
                className="min-w-[270px] sm:min-w-[290px] lg:min-w-0 snap-start rounded-lg border border-zinc-200 bg-zinc-50/70 dark:border-zinc-800 dark:bg-[#16181D] p-3 flex flex-col gap-3 min-h-[340px]"
              >
                <div className="flex items-center justify-between px-1">
                  <StatusBadge status={colStatus} />
                  <span className="text-xs font-mono text-zinc-400">{colTickets.length}</span>
                </div>

                <div className="space-y-2.5 flex-1">
                  {colTickets.map((t) => (
                    <div
                      key={t.id}
                      className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-[#181A1F] p-3.5 space-y-2.5 shadow-2xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <Link
                          to={`/tickets/${t.id}`}
                          className="font-mono text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          {t.ticketNumber}
                        </Link>
                        <PriorityBadge priority={t.priority} />
                      </div>
                      <Link
                        to={`/tickets/${t.id}`}
                        className="block text-xs font-semibold text-zinc-900 dark:text-white hover:text-blue-500 line-clamp-2"
                      >
                        {t.title}
                      </Link>
                      <div className="flex items-center justify-between text-[11px] text-zinc-400">
                        <span className="truncate">
                          {t.assignee ? t.assignee.displayName : 'Unassigned'}
                        </span>
                        <span className="inline-flex items-center gap-2 shrink-0">
                          <span className="inline-flex items-center gap-0.5">
                            <MessageSquare className="h-3 w-3" />
                            {t._count.comments}
                          </span>
                          <span className="inline-flex items-center gap-0.5">
                            <Paperclip className="h-3 w-3" />
                            {t._count.attachments}
                          </span>
                        </span>
                      </div>
                      {(canUpdate ||
                        t.assignee?.id === user?.id ||
                        t.reporter.id === user?.id) && (
                          <select
                            value={t.status}
                            onChange={(e) =>
                              void handleQuickStatusChange(t.id, e.target.value as TicketStatus)
                            }
                            className="w-full rounded-lg border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-[#111215] px-2 py-1 text-[11px] text-zinc-700 dark:text-zinc-300 focus:outline-none"
                          >
                            {ALL_STATUSES.map((s) => (
                              <option key={s} value={s}>
                                Move to: {STATUS_LABELS[s]}
                              </option>
                            ))}
                          </select>
                        )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <CreateTicketModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => void loadTickets()}
      />
    </div>
  );
}
