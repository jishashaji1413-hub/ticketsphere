import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Kanban,
  Loader2,
  MessageSquare,
  Paperclip,
  Plus,
  Search,
  Table2,
  User as UserIcon,
} from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
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
  title: string;
  subtitle: string;
}

export default function TicketsListPage({
  defaultView = 'all',
  title,
  subtitle,
}: TicketsListPageProps) {
  const { user, hasPermission } = useAuth();
  const canCreate = hasPermission('tickets.create');
  const canUpdate = hasPermission('tickets.update');

  const [displayMode, setDisplayMode] = useState<'table' | 'kanban'>('table');
  const [tickets, setTickets] = useState<TicketSummary[]>([]);
  const [modules, setModules] = useState<ModuleOption[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
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
          view: defaultView,
          search: search || undefined,
          status: statusFilter || undefined,
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
    search,
    statusFilter,
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
    await api.patch(`/tickets/${ticketId}`, { status: nextStatus });
    await loadTickets();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800/80 pb-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            Ticket Management
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
            {title}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {subtitle} • <span className="font-mono">{total}</span> total
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="inline-flex rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#111827] p-1">
            <button
              type="button"
              onClick={() => setDisplayMode('table')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                displayMode === 'table'
                  ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <Table2 className="h-3.5 w-3.5" />
              Table
            </button>
            <button
              type="button"
              onClick={() => setDisplayMode('kanban')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                displayMode === 'kanban'
                  ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <Kanban className="h-3.5 w-3.5" />
              Kanban
            </button>
          </div>

          {canCreate && (
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2 text-sm font-semibold text-white hover:from-indigo-500 hover:to-violet-500 transition shadow-md shadow-indigo-950/20 dark:shadow-indigo-950/50"
            >
              <Plus className="h-4 w-4" />
              New Ticket
            </button>
          )}
        </div>
      </div>

      {/* Filters Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#111827] p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search TS-1001, title, description..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:bg-white dark:focus:bg-[#0B101B] dark:border-slate-800 dark:bg-[#090D16] pl-9 pr-3 py-1.5 text-sm dark:text-white placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-xl border border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-[#090D16] px-3 py-1.5 text-xs font-medium dark:text-slate-200 focus:border-indigo-500 focus:outline-none"
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
          className="rounded-xl border border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-[#090D16] px-3 py-1.5 text-xs font-medium dark:text-slate-200 focus:border-indigo-500 focus:outline-none"
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
          className="rounded-xl border border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-[#090D16] px-3 py-1.5 text-xs font-medium dark:text-slate-200 focus:border-indigo-500 focus:outline-none"
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
          className="rounded-xl border border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-[#090D16] px-3 py-1.5 text-xs font-medium dark:text-slate-200 focus:border-indigo-500 focus:outline-none"
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
          className="rounded-xl border border-slate-200 bg-slate-50 text-slate-700 disabled:opacity-50 dark:border-slate-800 dark:bg-[#090D16] px-3 py-1.5 text-xs font-medium dark:text-slate-200 focus:border-indigo-500 focus:outline-none"
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
          className="rounded-xl border border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-[#090D16] px-3 py-1.5 text-xs font-medium dark:text-slate-200 focus:border-indigo-500 focus:outline-none"
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
        <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#111827] p-12 text-center text-slate-500 dark:text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin inline mr-2 text-indigo-600 dark:text-indigo-400" />
          Loading tickets...
        </div>
      ) : displayMode === 'table' ? (
        <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#111827] overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 dark:bg-[#0D1321] text-[11px] font-semibold uppercase tracking-wider dark:text-slate-400 dark:border-slate-800">
                <tr>
                  <th className="px-5 py-3.5">Key</th>
                  <th className="px-5 py-3.5">Title &amp; Module</th>
                  <th className="px-5 py-3.5">
                    <button
                      type="button"
                      onClick={() => handleSort('status')}
                      className="inline-flex items-center gap-1 hover:text-slate-800 dark:hover:text-white"
                    >
                      Status <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="px-5 py-3.5">
                    <button
                      type="button"
                      onClick={() => handleSort('priority')}
                      className="inline-flex items-center gap-1 hover:text-slate-800 dark:hover:text-white"
                    >
                      Priority <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="px-5 py-3.5">Assignee</th>
                  <th className="px-5 py-3.5">
                    <button
                      type="button"
                      onClick={() => handleSort('createdAt')}
                      className="inline-flex items-center gap-1 hover:text-slate-800 dark:hover:text-white"
                    >
                      Created <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80">
                {tickets.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-slate-400">
                      No tickets match your current filters.
                    </td>
                  </tr>
                ) : (
                  tickets.map((t) => (
                    <tr
                      key={t.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition"
                    >
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <Link
                          to={`/tickets/${t.id}`}
                          className="font-mono text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
                        >
                          {t.ticketNumber}
                        </Link>
                      </td>
                      <td className="px-5 py-3.5 max-w-md">
                        <Link
                          to={`/tickets/${t.id}`}
                          className="font-medium text-slate-900 hover:text-indigo-600 dark:text-white dark:hover:text-indigo-300 line-clamp-1"
                        >
                          {t.title}
                        </Link>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
                          {t.module?.projectName && (
                            <span className="font-medium text-indigo-500 dark:text-indigo-400">
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
                          <span className="inline-flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
                            <UserIcon className="h-3.5 w-3.5 text-indigo-500" />
                            {t.assignee.displayName}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Unassigned</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap text-xs text-slate-500 dark:text-slate-400">
                        {new Date(t.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
              <span>
                Page {page} of {totalPages}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-40"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Kanban Board View */
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4">
          {ALL_STATUSES.map((colStatus) => {
            const colTickets = tickets.filter((t) => t.status === colStatus);
            return (
              <div
                key={colStatus}
                className="rounded-2xl border border-slate-200 bg-slate-50/70 dark:border-slate-800 dark:bg-[#0D1321] p-3 flex flex-col gap-3 min-h-[340px]"
              >
                <div className="flex items-center justify-between px-1">
                  <StatusBadge status={colStatus} />
                  <span className="text-xs font-mono text-slate-400">{colTickets.length}</span>
                </div>

                <div className="space-y-2.5 flex-1">
                  {colTickets.map((t) => (
                    <div
                      key={t.id}
                      className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#111827] p-3.5 space-y-2.5 shadow-2xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <Link
                          to={`/tickets/${t.id}`}
                          className="font-mono text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                        >
                          {t.ticketNumber}
                        </Link>
                        <PriorityBadge priority={t.priority} />
                      </div>
                      <Link
                        to={`/tickets/${t.id}`}
                        className="block text-xs font-semibold text-slate-900 dark:text-white hover:text-indigo-500 line-clamp-2"
                      >
                        {t.title}
                      </Link>
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
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
                          className="w-full rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-[#090D16] px-2 py-1 text-[11px] text-slate-700 dark:text-slate-300 focus:outline-none"
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
