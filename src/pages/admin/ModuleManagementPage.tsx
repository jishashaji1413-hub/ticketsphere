import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Edit2,
  Eye,
  EyeOff,
  Loader2,
  Plus,
  Power,
  Trash2,
  X,
} from 'lucide-react';
import { api } from '../../lib/api';
import { useNavigation } from '../../context/NavigationContext';
import { AVAILABLE_ICONS, DynamicIcon } from '../../utils/iconMap';
import type { PermissionItem, RoleWithPermissions } from '../../types/auth';
import type { ModuleAdminItem, SubmoduleAdminItem } from '../../types/module';

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

type ModalTarget =
  | { kind: 'module'; editing: ModuleAdminItem | null }
  | { kind: 'submodule'; moduleId: string; moduleName: string; editing: SubmoduleAdminItem | null };

export default function ModuleManagementPage() {
  const { refreshNavigation } = useNavigation();
  const [modules, setModules] = useState<ModuleAdminItem[]>([]);
  const [roles, setRoles] = useState<RoleWithPermissions[]>([]);
  const [permissions, setPermissions] = useState<PermissionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  const [modalTarget, setModalTarget] = useState<ModalTarget | null>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('Folder');
  const [route, setRoute] = useState('');
  const [sortOrder, setSortOrder] = useState(0);
  const [isEnabled, setIsEnabled] = useState(true);
  const [isVisible, setIsVisible] = useState(true);
  const [requiredPermissionCode, setRequiredPermissionCode] = useState('');
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [modsRes, rolesRes, permsRes] = await Promise.all([
        api.get<{ success: boolean; data: ModuleAdminItem[] }>('/modules'),
        api.get<{ success: boolean; data: RoleWithPermissions[] }>('/roles'),
        api.get<{ success: boolean; data: PermissionItem[] }>('/roles/permissions'),
      ]);
      setModules(modsRes.data.data);
      setRoles(rolesRes.data.data);
      setPermissions(permsRes.data.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const openModuleModal = (editing: ModuleAdminItem | null) => {
    setModalTarget({ kind: 'module', editing });
    if (editing) {
      setName(editing.name);
      setSlug(editing.slug);
      setDescription(editing.description ?? '');
      setIcon(editing.icon);
      setRoute(editing.route);
      setSortOrder(editing.sortOrder);
      setIsEnabled(editing.isEnabled);
      setIsVisible(editing.isVisible);
      setRequiredPermissionCode(editing.requiredPermissionCode ?? '');
      setSelectedRoleIds(editing.roles.map((r) => r.id));
    } else {
      setName('');
      setSlug('');
      setDescription('');
      setIcon('Folder');
      setRoute('/');
      setSortOrder(modules.length + 1);
      setIsEnabled(true);
      setIsVisible(true);
      setRequiredPermissionCode('');
      setSelectedRoleIds(roles.map((r) => r.id));
    }
    setError(null);
  };

  const openSubmoduleModal = (
    mod: ModuleAdminItem,
    editing: SubmoduleAdminItem | null
  ) => {
    setModalTarget({ kind: 'submodule', moduleId: mod.id, moduleName: mod.name, editing });
    if (editing) {
      setName(editing.name);
      setSlug(editing.slug);
      setDescription(editing.description ?? '');
      setIcon(editing.icon);
      setRoute(editing.route);
      setSortOrder(editing.sortOrder);
      setIsEnabled(editing.isEnabled);
      setIsVisible(editing.isVisible);
      setRequiredPermissionCode(editing.requiredPermissionCode ?? '');
      setSelectedRoleIds(editing.roles.map((r) => r.id));
    } else {
      setName('');
      setSlug('');
      setDescription('');
      setIcon('FileText');
      setRoute(`${mod.route}/`);
      setSortOrder(mod.submodules.length + 1);
      setIsEnabled(true);
      setIsVisible(true);
      setRequiredPermissionCode(mod.requiredPermissionCode ?? '');
      setSelectedRoleIds(mod.roles.map((r) => r.id));
    }
    setError(null);
  };

  const toggleRole = (roleId: string) => {
    setSelectedRoleIds((prev) =>
      prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId]
    );
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!modalTarget) return;
    setError(null);
    setSubmitting(true);

    const payload = {
      name,
      slug,
      description: description || null,
      icon,
      route,
      sortOrder: Number(sortOrder),
      isEnabled,
      isVisible,
      requiredPermissionCode: requiredPermissionCode || null,
      roleIds: selectedRoleIds,
    };

    try {
      if (modalTarget.kind === 'module') {
        if (modalTarget.editing) {
          await api.patch(`/modules/${modalTarget.editing.id}`, payload);
        } else {
          await api.post('/modules', payload);
        }
      } else {
        if (modalTarget.editing) {
          await api.patch(`/modules/submodules/${modalTarget.editing.id}`, payload);
        } else {
          await api.post(`/modules/${modalTarget.moduleId}/submodules`, payload);
          setExpandedIds((prev) => ({ ...prev, [modalTarget.moduleId]: true }));
        }
      }
      setModalTarget(null);
      await Promise.all([loadData(), refreshNavigation()]);
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Failed to save configuration'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const quickToggleModule = async (mod: ModuleAdminItem, field: 'isEnabled' | 'isVisible') => {
    await api.patch(`/modules/${mod.id}`, { [field]: !mod[field] });
    await Promise.all([loadData(), refreshNavigation()]);
  };

  const deleteModule = async (mod: ModuleAdminItem) => {
    if (!window.confirm(`Delete module "${mod.name}" and its submodules?`)) return;
    await api.delete(`/modules/${mod.id}`);
    await Promise.all([loadData(), refreshNavigation()]);
  };

  const deleteSubmodule = async (sub: SubmoduleAdminItem) => {
    if (!window.confirm(`Delete submodule "${sub.name}"?`)) return;
    await api.delete(`/modules/submodules/${sub.id}`);
    await Promise.all([loadData(), refreshNavigation()]);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-200/80 dark:border-zinc-800/80 pb-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            Administration
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white mt-1">
            Module &amp; Submodule Management
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Configure sidebar modules, icons, menu order, visibility, and role permissions live.
          </p>
        </div>
        <button
          type="button"
          onClick={() => openModuleModal(null)}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-sky-600 px-4 py-2 text-sm font-semibold text-white hover:from-blue-500 hover:to-sky-500 transition shadow-xs"
        >
          <Plus className="h-4 w-4" />
          Add Module
        </button>
      </div>

      {loading ? (
        <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-[#181A1F] p-12 text-center text-zinc-500 dark:text-zinc-400">
          <Loader2 className="h-5 w-5 animate-spin inline mr-2 text-blue-600 dark:text-blue-400" />
          Loading modules...
        </div>
      ) : (
        <div className="space-y-3">
          {modules.map((mod) => {
            const expanded = Boolean(expandedIds[mod.id]);
            return (
              <div
                key={mod.id}
                className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-[#181A1F] overflow-hidden shadow-2xs"
              >
                <div className="p-4 sm:px-5 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={() => toggleExpand(mod.id)}
                      className="h-7 w-7 rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-500 hover:text-zinc-800 dark:border-zinc-800 dark:bg-[#111215] dark:text-zinc-400 dark:hover:text-white flex items-center justify-center shrink-0"
                    >
                      {expanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </button>
                    <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 dark:bg-blue-500/15 dark:text-blue-400 dark:border-blue-500/25 flex items-center justify-center shrink-0">
                      <DynamicIcon name={mod.icon} className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-sm text-zinc-900 dark:text-white">
                          {mod.name}
                        </span>
                        <span className="rounded bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 px-1.5 py-0.5 text-[10px] font-mono">
                          #{mod.sortOrder}
                        </span>
                        <span className="text-xs font-mono text-zinc-400">{mod.route}</span>
                        {!mod.isEnabled && (
                          <span className="rounded-full bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/25 px-2 py-0.5 text-[10px] font-medium">
                            Disabled
                          </span>
                        )}
                        {!mod.isVisible && (
                          <span className="rounded-full bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/25 px-2 py-0.5 text-[10px] font-medium">
                            Hidden
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        {mod.roles.map((r) => (
                          <span
                            key={r.id}
                            className="rounded bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300 px-1.5 py-0.5 text-[10px] font-medium"
                          >
                            {r.name}
                          </span>
                        ))}
                        {mod.requiredPermissionCode && (
                          <span className="text-[10px] font-mono text-zinc-400">
                            perm: {mod.requiredPermissionCode}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => openSubmoduleModal(mod, null)}
                      className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300 dark:hover:bg-blue-500/20 px-2.5 py-1.5 text-xs font-medium"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Submodule ({mod.submodules.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => void quickToggleModule(mod, 'isEnabled')}
                      title={mod.isEnabled ? 'Disable module' : 'Enable module'}
                      className={`p-1.5 rounded-lg border transition ${
                        mod.isEnabled
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300'
                          : 'border-zinc-200 bg-zinc-50 text-zinc-400 dark:border-zinc-800 dark:bg-[#111215]'
                      }`}
                    >
                      <Power className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => void quickToggleModule(mod, 'isVisible')}
                      title={mod.isVisible ? 'Hide from sidebar' : 'Show in sidebar'}
                      className="p-1.5 rounded-lg border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-[#111215] dark:text-zinc-300 dark:hover:bg-zinc-800"
                    >
                      {mod.isVisible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => openModuleModal(mod)}
                      className="p-1.5 rounded-lg border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-[#111215] dark:text-zinc-300 dark:hover:bg-zinc-800"
                      title="Edit module"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => void deleteModule(mod)}
                      className="p-1.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-500/20"
                      title="Delete module"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {expanded && (
                  <div className="border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-[#14161A] px-5 py-3 space-y-2">
                    {mod.submodules.length === 0 ? (
                      <p className="text-xs text-zinc-400 py-2">
                        No submodules configured under {mod.name}.
                      </p>
                    ) : (
                      mod.submodules.map((sub) => (
                        <div
                          key={sub.id}
                          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white dark:border-zinc-800/80 dark:bg-[#181A1F] px-3.5 py-2.5"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <DynamicIcon name={sub.icon} className="h-4 w-4 text-blue-500 shrink-0" />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-zinc-900 dark:text-white">
                                  {sub.name}
                                </span>
                                <span className="text-[10px] font-mono text-zinc-400">
                                  #{sub.sortOrder} • {sub.route}
                                </span>
                                {!sub.isEnabled && (
                                  <span className="text-[10px] text-rose-500 font-medium">
                                    (Disabled)
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-1 mt-0.5">
                                {sub.roles.map((r) => (
                                  <span
                                    key={r.id}
                                    className="text-[10px] text-zinc-500 dark:text-zinc-400"
                                  >
                                    {r.name}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => openSubmoduleModal(mod, sub)}
                              className="p-1.5 rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800"
                              title="Edit submodule"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => void deleteSubmodule(sub)}
                              className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-500/30 dark:text-rose-400 dark:hover:bg-rose-500/10"
                              title="Delete submodule"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {modalTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/75 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-lg bg-white border border-zinc-200 dark:bg-[#181A1F] dark:border-zinc-800 shadow-2xl p-6 my-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
                {modalTarget.kind === 'module'
                  ? modalTarget.editing
                    ? 'Edit Module'
                    : 'Add New Module'
                  : modalTarget.editing
                    ? `Edit Submodule (${modalTarget.moduleName})`
                    : `Add Submodule to ${modalTarget.moduleName}`}
              </h2>
              <button
                type="button"
                onClick={() => setModalTarget(null)}
                className="text-zinc-400 hover:text-zinc-700 dark:hover:text-white"
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1">
                    Menu Name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => {
                      const val = e.target.value;
                      setName(val);
                      if (!modalTarget.editing) {
                        setSlug(slugify(val));
                      }
                    }}
                    placeholder="e.g. Asset Management"
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-900 focus:bg-white dark:focus:bg-[#111215] dark:border-zinc-800 dark:bg-[#111215] px-3 py-2 text-sm dark:text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1">
                    Slug
                  </label>
                  <input
                    type="text"
                    required
                    value={slug}
                    onChange={(e) => setSlug(slugify(e.target.value))}
                    placeholder="asset-management"
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-900 focus:bg-white dark:focus:bg-[#111215] dark:border-zinc-800 dark:bg-[#111215] px-3 py-2 text-sm font-mono dark:text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1">
                    Route Path
                  </label>
                  <input
                    type="text"
                    required
                    value={route}
                    onChange={(e) => setRoute(e.target.value)}
                    placeholder="/assets"
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-900 focus:bg-white dark:focus:bg-[#111215] dark:border-zinc-800 dark:bg-[#111215] px-3 py-2 text-sm font-mono dark:text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1">
                    Menu Order
                  </label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={sortOrder}
                    onChange={(e) => setSortOrder(Number(e.target.value))}
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-900 focus:bg-white dark:focus:bg-[#111215] dark:border-zinc-800 dark:bg-[#111215] px-3 py-2 text-sm dark:text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1">
                  Required Permission (Optional)
                </label>
                <select
                  value={requiredPermissionCode}
                  onChange={(e) => setRequiredPermissionCode(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-900 dark:border-zinc-800 dark:bg-[#111215] px-3 py-2 text-sm dark:text-white focus:border-blue-500 focus:outline-none"
                >
                  <option value="">None (Role-based only)</option>
                  {permissions.map((p) => (
                    <option key={p.id} value={p.code}>
                      {p.category}: {p.name} ({p.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1.5">
                  Menu Icon ({icon})
                </label>
                <div className="grid grid-cols-9 sm:grid-cols-12 gap-1.5 max-h-32 overflow-y-auto p-2 rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-[#111215]">
                  {AVAILABLE_ICONS.map((iconName) => (
                    <button
                      key={iconName}
                      type="button"
                      onClick={() => setIcon(iconName)}
                      title={iconName}
                      className={`h-8 w-8 rounded-lg flex items-center justify-center transition ${
                        icon === iconName
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-zinc-500 hover:bg-zinc-200/70 dark:text-zinc-400 dark:hover:bg-zinc-800'
                      }`}
                    >
                      <DynamicIcon name={iconName} className="h-4 w-4" />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1.5">
                  Visible to Roles (leave all unchecked for any role)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {roles.map((r) => (
                    <label
                      key={r.id}
                      className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-[#111215] px-3 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-200 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedRoleIds.includes(r.id)}
                        onChange={() => toggleRole(r.id)}
                        className="rounded border-zinc-300 dark:border-zinc-700 text-blue-600"
                      />
                      <span>{r.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-6 pt-1">
                <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isEnabled}
                    onChange={(e) => setIsEnabled(e.target.checked)}
                    className="rounded border-zinc-300 dark:border-zinc-700 text-blue-600"
                  />
                  Module Enabled
                </label>
                <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isVisible}
                    onChange={(e) => setIsVisible(e.target.checked)}
                    className="rounded border-zinc-300 dark:border-zinc-700 text-blue-600"
                  />
                  Visible in Sidebar
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalTarget(null)}
                  className="rounded-xl border border-zinc-200 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 px-4 py-2 text-sm font-medium dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-gradient-to-r from-blue-600 to-sky-600 px-4 py-2 text-sm font-semibold text-white hover:from-blue-500 hover:to-sky-500 disabled:opacity-60 inline-flex items-center gap-2"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save Configuration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
