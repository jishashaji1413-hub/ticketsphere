import { useLocation } from 'react-router-dom';
import { useNavigation } from '../context/NavigationContext';
import { DynamicIcon } from '../utils/iconMap';

export default function ModuleWorkspacePage() {
  const location = useLocation();
  const { modules } = useNavigation();

  let matchedTitle = 'Module Workspace';
  let matchedIcon = 'Layers';
  let parentName = '';

  for (const mod of modules) {
    const sub = mod.submodules.find((s) => s.route === location.pathname);
    if (sub) {
      matchedTitle = sub.name;
      matchedIcon = sub.icon;
      parentName = mod.name;
      break;
    }
    if (mod.route === location.pathname) {
      matchedTitle = mod.name;
      matchedIcon = mod.icon;
      break;
    }
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200/80 dark:border-slate-800/80 pb-5">
        {parentName && (
          <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            {parentName}
          </p>
        )}
        <div className="flex items-center gap-3 mt-1">
          <div className="h-9 w-9 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200 dark:bg-indigo-500/15 dark:text-indigo-400 dark:border-indigo-500/25 flex items-center justify-center">
            <DynamicIcon name={matchedIcon} className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {matchedTitle}
            </h1>
            <p className="text-xs font-mono text-slate-400">{location.pathname}</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#111827] p-6">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          This route is dynamically registered from your PostgreSQL module configuration. Dedicated
          feature views for Tickets, Outlook Email, Jira Integration, and Reports will attach here
          as we build Phases 5–9.
        </p>
      </div>
    </div>
  );
}
