import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Inbox,
  Layers,
  Loader2,
  PauseCircle,
  PlayCircle,
  Ticket as TicketIcon,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { PriorityBadge, StatusBadge } from '../components/tickets/TicketBadges';
import type { TicketPriority, TicketStatus } from '../types/ticket';

interface DashboardOverview {
  kpis: {
    totalTickets: number;
    notStarted: number;
    inProgress: number;
    pending: number;
    completed: number;
    cancelled: number;
    overdueTickets: number;
    myAssignedTickets: number;
  };
  charts: {
    byStatus: Array<{ name: string; key: string; count: number }>;
    byPriority: Array<{ name: string; count: number }>;
    byModule: Array<{ name: string; count: number }>;
    bySubmodule: Array<{ name: string; count: number }>;
    byUser: Array<{ name: string; total: number; completed: number }>;
    monthlyTrends: Array<{ key: string; label: string; created: number; completed: number }>;
  };
  recentTickets: Array<{
    id: string;
    ticketNumber: string;
    title: string;
    status: TicketStatus;
    priority: TicketPriority;
    createdAt: string;
    assignee: { displayName: string } | null;
  }>;
}

const CHART_COLORS = ['#6366f1', '#0ea5e9', '#f59e0b', '#10b981', '#f43f5e', '#8b5cf6'];

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get<{ success: boolean; data: DashboardOverview }>(
          '/dashboard/overview'
        );
        setData(res.data.data);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  if (loading) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-[#181A1F] p-12 text-center text-zinc-400">
        <Loader2 className="h-5 w-5 animate-spin inline mr-2 text-blue-500" />
        Loading live analytics...
      </div>
    );
  }

  const kpis = data?.kpis ?? {
    totalTickets: 0,
    notStarted: 0,
    inProgress: 0,
    pending: 0,
    completed: 0,
    cancelled: 0,
    overdueTickets: 0,
    myAssignedTickets: 0,
  };

  const kpiCards = [
    { label: 'Total Tickets', value: kpis.totalTickets, icon: TicketIcon, color: 'text-blue-500', to: '/tickets' },
    { label: 'Not Started', value: kpis.notStarted, icon: Clock, color: 'text-zinc-400', to: '/tickets/not-started' },
    { label: 'In Progress', value: kpis.inProgress, icon: PlayCircle, color: 'text-sky-500', to: '/tickets/in-progress' },
    { label: 'Pending', value: kpis.pending, icon: PauseCircle, color: 'text-amber-500', to: '/tickets/pending' },
    { label: 'Completed', value: kpis.completed, icon: CheckCircle2, color: 'text-emerald-500', to: '/tickets/completed' },
    { label: 'Overdue', value: kpis.overdueTickets, icon: AlertTriangle, color: 'text-rose-500', to: '/tickets/overdue' },
    { label: 'My Assigned', value: kpis.myAssignedTickets, icon: Inbox, color: 'text-violet-500', to: '/tickets/assigned' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 border-b border-zinc-200/80 dark:border-zinc-800/80 pb-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            Command Center
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white mt-1">
            Service Desk Analytics
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Real-time metrics for {user?.displayName} ({user?.roles.map((r) => r.name).join(', ')})
          </p>
        </div>
        <Link
          to="/tickets"
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-sky-600 px-4 py-2 text-xs font-semibold text-white hover:from-blue-500 hover:to-sky-500 transition"
        >
          <Layers className="h-4 w-4" />
          Open Ticket Queue
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3.5">
        {kpiCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.label}
              to={card.to}
              style={{ animationDelay: `${idx * 40}ms` }}
              className="block animate-fade-up ts-card-hover rounded-lg border border-zinc-200/90 bg-gradient-to-b from-white to-zinc-50/60 dark:border-zinc-800/90 dark:from-[#181A1F] dark:to-[#14161B] p-4 shadow-2xs hover:border-blue-500/40"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  {card.label}
                </span>
                <Icon className={`h-4 w-4 ${card.color}`} />
              </div>
              <p className="mt-2.5 text-2xl font-bold text-zinc-900 dark:text-white font-mono">
                {card.value}
              </p>
            </Link>
          );
        })}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-[#181A1F] p-5">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-white mb-4">
            Tickets by Status
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data?.charts.byStatus ?? []}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={88}
                  paddingAngle={3}
                >
                  {(data?.charts.byStatus ?? []).map((_, idx) => (
                    <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-[#181A1F] p-5">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-white mb-4">
            Tickets Created vs Completed (Monthly Trend)
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data?.charts.monthlyTrends ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="created" name="Created" stroke="#6366f1" strokeWidth={2} />
                <Line type="monotone" dataKey="completed" name="Completed" stroke="#10b981" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-[#181A1F] p-5">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-white mb-4">
            Tickets by Priority
          </h2>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.charts.byPriority ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#6366f1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-[#181A1F] p-5">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-white mb-4">
            Tickets by Module
          </h2>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.charts.byModule ?? []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#0ea5e9" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-[#181A1F] p-5">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-white mb-4">
            User-wise Distribution
          </h2>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.charts.byUser ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="total" name="Total" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="completed" name="Completed" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Tickets */}
      <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-[#181A1F] overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Recent Tickets</h2>
          <Link to="/tickets" className="text-xs font-medium text-blue-500 hover:underline">
            View all
          </Link>
        </div>
        <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {(data?.recentTickets ?? []).length === 0 ? (
            <p className="p-6 text-center text-xs text-zinc-400">
              No tickets created yet. Create your first ticket to see live analytics.
            </p>
          ) : (
            data?.recentTickets.map((t) => (
              <Link
                key={t.id}
                to={`/tickets/${t.id}`}
                className="px-5 py-3 flex items-center justify-between gap-4 hover:bg-zinc-50 dark:hover:bg-white/[0.02] transition"
              >
                <div className="min-w-0 flex items-center gap-3">
                  <span className="font-mono text-xs font-semibold text-blue-500">
                    {t.ticketNumber}
                  </span>
                  <span className="text-sm font-medium text-zinc-900 dark:text-white truncate">
                    {t.title}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <PriorityBadge priority={t.priority} />
                  <StatusBadge status={t.status} />
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
