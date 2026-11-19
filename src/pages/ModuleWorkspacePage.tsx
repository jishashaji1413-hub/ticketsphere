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
      <div className="border-b border-zinc-200/80 dark:border-zinc-800/80 pb-5">
        {parentName && (
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            {parentName}
          </p>
        )}
        <div className="flex items-center gap-3 mt-1">
          <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 dark:bg-blue-500/15 dark:text-blue-400 dark:border-blue-500/25 flex items-center justify-center">
            <DynamicIcon name={matchedIcon} className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
              {matchedTitle}
            </h1>
            <p className="text-xs font-mono text-zinc-400">{location.pathname}</p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-[#181A1F] p-6">
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          This route is dynamically registered from your PostgreSQL module configuration. Dedicated
          feature views for Tickets, Outlook Email, Jira Integration, and Reports will attach here
          as we build Phases 5–9.
        </p>
      </div>
    </div>
  );
}
