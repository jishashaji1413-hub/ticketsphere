import { useEffect, useState } from 'react';
import { BarChart3, Download, Layers, Loader2, Users } from 'lucide-react';
import { api } from '../../lib/api';

interface ReportOverview {
  kpis: {
    totalTickets: number;
    notStarted: number;
    inProgress: number;
    pending: number;
    completed: number;
    cancelled: number;
    overdueTickets: number;
  };
  charts: {
    byStatus: Array<{ name: string; count: number }>;
    byPriority: Array<{ name: string; count: number }>;
    byModule: Array<{ name: string; count: number }>;
    bySubmodule: Array<{ name: string; count: number }>;
    byUser: Array<{ name: string; total: number; completed: number }>;
  };
}

export default function ReportsPage({
  section = 'tickets',
}: {
  section?: 'tickets' | 'users' | 'modules';
}) {
  const [data, setData] = useState<ReportOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get<{ success: boolean; data: ReportOverview }>('/dashboard/overview');
        setData(res.data.data);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const exportCsv = () => {
    if (!data) return;
    let rows: string[][] = [];

    if (section === 'tickets') {
      rows = [
        ['Category', 'Label', 'Count'],
        ...data.charts.byStatus.map((s) => ['Status', s.name, String(s.count)]),
        ...data.charts.byPriority.map((p) => ['Priority', p.name, String(p.count)]),
      ];
    } else if (section === 'users') {
      rows = [
        ['Assignee', 'Total Tickets', 'Completed', 'Completion %'],
        ...data.charts.byUser.map((u) => [
          u.name,
          String(u.total),
          String(u.completed),
          u.total > 0 ? `${Math.round((u.completed / u.total) * 100)}%` : '0%',
        ]),
      ];
    } else {
      rows = [
        ['Level', 'Name', 'Tickets'],
        ...data.charts.byModule.map((m) => ['Module', m.name, String(m.count)]),
        ...data.charts.bySubmodule.map((s) => ['Submodule', s.name, String(s.count)]),
      ];
    }

    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ticketsphere-${section}-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const titleMap = {
    tickets: 'Ticket Operational Reports',
    users: 'User Performance Reports',
    modules: 'Module & Submodule Reports',
  };

  const subtitleMap = {
    tickets: 'Status, priority, and overdue ticket metrics.',
    users: 'Agent workload, completion volume, and resolution rates.',
    modules: 'Ticket volume across CFSS & Asset Management modules and submodules.',
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            Reports
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white mt-1">
            {titleMap[section]}
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">{subtitleMap[section]}</p>
        </div>
        <button
          type="button"
          onClick={exportCsv}
          disabled={!data}
          className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-sky-600 px-4 py-2 text-xs font-semibold text-white hover:from-blue-500 hover:to-sky-500 disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      {loading ? (
        <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-[#181A1F] p-12 text-center text-zinc-400">
          <Loader2 className="h-5 w-5 animate-spin inline mr-2 text-blue-500" />
          Generating report...
        </div>
      ) : section === 'tickets' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-[#181A1F] overflow-hidden">
            <div className="px-5 py-3.5 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-blue-500" />
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
                Tickets by Status
              </h2>
            </div>
            <div className="p-5 space-y-2.5 text-xs">
              {data?.charts.byStatus.map((s) => (
                <div
                  key={s.name}
                  className="flex items-center justify-between py-1.5 border-b border-zinc-100 dark:border-zinc-800/70"
                >
                  <span className="text-zinc-700 dark:text-zinc-300">{s.name}</span>
                  <span className="font-mono font-semibold text-zinc-900 dark:text-white">
                    {s.count}
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between pt-2 text-rose-600 dark:text-rose-400 font-medium">
                <span>Overdue Tickets</span>
                <span className="font-mono font-semibold">{data?.kpis.overdueTickets ?? 0}</span>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-[#181A1F] overflow-hidden">
            <div className="px-5 py-3.5 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-blue-500" />
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
                Tickets by Priority
              </h2>
            </div>
            <div className="p-5 space-y-2.5 text-xs">
              {data?.charts.byPriority.map((p) => (
                <div
                  key={p.name}
                  className="flex items-center justify-between py-1.5 border-b border-zinc-100 dark:border-zinc-800/70"
                >
                  <span className="text-zinc-700 dark:text-zinc-300">{p.name}</span>
                  <span className="font-mono font-semibold text-zinc-900 dark:text-white">
                    {p.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : section === 'users' ? (
        <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-[#181A1F] overflow-hidden">
          <div className="px-5 py-3.5 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-2">
            <Users className="h-4 w-4 text-blue-500" />
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
              Agent &amp; User Performance
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 dark:bg-[#16181D] text-zinc-500 uppercase tracking-wider border-b border-zinc-200 dark:border-zinc-800">
                <tr>
                  <th className="px-5 py-3">User</th>
                  <th className="px-5 py-3">Total Assigned</th>
                  <th className="px-5 py-3">Completed</th>
                  <th className="px-5 py-3">Completion Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {(data?.charts.byUser ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-center text-zinc-400">
                      No user ticket data yet.
                    </td>
                  </tr>
                ) : (
                  data?.charts.byUser.map((u) => {
                    const pct = u.total > 0 ? Math.round((u.completed / u.total) * 100) : 0;
                    return (
                      <tr key={u.name}>
                        <td className="px-5 py-3 font-medium text-zinc-900 dark:text-white">
                          {u.name}
                        </td>
                        <td className="px-5 py-3 font-mono text-zinc-600 dark:text-zinc-300">
                          {u.total}
                        </td>
                        <td className="px-5 py-3 font-mono text-emerald-600 dark:text-emerald-400">
                          {u.completed}
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-24 h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
                              <div
                                className="h-full bg-blue-600 rounded-full"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="font-mono text-zinc-500 dark:text-zinc-400">
                              {pct}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-[#181A1F] overflow-hidden">
          <div className="px-5 py-3.5 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-2">
            <Layers className="h-4 w-4 text-blue-500" />
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
              Module &amp; Submodule Distribution
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-zinc-200 dark:divide-zinc-800">
            <div className="p-5 space-y-2 text-xs">
              <p className="font-semibold uppercase tracking-wider text-zinc-400 mb-2">By Module</p>
              {(data?.charts.byModule ?? []).length === 0 ? (
                <p className="text-zinc-400">No module ticket data yet.</p>
              ) : (
                data?.charts.byModule.map((m) => (
                  <div
                    key={m.name}
                    className="flex justify-between py-1.5 border-b border-zinc-100 dark:border-zinc-800/70"
                  >
                    <span className="text-zinc-700 dark:text-zinc-300">{m.name}</span>
                    <span className="font-mono font-semibold text-zinc-900 dark:text-white">
                      {m.count}
                    </span>
                  </div>
                ))
              )}
            </div>
            <div className="p-5 space-y-2 text-xs">
              <p className="font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                By Submodule
              </p>
              {(data?.charts.bySubmodule ?? []).length === 0 ? (
                <p className="text-zinc-400">No submodule ticket data yet.</p>
              ) : (
                data?.charts.bySubmodule.map((s) => (
                  <div
                    key={s.name}
                    className="flex justify-between py-1.5 border-b border-zinc-100 dark:border-zinc-800/70"
                  >
                    <span className="text-zinc-700 dark:text-zinc-300">{s.name}</span>
                    <span className="font-mono font-semibold text-zinc-900 dark:text-white">
                      {s.count}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
