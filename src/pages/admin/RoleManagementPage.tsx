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
      <div className="border-b border-zinc-200/80 dark:border-zinc-800/80 pb-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
          Access Control
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white mt-1">
          Role &amp; Permission Management
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Configure granular permissions assigned to each enterprise role.
        </p>
      </div>

      {loading ? (
        <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-[#181A1F] p-10 text-center text-zinc-500 dark:text-zinc-400">
          <Loader2 className="h-5 w-5 animate-spin inline mr-2 text-blue-600 dark:text-blue-400" />
          Loading roles and permissions...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-[#181A1F] p-4 space-y-2 h-fit">
            <h2 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 px-2 pb-1">
              Roles
            </h2>
            {roles.map((role) => (
              <button
                key={role.id}
                type="button"
                onClick={() => selectRole(role)}
                className={`w-full text-left rounded-xl px-3.5 py-3 transition border ${
                  role.id === selectedRoleId
                    ? 'bg-blue-50 border-blue-200 text-blue-950 dark:bg-blue-500/15 dark:border-blue-500/40 dark:text-white'
                    : 'border-transparent hover:bg-zinc-50 text-zinc-700 dark:hover:bg-white/[0.03] dark:text-zinc-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm flex items-center gap-2">
                    <KeyRound className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    {role.name}
                  </span>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                    {role.userCount} users
                  </span>
                </div>
                {role.description && (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2">
                    {role.description}
                  </p>
                )}
              </button>
            ))}
          </div>

          <div className="lg:col-span-2 rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-[#181A1F] p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-zinc-200 dark:border-zinc-800">
              <div>
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
                  {selectedRole?.name} Permissions
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
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
                  className="rounded-xl bg-gradient-to-r from-blue-600 to-sky-600 px-4 py-2 text-sm font-semibold text-white hover:from-blue-500 hover:to-sky-500 disabled:opacity-60 inline-flex items-center gap-2"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save Permissions
                </button>
              </div>
            </div>

            <div className="mt-5 space-y-6">
              {Object.entries(groupedPermissions).map(([category, perms]) => (
                <div key={category}>
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-2.5">
                    {category}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {perms.map((perm) => (
                      <label
                        key={perm.id}
                        className="flex items-start gap-2.5 rounded-xl border border-zinc-200 bg-zinc-50/70 hover:border-zinc-300 dark:border-zinc-800 dark:bg-[#111215] p-3 cursor-pointer dark:hover:border-zinc-700 transition"
                      >
                        <input
                          type="checkbox"
                          checked={checkedPermIds.includes(perm.id)}
                          onChange={() => togglePerm(perm.id)}
                          className="mt-0.5 rounded border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 text-blue-600 focus:ring-blue-500"
                        />
                        <div>
                          <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                            {perm.name}
                          </p>
                          <p className="text-xs text-zinc-500">{perm.description}</p>
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
