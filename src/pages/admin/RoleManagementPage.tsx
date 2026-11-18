import { useCallback, useEffect, useState } from 'react';
import { Check, KeyRound, Loader2 } from 'lucide-react';
import { api } from '../../lib/api';
import type { PermissionItem, RoleWithPermissions } from '../../types/auth';

export default function RoleManagementPage() {
  const [roles, setRoles] = useState<RoleWithPermissions[]>([]);
  const [permissions, setPermissions] = useState<PermissionItem[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [checkedPermIds, setCheckedPermIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [rolesRes, permsRes] = await Promise.all([
        api.get<{ success: boolean; data: RoleWithPermissions[] }>('/roles'),
        api.get<{ success: boolean; data: PermissionItem[] }>('/roles/permissions'),
      ]);
      const fetchedRoles = rolesRes.data.data;
      setRoles(fetchedRoles);
      setPermissions(permsRes.data.data);

      if (fetchedRoles.length > 0 && !selectedRoleId) {
        setSelectedRoleId(fetchedRoles[0].id);
        setCheckedPermIds(fetchedRoles[0].permissions.map((p) => p.id));
      }
    } finally {
      setLoading(false);
    }
  }, [selectedRoleId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const selectRole = (role: RoleWithPermissions) => {
    setSelectedRoleId(role.id);
    setCheckedPermIds(role.permissions.map((p) => p.id));
    setSavedNotice(false);
  };

  const togglePerm = (id: string) => {
    setCheckedPermIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
    setSavedNotice(false);
  };

  const handleSavePermissions = async () => {
    if (!selectedRoleId) return;
    setSaving(true);
    setSavedNotice(false);
    try {
      await api.put(`/roles/${selectedRoleId}/permissions`, { permissionIds: checkedPermIds });
      await loadData();
      setSavedNotice(true);
    } finally {
      setSaving(false);
    }
  };

  const groupedPermissions = permissions.reduce<Record<string, PermissionItem[]>>((acc, perm) => {
    if (!acc[perm.category]) acc[perm.category] = [];
    acc[perm.category].push(perm);
    return acc;
  }, {});

  const selectedRole = roles.find((r) => r.id === selectedRoleId);

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200/80 dark:border-slate-800/80 pb-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
          Access Control
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
          Role &amp; Permission Management
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Configure granular permissions assigned to each enterprise role.
        </p>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#111827] p-10 text-center text-slate-500 dark:text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin inline mr-2 text-indigo-600 dark:text-indigo-400" />
          Loading roles and permissions...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#111827] p-4 space-y-2 h-fit">
            <h2 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-2 pb-1">
              Roles
            </h2>
            {roles.map((role) => (
              <button
                key={role.id}
                type="button"
                onClick={() => selectRole(role)}
                className={`w-full text-left rounded-xl px-3.5 py-3 transition border ${
                  role.id === selectedRoleId
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-950 dark:bg-indigo-500/15 dark:border-indigo-500/40 dark:text-white'
                    : 'border-transparent hover:bg-slate-50 text-slate-700 dark:hover:bg-white/[0.03] dark:text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm flex items-center gap-2">
                    <KeyRound className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    {role.name}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                    {role.userCount} users
                  </span>
                </div>
                {role.description && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                    {role.description}
                  </p>
                )}
              </button>
            ))}
          </div>

          <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#111827] p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                  {selectedRole?.name} Permissions
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {checkedPermIds.length} of {permissions.length} permissions enabled
                </p>
              </div>
              <div className="flex items-center gap-3">
                {savedNotice && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    <Check className="h-4 w-4" />
                    Saved
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => void handleSavePermissions()}
                  disabled={saving}
                  className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2 text-sm font-semibold text-white hover:from-indigo-500 hover:to-violet-500 disabled:opacity-60 inline-flex items-center gap-2"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save Permissions
                </button>
              </div>
            </div>

            <div className="mt-5 space-y-6">
              {Object.entries(groupedPermissions).map(([category, perms]) => (
                <div key={category}>
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2.5">
                    {category}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {perms.map((perm) => (
                      <label
                        key={perm.id}
                        className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:border-slate-300 dark:border-slate-800 dark:bg-[#090D16] p-3 cursor-pointer dark:hover:border-slate-700 transition"
                      >
                        <input
                          type="checkbox"
                          checked={checkedPermIds.includes(perm.id)}
                          onChange={() => togglePerm(perm.id)}
                          className="mt-0.5 rounded border-slate-300 dark:border-slate-700 dark:bg-slate-900 text-indigo-600 focus:ring-indigo-500"
                        />
                        <div>
                          <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                            {perm.name}
                          </p>
                          <p className="text-xs text-slate-500">{perm.description}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
