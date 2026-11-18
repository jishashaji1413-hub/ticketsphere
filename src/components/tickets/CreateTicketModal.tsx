import { useEffect, useState, type FormEvent } from 'react';
import { Loader2, X } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { ALL_PRIORITIES, PRIORITY_LABELS } from './TicketBadges';
import type { ModuleOption, TicketPriority } from '../../types/ticket';
import type { UserProfile } from '../../types/auth';

interface CreateTicketModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function CreateTicketModal({ open, onClose, onCreated }: CreateTicketModalProps) {
  const { hasPermission } = useAuth();
  const canAssign = hasPermission('tickets.assign');

  const [modules, setModules] = useState<ModuleOption[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('IT Support');
  const [priority, setPriority] = useState<TicketPriority>('MEDIUM');
  const [projectName, setProjectName] = useState('');
  const [moduleId, setModuleId] = useState('');
  const [submoduleId, setSubmoduleId] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const loadOptions = async () => {
      try {
        const [modRes, userRes] = await Promise.all([
          api.get<{ success: boolean; data: ModuleOption[] }>('/modules/options'),
          canAssign
            ? api.get<{ success: boolean; data: UserProfile[] }>('/users', {
                params: { activeOnly: 'true' },
              })
            : Promise.resolve(null),
        ]);
        setModules(modRes.data.data);
        if (userRes) setUsers(userRes.data.data);
      } catch {
        // ignore
      }
    };
    void loadOptions();
  }, [open, canAssign]);

  if (!open) return null;

  const projectOptions = Array.from(
    new Set(modules.map((m) => m.projectName).filter((p): p is string => Boolean(p)))
  );
  const filteredModules = projectName
    ? modules.filter((m) => m.projectName === projectName)
    : modules;
  const selectedModule = filteredModules.find((m) => m.id === moduleId);
  const submodules = selectedModule?.submodules ?? [];

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post('/tickets', {
        title,
        description,
        category,
        priority,
        moduleId: moduleId || null,
        submoduleId: submoduleId || null,
        assigneeId: canAssign && assigneeId ? assigneeId : null,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      });
      setTitle('');
      setDescription('');
      setProjectName('');
      setModuleId('');
      setSubmoduleId('');
      setAssigneeId('');
      setDueDate('');
      onCreated();
      onClose();
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Failed to create ticket'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/75 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-2xl rounded-2xl bg-white border border-slate-200 dark:bg-[#111827] dark:border-slate-800 shadow-2xl p-6 my-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Create Support Ticket
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 dark:bg-rose-500/10 dark:border-rose-500/30 px-3 py-2 text-xs dark:text-rose-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
              Ticket Title
            </label>
            <input
              type="text"
              required
              minLength={3}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Unable to access VPN from remote network"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:bg-white dark:focus:bg-[#0B101B] dark:border-slate-800 dark:bg-[#090D16] px-3.5 py-2 text-sm dark:text-white focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
              Detailed Description
            </label>
            <textarea
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the issue, steps to reproduce, and impact..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:bg-white dark:focus:bg-[#0B101B] dark:border-slate-800 dark:bg-[#090D16] px-3.5 py-2 text-sm dark:text-white focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                Category
              </label>
              <input
                type="text"
                required
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:bg-white dark:focus:bg-[#0B101B] dark:border-slate-800 dark:bg-[#090D16] px-3 py-2 text-sm dark:text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TicketPriority)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 text-slate-900 dark:border-slate-800 dark:bg-[#090D16] px-3 py-2 text-sm dark:text-white focus:border-indigo-500 focus:outline-none"
              >
                {ALL_PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {PRIORITY_LABELS[p]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                Project
              </label>
              <select
                value={projectName}
                onChange={(e) => {
                  setProjectName(e.target.value);
                  setModuleId('');
                  setSubmoduleId('');
                }}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 text-slate-900 dark:border-slate-800 dark:bg-[#090D16] px-3 py-2 text-sm dark:text-white focus:border-indigo-500 focus:outline-none"
              >
                <option value="">All Projects</option>
                {projectOptions.map((proj) => (
                  <option key={proj} value={proj}>
                    {proj}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                Module {projectName ? `(${filteredModules.length})` : ''}
              </label>
              <select
                value={moduleId}
                onChange={(e) => {
                  setModuleId(e.target.value);
                  setSubmoduleId('');
                }}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 text-slate-900 dark:border-slate-800 dark:bg-[#090D16] px-3 py-2 text-sm dark:text-white focus:border-indigo-500 focus:outline-none"
              >
                <option value="">Select Module (Optional)</option>
                {filteredModules.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                Submodule {moduleId ? `(${submodules.length} available)` : ''}
              </label>
              <select
                value={submoduleId}
                disabled={!moduleId || submodules.length === 0}
                onChange={(e) => setSubmoduleId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 text-slate-900 disabled:opacity-50 dark:border-slate-800 dark:bg-[#090D16] px-3 py-2 text-sm dark:text-white focus:border-indigo-500 focus:outline-none"
              >
                <option value="">
                  {!moduleId
                    ? 'Select a Module first'
                    : submodules.length === 0
                      ? 'No submodules in this module'
                      : 'Select Submodule'}
                </option>
                {submodules.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {canAssign && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                  Assignee
                </label>
                <select
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 text-slate-900 dark:border-slate-800 dark:bg-[#090D16] px-3 py-2 text-sm dark:text-white focus:border-indigo-500 focus:outline-none"
                >
                  <option value="">Unassigned</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.displayName} ({u.email})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 text-slate-900 dark:border-slate-800 dark:bg-[#090D16] px-3 py-2 text-sm dark:text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 px-4 py-2 text-sm font-medium dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2 text-sm font-semibold text-white hover:from-indigo-500 hover:to-violet-500 disabled:opacity-60 inline-flex items-center gap-2"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Create Ticket
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
