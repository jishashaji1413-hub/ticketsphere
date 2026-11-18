import { CheckCircle2, KeyRound, Layers, ShieldCheck, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function DashboardPlaceholderPage() {
  const { user, hasPermission } = useAuth();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800/80 pb-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            Command Center
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
            Welcome back, {user?.displayName}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {user?.email} • Active roles:{' '}
            <span className="font-medium text-slate-800 dark:text-slate-200">
              {user?.roles.map((r) => r.name).join(', ')}
            </span>
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 px-3 py-1 text-xs font-medium dark:text-emerald-300">
          <span className="h-2 w-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
          PostgreSQL &amp; RBAC Active
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-200/90 bg-white dark:border-slate-800/90 dark:bg-[#111827] p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Assigned Permissions
            </span>
            <ShieldCheck className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900 dark:text-white font-mono">
            {user?.permissions.length ?? 0}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Enforced on backend &amp; UI routes
          </p>
        </div>

        {hasPermission('users.manage') && (
          <Link
            to="/admin/users"
            className="group rounded-2xl border border-slate-200/90 bg-white hover:border-indigo-300 dark:border-slate-800/90 dark:bg-[#111827] p-5 dark:hover:border-indigo-500/50 dark:hover:bg-[#141D2F] transition shadow-2xs"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                User Directory
              </span>
              <Users className="h-4 w-4 text-slate-400 group-hover:text-indigo-600 dark:text-slate-500 dark:group-hover:text-indigo-400 transition" />
            </div>
            <p className="mt-3 text-base font-semibold text-slate-900 group-hover:text-indigo-700 dark:text-white dark:group-hover:text-indigo-300">
              Manage Users &amp; Status
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Create accounts and assign roles
            </p>
          </Link>
        )}

        {hasPermission('roles.manage') && (
          <Link
            to="/admin/roles"
            className="group rounded-2xl border border-slate-200/90 bg-white hover:border-indigo-300 dark:border-slate-800/90 dark:bg-[#111827] p-5 dark:hover:border-indigo-500/50 dark:hover:bg-[#141D2F] transition shadow-2xs"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Access Control
              </span>
              <KeyRound className="h-4 w-4 text-slate-400 group-hover:text-indigo-600 dark:text-slate-500 dark:group-hover:text-indigo-400 transition" />
            </div>
            <p className="mt-3 text-base font-semibold text-slate-900 group-hover:text-indigo-700 dark:text-white dark:group-hover:text-indigo-300">
              Role &amp; Permission Matrix
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Configure granular RBAC rules
            </p>
          </Link>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200/90 bg-white dark:border-slate-800/90 dark:bg-[#111827] p-6 shadow-2xs">
        <div className="flex items-start gap-3.5">
          <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white shrink-0">
            <Layers className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Ready for Phase 4 — Dynamic Module Management
              </h2>
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              Live ticket KPIs and Recharts analytics will populate here automatically once Ticket
              Management (Phase 5) and Dashboard Analytics (Phase 9) are connected to PostgreSQL.
            </p>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {user?.permissions.map((perm) => (
                <span
                  key={perm}
                  className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-[#090D16] px-2 py-0.5 text-[11px] font-mono dark:text-slate-300"
                >
                  {perm}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
